import { writeConfig, readConfig } from '../../../utils/dashboard-config';
import { executeButtonAction } from '../../../utils/field-definition.utils';
import { addSearchParams } from '../../../utils/set-search-params';
import { ResourceTableCard } from './resource-table-card/resource-table-card.component';
import { CreateResourceModal } from './create-resource-modal/create-resource-modal.component';
import {
  CARD_TYPES,
  CardConfig,
  Dashboard,
  ButtonSettings,
  SectionConfig,
  TableCardConfig,
  ValueCellButtonClickEvent,
  FieldDefinition,
} from '@openmfp/ngx';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ViewEncapsulation,
  computed,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LuigiClient } from '@luigi-project/client/luigi-element';
import {
  Resource,
  ResourceListResult,
  ResourceSubscriptionResult,
} from '@platform-mesh/portal-ui-lib/models';
import {
  ErrorHandlerService,
  GatewayService,
  ResourceNodeContext,
  ResourceService,
} from '@platform-mesh/portal-ui-lib/services';
import {
  buildResourcePath,
  generateGraphQLFields,
  getResourceValueByJsonPath,
  isNamespacedResource,
  mergeListWithSubscriptionResult,
} from '@platform-mesh/portal-ui-lib/utils';
import { finalize } from 'rxjs/operators';

Dashboard.registerAngularComponents([ResourceTableCard]);

@Component({
  selector: 'pm-list-view',
  standalone: true,
  templateUrl: './list-view.component.html',
  styleUrls: ['./list-view.component.scss'],
  encapsulation: ViewEncapsulation.Emulated,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CreateResourceModal, Dashboard],
})
export class ListView {
  private resourceService = inject(ResourceService);
  private errorHandlerService = inject(ErrorHandlerService);
  private gatewayService = inject(GatewayService);
  private destroyRef = inject(DestroyRef);
  private createModal = viewChild<CreateResourceModal>('createModal');

  LuigiClient = input.required<LuigiClient>();
  context = input.required<ResourceNodeContext>();

