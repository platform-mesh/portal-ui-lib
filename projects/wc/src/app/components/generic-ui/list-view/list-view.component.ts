import { processFields } from '../../../utils/proccess-fields';
import { ValueCellComponent } from '../value-cell/value-cell.component';
import { CreateResourceModalComponent } from './create-resource-modal/create-resource-modal.component';
import { DeleteResourceModalComponent } from './delete-resource-confirmation-modal/delete-resource-modal.component';
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
import { LuigiCoreService } from '@openmfp/portal-ui-lib';
import {
  FieldDefinition,
  Resource,
  ResourceListResult,
  ResourceOperationTypeMap,
  ResourceSubscriptionResult,
} from '@platform-mesh/portal-ui-lib/models';
import {
  ErrorHandlerService,
  ResourceNodeContext,
  ResourceRequestParams,
  ResourceService,
} from '@platform-mesh/portal-ui-lib/services';
import {
  buildResourcePath,
  generateGraphQLFields,
  getResourceValueByJsonPath,
  replaceDotsAndHyphensWithUnderscores,
} from '@platform-mesh/portal-ui-lib/utils';
import {
  DynamicPageComponent,
  DynamicPageTitleComponent,
  IconComponent,
  IllustratedMessageComponent,
  OptionComponent,
  SelectComponent,
  TableCellComponent,
  TableComponent,
  TableGrowingComponent,
  TableHeaderCellComponent,
  TableHeaderRowComponent,
  TableRowComponent,
  TextComponent,
  TitleComponent,
  ToolbarButtonComponent,
  ToolbarComponent,
} from '@ui5/webcomponents-ngx';
import { catchError, finalize } from 'rxjs/operators';

@Component({
  selector: 'pm-list-view',
  standalone: true,
  templateUrl: './list-view.component.html',
  styleUrls: ['./list-view.component.scss'],
  encapsulation: ViewEncapsulation.ShadowDom,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CreateResourceModalComponent,
    DeleteResourceModalComponent,
    DynamicPageComponent,
    DynamicPageTitleComponent,
    IconComponent,
    IllustratedMessageComponent,
    TableComponent,
    TableCellComponent,
    TableHeaderCellComponent,
    TableHeaderRowComponent,
    TableRowComponent,
    TextComponent,
    TitleComponent,
    ToolbarButtonComponent,
    ToolbarComponent,
    ValueCellComponent,
    SelectComponent,
    OptionComponent,
    TableGrowingComponent,
  ],
})
export class ListViewComponent {
  private resourceService = inject(ResourceService);
  private luigiCoreService = inject(LuigiCoreService);
  private errorHandlerService = inject(ErrorHandlerService);
  private destroyRef = inject(DestroyRef);
  LuigiClient = input.required<LuigiClient>();
  context = input.required<ResourceNodeContext>();
  private createModal = viewChild<CreateResourceModalComponent>('createModal');
  private deleteModal = viewChild<DeleteResourceModalComponent>('deleteModal');

  resources = signal<Resource[]>([]);
  heading = computed(
    () =>
      `${this.resourceDefinition()?.plural.charAt(0).toUpperCase()}${this.resourceDefinition()?.plural.slice(1)}`,
  );
  resourceDefinition = computed(() => this.context().resourceDefinition);
  columns = computed(
    () => this.resourceDefinition()?.ui?.listView?.fields ?? [],
  );
  viewColumns = computed(() => processFields(this.columns()));
  readyCondition = computed(() => this.resourceDefinition()?.readyCondition);
  imagePathProperty = computed(
    () => this.resourceDefinition()?.ui?.resourceImageProperty,
  );
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

  private currentContinueToken: string | undefined = undefined;
  private isLoadingList = false;
  protected readonly getResourceValueByJsonPath = getResourceValueByJsonPath;

