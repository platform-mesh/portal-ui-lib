import { executeButtonAction } from '../../../utils/field-definition.utils';
import { addSearchParams, readUrlSearchParam } from '../../../utils/url-params';
import { CreateResourceModal } from '../create-resource-modal/create-resource-modal.component';
import { ReadResourcesProxyService } from '../opensearch-list-view/services/read-resources-proxy.service';
import { ResourceLogo } from '../resource-logo/resource-logo.component';
import { InstancePermissionsStore } from '../store/instance-permissions-store.service';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  DynamicPage,
  DynamicPageHeader,
  DynamicPageTitle,
} from '@fundamental-ngx/ui5-webcomponents-fiori';
import { Title } from '@fundamental-ngx/ui5-webcomponents/title';
import { Toolbar } from '@fundamental-ngx/ui5-webcomponents/toolbar';
import { ToolbarButton } from '@fundamental-ngx/ui5-webcomponents/toolbar-button';
import { LuigiClient } from '@luigi-project/client/luigi-element';
import {
  DeclarativeTable,
  GenericResource,
  ResourceField,
  ResourceFieldButtonClickEvent,
} from '@openmfp/ngx';
import {
  ModalResult,
  PlatformMeshFieldDefinition,
  Resource,
} from '@platform-mesh/portal-ui-lib/models';
import {
  ErrorHandlerService,
  ReadResourcesResult,
  ResourceNodeContext,
  ResourceService,
} from '@platform-mesh/portal-ui-lib/services';
import {
  generateGraphQLFields,
  isNamespacedResource,
  permissionKey,
  resourceActionAllowed,
} from '@platform-mesh/portal-ui-lib/utils';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'pm-search-list-dynamic-page',
  standalone: true,
  templateUrl: './search-list-dynamic-page.component.html',
  styleUrl: './search-list-dynamic-page.component.scss',
  encapsulation: ViewEncapsulation.Emulated,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [InstancePermissionsStore],
  imports: [
    DynamicPage,
    DynamicPageTitle,
    DynamicPageHeader,
    Title,
    Toolbar,
    ToolbarButton,
    ResourceLogo,
    ResourceField,
    CreateResourceModal,
    DeclarativeTable,
  ],
})
export class SearchListDynamicPage implements OnInit {
  LuigiClient = input.required<LuigiClient>();
  context = input.required<ResourceNodeContext>();

  resourceDefinition = computed(() => this.context().resourceDefinition);

  resourceTitleDefinition = computed(
    () =>
      this.resourceDefinition()?.ui?.listView?.resourceTitle?.label ??
      this.resourceDefinition()?.entityCollection ??
      '',
  );

  resourceDescriptionDefinition = computed(
    () =>
      this.resourceDefinition()?.ui?.listView?.resourceDescription?.label ??
      `This page displays the created ${this.resourceDefinition()?.entityCollection} in your environment`,
  );

  actions = computed<PlatformMeshFieldDefinition[]>(
    () => this.resourceDefinition()?.ui?.listView?.actions ?? [],
  );

  hasUiCreateViewFields = computed(
    () => !!this.resourceDefinition()?.ui?.createView?.fields?.length,
  );

  createFields = computed<PlatformMeshFieldDefinition[]>(
    () => this.resourceDefinition()?.ui?.createView?.fields ?? [],
  );

  canCreate = computed(() => this.canDo('create'));

  resources = signal<GenericResource[]>([]);
  tableResources = computed(() =>
    this.resources().map((r) => ({ ...r, id: this.generateResourceId(r) })),
  );
  columns = computed(() => {
    let columns = this.resourceDefinition()?.ui?.listView?.fields ?? [];

    const readyCondition = this.resourceDefinition()?.readyCondition;
    if (readyCondition) {
      columns = [
        {
          ...readyCondition,
          uiSettings: {
            ...readyCondition.uiSettings,
            displayAs: 'alert',
            columnWidth: '30px',
          },
        } as any,
        ...columns,
      ];
    }

    return columns;
  });

  paginationLimit = signal<number>(this.limitFromUrl());
  currentPage = signal<number>(this.pageFromUrl());
  totalItemsCount = signal<number | undefined>(undefined);
  hasMore = signal<boolean>(false);
  loading = signal<boolean>(false);

  private resourceService = inject(ResourceService);
  private readResourcesProxy = inject(ReadResourcesProxyService);
  private errorHandlerService = inject(ErrorHandlerService);
  protected instancePermissionsStore = inject(InstancePermissionsStore);
  private destroyRef = inject(DestroyRef);
  private createModal = viewChild<CreateResourceModal>('createModal');

  private listSubscription?: Subscription;
  private isNamespaced = computed(() => isNamespacedResource(this.context()));

