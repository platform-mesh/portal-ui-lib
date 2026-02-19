import { processFields } from '../../../utils/proccess-fields';
import { ValueCellComponent } from '../value-cell/value-cell.component';
import { CreateResourceModal } from './create-resource-modal/create-resource-modal.component';
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
import { Icon } from '@fundamental-ngx/ui5-webcomponents/icon';
import { Option } from '@fundamental-ngx/ui5-webcomponents/option';
import { Select } from '@fundamental-ngx/ui5-webcomponents/select';
import { Table } from '@fundamental-ngx/ui5-webcomponents/table';
import { TableCell } from '@fundamental-ngx/ui5-webcomponents/table-cell';
import { TableGrowing } from '@fundamental-ngx/ui5-webcomponents/table-growing';
import { TableHeaderCell } from '@fundamental-ngx/ui5-webcomponents/table-header-cell';
import { TableHeaderRow } from '@fundamental-ngx/ui5-webcomponents/table-header-row';
import { TableRow } from '@fundamental-ngx/ui5-webcomponents/table-row';
import { Text } from '@fundamental-ngx/ui5-webcomponents/text';
import { Title } from '@fundamental-ngx/ui5-webcomponents/title';
import { Toolbar } from '@fundamental-ngx/ui5-webcomponents/toolbar';
import { ToolbarButton } from '@fundamental-ngx/ui5-webcomponents/toolbar-button';
import { DynamicPage } from '@fundamental-ngx/ui5-webcomponents-fiori/dynamic-page';
import { DynamicPageTitle } from '@fundamental-ngx/ui5-webcomponents-fiori/dynamic-page-title';
import { IllustratedMessage } from '@fundamental-ngx/ui5-webcomponents-fiori/illustrated-message';
import { LuigiClient } from '@luigi-project/client/luigi-element';
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
  ResourceService,
} from '@platform-mesh/portal-ui-lib/services';
import {
  buildResourcePath,
  generateGraphQLFields,
  getResourceValueByJsonPath,
  replaceDotsAndHyphensWithUnderscores,
} from '@platform-mesh/portal-ui-lib/utils';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'pm-list-view',
  standalone: true,
  templateUrl: './list-view.component.html',
  styleUrls: ['./list-view.component.scss'],
  encapsulation: ViewEncapsulation.ShadowDom,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CreateResourceModal,
    DynamicPage,
    DynamicPageTitle,
    Icon,
    IllustratedMessage,
    Table,
    TableCell,
    TableHeaderCell,
    TableHeaderRow,
    TableRow,
    Text,
    Title,
    ToolbarButton,
    Toolbar,
    ValueCellComponent,
    Select,
    Option,
    TableGrowing,
  ],
})
export class ListView {
  private resourceService = inject(ResourceService);
  private errorHandlerService = inject(ErrorHandlerService);
  private destroyRef = inject(DestroyRef);
  private createModal = viewChild<CreateResourceModal>('createModal');

  LuigiClient = input.required<LuigiClient>();
  context = input.required<ResourceNodeContext>();

  resources = signal<Resource[]>([]);
  resourceTitleDefinition = computed(
    () => this.resourceDefinition()?.ui?.listView?.resourceTitle,
  );
  defaultHeading = computed(
    () =>
      `${this.resourceDefinition()?.plural.charAt(0).toUpperCase()}${this.resourceDefinition()?.plural.slice(1)}`,
  );
  resourceDefinition = computed(() => this.context().resourceDefinition);
  columns = computed(
    () => this.resourceDefinition()?.ui?.listView?.fields ?? [],
  );
  viewColumns = computed(() => processFields(this.columns()));
  readyCondition = computed(() => this.resourceDefinition()?.readyCondition);
  listDescriptionDefinition = computed(
    () => this.resourceDefinition()?.ui?.listView?.resourceDescription,
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

  list(isInitialLoad: boolean = false) {
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
              (result.items ?? []).forEach((i) => {
                map.set(i.metadata.name, i);
              });
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

  private getListQueryFields() {
    const additionalFields: FieldDefinition[] = [];

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