  constructor() {
    effect(() => {
      this.list();
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
    const queryOperation = replaceDotsAndHyphensWithUnderscores(
      buildResourcePath({
        group: resourceDefinition.group,
        version: resourceDefinition.version,
        kind: resourceDefinition.plural,
      }),
    ) as string;

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
          if (!value) {
            return;
          }

          this.mergeResourcesWithSubscriptionResult(value);
        },
      });
  }

  private resetPagination() {
    this.currentContinueToken = undefined;
    this.resources.update((v) => v.slice(0, this.paginationLimit()));
    this.hasMore.set(this.resources().length < this.totalItemsCount());
  }

  onLimitChange(event: any) {
    const newLimit = parseInt(event.detail.selectedOption.value, 10);
    this.paginationLimit.set(newLimit);
    this.resetPagination();
  }

  loadMore() {
    if (!this.hasMore()) {
      return;
    }

    this.list();
  }

  list() {
    if (this.isLoadingList) {
      return;
    }
    this.isLoadingList = true;

    const fields = this.getListQueryFields();
    const resourceDefinition = this.getResourceDefinition();
    const queryOperation = replaceDotsAndHyphensWithUnderscores(
      buildResourcePath({
        group: resourceDefinition.group,
        version: resourceDefinition.version,
        kind: resourceDefinition.plural,
      }),
    ) as string;

    this.resourceService
      .list(queryOperation, fields, this.context(), false, {
        limit: this.paginationLimit(),
        continue: this.currentContinueToken,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        catchError((error) => {
          this.errorHandlerService.handleUnauthorizedAccess(error);
          throw error;
        }),
        finalize(() => (this.isLoadingList = false)),
      )
      .subscribe({
        next: (result: ResourceListResult) => {
          this.resources.update((values) => {
            const map = new Map(values.map((i) => [i.metadata.name, i]));
            result.items.forEach((i) => {
              map.set(i.metadata.name, i);
            });
            return [...map.values()];
          });
          this.resourceVersion.set(result.resourceVersion);
          this.hasMore.set(!!result.continue);
          this.currentContinueToken = result.continue;
          this.remainingItemCount.set(result.remainingItemCount || 0);
        },
      });
  }

  private mergeResourcesWithSubscriptionResult(
    subscriptionResult: ResourceSubscriptionResult,
  ) {
    const result = new Map<string, Resource>(
      this.resources().map((item) => [item.metadata.name!, item]),
    );

    const { type, object } = subscriptionResult;
    if (type === ResourceOperationTypeMap.ADDED) {
      result.set(object.metadata.name, object);
    } else if (type === ResourceOperationTypeMap.MODIFIED) {
      result.has(object.metadata.name) &&
        result.set(object.metadata.name, object);
    } else if (type === ResourceOperationTypeMap.DELETED) {
      result.delete(object.metadata.name);
    }

    this.resources.set([...result.values()]);
  }

  delete(resource: Resource) {
    const resourceDefinition = this.getResourceDefinition();

    this.resourceService
      .delete(resource, resourceDefinition, this.context())
      .subscribe({
        next: (_result) => {
          this.deleteModal()?.close();
          console.debug('Resource deleted.');
        },
        error: (_error) => {
          this.luigiCoreService.showAlert({
            text: `Failure! Could not delete resource: ${resource.metadata.name}.`,
            type: 'error',
          });
        },
      });
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

  update(resource: Resource) {
    const resourceDefinition = this.getResourceDefinition();

    this.resourceService
      .update(resource, resourceDefinition, this.context())
      .subscribe({
        next: (result) => {
          this.createModal()?.close();
          console.debug('Resource updated', result);
        },
      });
  }

  navigateToResource(resource: Resource) {
    const resourceDefinition = this.getResourceDefinition();
    if (!resourceDefinition.ui?.detailView) {
      return;
    }

    if (!resource.metadata.name) {
      this.LuigiClient().uxManager().showAlert({
        text: 'Resource name is not defined',
        type: 'error',
      });

      throw new Error('Resource name is not defined');
    }

    this.LuigiClient().linkManager().navigate(resource.metadata.name);
  }

  openCreateResourceModal() {
    this.createModal()?.open();
  }

  openEditResourceModal(event: MouseEvent, resource: Resource) {
    event.stopPropagation?.();
    const resourceDefinition = this.getResourceDefinition();

    const fields = generateGraphQLFields(
      resourceDefinition.ui?.createView?.fields ?? [],
    );

    const params: ResourceRequestParams = {
      kind: resourceDefinition.kind,
      version: resourceDefinition.version,
      group: replaceDotsAndHyphensWithUnderscores(resourceDefinition.group),
    };

    this.resourceService
      .read(resource.metadata.name ?? '', params, fields, this.context(), false)
      .subscribe({
        next: (result) => this.createModal()?.open(result),
      });
  }

  openDeleteResourceModal(event: MouseEvent, resource: Resource) {
    event.stopPropagation?.();
    this.deleteModal()?.open(resource);
  }

  private getListQueryFields() {
    const additionalFields: FieldDefinition[] = [];

    const imagePathProperty = this.imagePathProperty();
    if (imagePathProperty) {
      additionalFields.push({ property: imagePathProperty });
    }

    const readyCondition = this.readyCondition();
    if (readyCondition) {
      additionalFields.push(readyCondition);
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

  isAvailable(item: Resource) {
    return item.ready && !item.metadata.deletionTimestamp;
  }

  getAccessibleName(item: Resource): string {
    if (item.metadata.deletionTimestamp) {
      return 'Resource is pending deletion';
    } else if (!item.ready) {
      return 'Resource is not ready';
    }

    return '';
  }
}