  resources = signal<Resource[]>([]);
  resourceDefinition = computed(() => this.context().resourceDefinition);
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
        },
        ...columns,
      ];
    }

    return columns;
  });
  hasUiCreateViewFields = computed(
    () => !!this.resourceDefinition()?.ui?.createView?.fields?.length,
  );

  totalItemsCount = computed(
    () => this.resources().length + this.remainingItemCount(),
  );
  paginationLimit = signal<number>(5);
  remainingItemCount = signal<number>(0);
  hasMore = signal<boolean>(false);
  resourceVersion = signal<string | undefined>(undefined);

  workspacePath = computed(() =>
    this.gatewayService.resolveKcpPath(this.context()),
  );

  private configKeyParams = computed(() => ({
    workspacePath: this.workspacePath(),
    entity: this.resourceDefinition()?.entity,
    resourceId: undefined,
    userId: this.context().userId,
  }));

  tableCardConfig = computed<TableCardConfig>(() => ({
    tableConfig: {
      fields: this.columns(),
      totalItemsCount: this.totalItemsCount(),
      paginationLimit: this.paginationLimit(),
      hasMore: this.hasMore(),
    },
  }));

  resourceTitleDefinition = computed(
      () => this.resourceDefinition()?.ui?.listView?.resourceTitle?.label ?? this.resourceDefinition()?.entityCollection ?? '',
  );
  resourceDescriptionDefinition = computed(
      () => this.resourceDefinition()?.ui?.listView?.resourceDescription?.label ?? `This page displays the created ${this.resourceDefinition()?.entityCollection} in your environment`,
  );

  dashboardConfig = computed(() => {
    const customActions: ButtonSettings[] = [];
    if (this.hasUiCreateViewFields()) {
      customActions.push({
        action: 'create',
        text: 'Create',
        design: 'Emphasized',
        tooltip: 'Create',
      });
    }
    return {
      title: this.resourceTitleDefinition(),
      description: this.resourceDescriptionDefinition(),
      editable: false,
      customActions,
    };
  });

  cards = computed<CardConfig[]>(() => {
    return [{
      id: 'pm-resource-table-card',
      component: 'pm-resource-table-card',
      type: CARD_TYPES.ANGULAR,
      w: 12,
      componentInputs: {
        resources: this.resources(),
        config: this.tableCardConfig(),
      },
    }];
  });

  availableCards = computed<CardConfig[]>(() => []);
  sections = computed<SectionConfig[]>(() => readConfig(this.configKeyParams())?.sections ?? []);

  private currentContinueToken: string | undefined = undefined;
  private isLoadingList = false;
  private isNamespaced = computed(() => isNamespacedResource(this.context()));
  protected readonly getResourceValueByJsonPath = getResourceValueByJsonPath;

  constructor() {
    effect(() => {
      this.currentContinueToken = undefined;
      this.list(true);
    });

    effect((onCleanup) => {
      const version = this.resourceVersion();
      if (!version) return;
      const sub = this.subscribeToResourceChange(version);
      onCleanup(() => sub.unsubscribe());
    });
  }

  private subscribeToResourceChange(version: string) {
    const fields = this.getListQueryFields();
    const resourceDefinition = this.getResourceDefinition();
    const queryOperation = buildResourcePath({
      apiGroup: resourceDefinition.apiGroup,
      version: resourceDefinition.version,
      entity: resourceDefinition.entityCollection,
    }) as string;

    return this.resourceService
      .resourceChangeSubscription(
        queryOperation,
        fields,
        this.context(),
        version,
        false,
      )
      .subscribe({
        next: (value) => {
          if (!value) return;
          this.mergeResourcesWithSubscriptionResult(value);
        },
        error: (_error) => {
          this.LuigiClient().uxManager().showAlert({
            text: 'Error while updating list with new data. To see new updates, refresh the page.',
            type: 'error',
          });
        },
      });
  }

  private resetPagination() {
    this.currentContinueToken = undefined;
    this.resources.update((v) => v.slice(0, this.paginationLimit()));
    this.hasMore.set(this.resources().length < this.totalItemsCount());
  }

  onLimitChange(limit: number) {
    this.paginationLimit.set(limit);
    this.resetPagination();
  }

  loadMore() {
    if (!this.hasMore()) return;
    this.list();
  }

  list(isInitialLoad: boolean = false) {
    if (this.isLoadingList) return;
    this.isLoadingList = true;

    const fields = this.getListQueryFields();
    const resourceDefinition = this.getResourceDefinition();
    const queryOperation = buildResourcePath({
      apiGroup: resourceDefinition.apiGroup,
      version: resourceDefinition.version,
      entity: resourceDefinition.entityCollection,
    }) as string;

    this.resourceService
      .list(queryOperation, fields, this.context(), false, {
        limit: this.paginationLimit(),
        continue: this.currentContinueToken,
      })
      .pipe(
        finalize(() => (this.isLoadingList = false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (result: ResourceListResult) => {
          if (isInitialLoad) {
            this.resources.set(result.items ?? []);
          } else {
            this.resources.update((values) => {
              const map = new Map(values.map((i) => [i.metadata.name, i]));
              (result.items ?? []).forEach((i) => map.set(i.metadata.name, i));
              return [...map.values()];
            });
          }
          this.resourceVersion.set(result.resourceVersion);
          this.hasMore.set(!!result.continue);
          this.currentContinueToken = result.continue;
          this.remainingItemCount.set(result.remainingItemCount || 0);
        },
        error: (error) => {
          this.errorHandlerService.handleError(error);
        },
      });
  }

  private mergeResourcesWithSubscriptionResult(
    subscriptionResult: ResourceSubscriptionResult,
  ) {
    this.resources.set(
      mergeListWithSubscriptionResult(this.resources(), subscriptionResult, {
        getItemKey: (item) => item.metadata?.name,
        mapSubscriptionObjectToItem: (object) => object,
      }),
    );
  }

  create(resource: Resource) {
    const resourceDefinition = this.getResourceDefinition();
    this.resourceService
      .create(resource, resourceDefinition, this.context())
      .subscribe({
        next: (result) => {
          this.createModal()?.close();
          console.debug('Resource created', result);
        },
      });
  }

  navigateToResource(resource: Resource) {
    const resourceDefinition = this.getResourceDefinition();
    if (!resourceDefinition.ui?.detailView) return;

    if (!resource.metadata.name) {
      this.LuigiClient().uxManager().showAlert({
        text: 'Resource name is not defined',
        type: 'error',
      });
      throw new Error('Resource name is not defined');
    }

    addSearchParams({
      namespace: this.isNamespaced() ? resource.metadata.namespace : undefined,
    });
    this.LuigiClient().linkManager().navigate(resource.metadata.name);
  }

  openCreateResourceModal() {
    this.createModal()?.open();
  }

  executeAction(event: ValueCellButtonClickEvent<Resource>) {
    executeButtonAction(this.LuigiClient(), event.field, event.resource);
  }

  onDashboardAction({ action }: { event: MouseEvent; action: ButtonSettings }) {
    if (action.action === 'create') {
      this.openCreateResourceModal();
    }
  }

  protected dashboardConfigurationChanged(config: { cards: CardConfig[]; sections: SectionConfig[] }) {
    writeConfig(this.configKeyParams(), config);
  }

  private getListQueryFields() {
    const additionalFields: FieldDefinition[] = [
      { property: 'metadata.deletionTimestamp' },
    ];

    if (this.isNamespaced()) {
      additionalFields.push({ property: 'metadata.namespace' });
    }

    return generateGraphQLFields(this.columns().concat(additionalFields));
  }

  private getResourceDefinition() {
    const resourceDefinition = this.resourceDefinition();
    if (!resourceDefinition) {
      this.LuigiClient().uxManager().showAlert({
        text: 'Resource definition is not defined',
        type: 'error',
      });
      throw new Error('Resource definition is not defined');
    }
    return resourceDefinition;
  }
}