  constructor() {
    effect(() => {
      const rows = this.resources();
      const rd = this.resourceDefinition();

      if (!rd?.permissionsDefinition?.entityActions?.length || !rows.length) {
        return;
      }

      const namespaced = this.isNamespaced();
      const instances = rows.map((r) => ({
        name: (r as any).metadata?.name ?? r.id,
        namespace: namespaced ? (r as any).metadata?.namespace : undefined,
      }));
      this.instancePermissionsStore.sync(
        this.context(),
        rd.permissionsDefinition!,
        instances,
      );
    });
  }

  ngOnInit(): void {
    this.list();
  }

  openCreateModal(): void {
    void this.createModal()?.open();
  }

  onCreateSubmit(value: Resource): void {
    const resourceDefinition = this.resourceDefinition();
    if (!resourceDefinition) return;
    this.resourceService
      .create(value, resourceDefinition, this.context())
      .subscribe({
        next: (result) => {
          this.createModal()?.close();
          this.list();
          console.debug('Resource created', result);
        },
      });
  }

  genericActionHandler(
    event: ResourceFieldButtonClickEvent<GenericResource>,
  ): void {
    executeButtonAction(
      this.LuigiClient(),
      event.field,
      event.resource,
      (result?: ModalResult) => this.handleModalResult(result),
    );
  }

  handleModalResult(result?: ModalResult): void {
    if (!result?.data) {
      return;
    }

    switch (result.data.action) {
      case 'navigate':
        this.navigateToResource(result.data.resource);
        break;
      case 'create':
        this.onCreateSubmit(result.data.resource as Resource);
        break;
      case 'loadTableData':
        this.list();
        break;
      default:
        console.debug(`Action ${result.data?.action} not supported`);
    }
  }

  list(): void {
    if (!this.canDo('list')) return;
    this.listSubscription?.unsubscribe();

    const page = this.currentPage();
    const limit = this.paginationLimit();

    addSearchParams({
      page: page > 1 ? String(page) : undefined,
      limit: limit !== 20 ? String(limit) : undefined,
    });

    this.loading.set(true);
    this.listSubscription = this.readResourcesProxy
      .forContext(this.LuigiClient())
      .list(
        this.context(),
        { limit, page },
        {
          resource: this.resourceDefinition()?.entityCollection,
          fields: generateGraphQLFields(this.columns()),
        },
      )
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (result: ReadResourcesResult) => {
          const items = result.items ?? [];
          this.resources.set(items);
          const hasNextCursor = !!result.nextCursor;
          this.hasMore.set(hasNextCursor);
          if (!hasNextCursor) {
            this.totalItemsCount.set(
              (page - 1) * limit +
                items.length +
                (result.remainingItemCount ?? 0),
            );
          } else {
            this.totalItemsCount.set(undefined);
          }
        },
        error: (error) => {
          this.errorHandlerService.handleError(error);
        },
      });
  }

  onLimitChange(limit: number): void {
    this.paginationLimit.set(limit);
    this.currentPage.set(1);
    this.list();
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.list();
  }

  navigateToResource(resource: any): void {
    const resourceDefinition = this.resourceDefinition();
    if (!resourceDefinition) {
      this.LuigiClient().uxManager().showAlert({
        text: 'Resource definition is not defined',
        type: 'error',
      });
      throw new Error('Resource definition is not defined');
    }

    if (!resourceDefinition.ui?.detailView) {
      return;
    }

    if (!resource.metadata?.name) {
      this.LuigiClient().uxManager().showAlert({
        text: 'Resource name is not defined',
        type: 'error',
      });
      throw new Error('Resource name is not defined');
    }

    this.LuigiClient()
      .linkManager()
      .navigate((resource as any).metadata.name);
  }

  canDo(action: string | undefined): boolean {
    if (!action) {
      return true;
    }

    return resourceActionAllowed(
      this.context().portalPermissions,
      this.resourceDefinition()?.permissionsDefinition?.resource,
      action,
    );
  }

  private pageFromUrl(): number {
    const raw = Number(readUrlSearchParam('page'));
    return Number.isInteger(raw) && raw >= 1 ? raw : 1;
  }

  private limitFromUrl(): number {
    const valid = [5, 10, 20, 50, 100];
    const raw = Number(readUrlSearchParam('limit'));
    return valid.includes(raw) ? raw : 20;
  }

  private generateResourceId(resource: any): string {
    const resourceDefinition = this.resourceDefinition();
    if (!resourceDefinition) {
      return resource.metadata?.name ?? resource.id ?? '';
    }

    return permissionKey({
      resource: resourceDefinition.permissionsDefinition?.resource,
      name: resource.metadata.name,
      namespace: resource.metadata.namespace,
    });
  }
}
