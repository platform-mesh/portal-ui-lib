import { executeButtonAction } from '../../../../utils/field-definition.utils';
import {
  flattenFieldTree,
  toFormFields,
} from '../../../../utils/to-form-fields';
import { addSearchParams } from '../../../../utils/url-params';
import {
  K8S_NAME_ERROR,
  K8S_NAME_RE,
  ResourceFieldNames,
} from '../../create-resource-modal/create-resource-modal.consts';
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
  DeclarativeTableCard,
  FormFieldChangeEvent,
  FormFieldErrors,
  ResourceFieldButtonClickEvent,
  TableCardConfig,
  TableCardFormState,
} from '@openmfp/ngx';
import {
  PlatformMeshFieldDefinition,
  Resource,
  ResourceListResult,
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
  getValueByPath,
  isNamespacedResource,
  mergeListWithSubscriptionResult,
} from '@platform-mesh/portal-ui-lib/utils';
import { firstValueFrom } from 'rxjs';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'pm-resource-table-card',
  standalone: true,
  imports: [DeclarativeTableCard],
  templateUrl: './resource-table-card.component.html',
  styles: `
    mfp-declarative-table-card {
      opacity: 80%;
      padding-bottom: 5rem;
    }
  `,
  encapsulation: ViewEncapsulation.Emulated,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResourceTableCard {
  private resourceService = inject(ResourceService);
  private errorHandlerService = inject(ErrorHandlerService);
  private destroyRef = inject(DestroyRef);

  LuigiClient = input.required<LuigiClient>();
  context = input.required<ResourceNodeContext>();

  tableCard =
    viewChild.required<DeclarativeTableCard<Resource>>(DeclarativeTableCard);

  resources = signal<Resource[]>([]);
  resourceDefinition = computed(() => this.context().resourceDefinition);
  hasUiCreateViewFields = computed(
    () => !!this.resourceDefinition()?.ui?.createView?.fields?.length,
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
        },
        ...columns,
      ];
    }

    return columns;
  });

  totalItemsCount = computed(
    () => this.resources().length + this.remainingItemCount(),
  );
  paginationLimit = signal<number>(5);
  remainingItemCount = signal<number>(0);
  hasMore = signal<boolean>(false);
  resourceVersion = signal<string | undefined>(undefined);

  private createFieldErrors = signal<FormFieldErrors>({});
  createFormState = computed<TableCardFormState>(() => ({
    fieldErrors: this.createFieldErrors(),
  }));

  createFormFields = computed(() => {
    let fields = this.resourceDefinition()?.ui?.createView?.fields || [];
    if (
      this.hasUiCreateViewFields() &&
      this.isNamespaced() &&
      !this.resourceService.getNamespace(this.context())
    ) {
      fields = [
        ...fields,
        {
          property: ResourceFieldNames.MetadataNamespace,
          required: true,
          label: 'Namespace',
          values: this.context().namespaces,
        },
      ];
    }

    return fields;
  });

  config = computed<TableCardConfig>(() => {
    return {
      header: this.resourceDefinition()?.entityCollection,
      tableConfig: {
        fields: this.columns(),
        totalItemsCount: this.totalItemsCount(),
        paginationLimit: this.paginationLimit(),
        hasMore: this.hasMore(),
      },
      ...(this.hasUiCreateViewFields() && {
        createResourceFormConfig: {
          fields: () =>
            toFormFields(this.createFormFields(), {
              disabled: (field) => false,
              resolveDynamicValues: (field) => this.resolveDynamicValues(field),
            }),
        },
      }),
    };
  });

  private isNamespaced = computed(() => isNamespacedResource(this.context()));
  private currentContinueToken: string | undefined = undefined;
  private isLoadingList = false;

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

  private async resolveDynamicValues(
    field: PlatformMeshFieldDefinition,
  ): Promise<string[] | undefined> {
    const def = field.dynamicValuesDefinition;
    if (!def) return undefined;
    const resources = await firstValueFrom(
      this.resourceService.list(def.operation, def.gqlQuery, this.context()),
    );
    return (resources as Resource[])
      .map((r) => getValueByPath(r, def.value) as string)
      .filter(Boolean);
  }

  private isCreateFieldOnly(field: PlatformMeshFieldDefinition): boolean {
    return (
      field.property === ResourceFieldNames.MetadataName ||
      field.property === ResourceFieldNames.SpecType ||
      field.property === ResourceFieldNames.MetadataNamespace
    );
  }

  private subscribeToResourceChange(version: string) {
    const fields = this.getListQueryFields();
    const resourceDefinition = this.context().resourceDefinition!;
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

  navigateToResource(resource: Resource) {
    const resourceDefinition = this.context().resourceDefinition;
    if (!resourceDefinition?.ui?.detailView) return;

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

  executeAction(event: ResourceFieldButtonClickEvent<Resource>) {
    executeButtonAction(this.LuigiClient(), event.field, event.resource);
  }

  async onCreateFieldChange(event: FormFieldChangeEvent) {
    const name = event.fieldProperty;
    const value = String(event.value ?? '').trim();
    let error: string | null = null;

    if (name === ResourceFieldNames.MetadataName) {
      if (!value) {
        error = 'This field is required';
      } else if (!K8S_NAME_RE.test(value)) {
        error = K8S_NAME_ERROR;
      }
    } else {
      const field = (await toFormFields(this.createFormFields())).find(
        (f) => f.name === name,
      );
      if (field?.required && !value) {
        error = 'This field is required';
      }
    }

    this.createFieldErrors.update((errors) => ({ ...errors, [name]: error }));
  }

  onCreateSubmit(value: Resource): void {
    const resourceDefinition = this.getResourceDefinition();
    this.resourceService
      .create(value, resourceDefinition, this.context())
      .subscribe({
        next: (result) => {
          this.createFieldErrors.set({});
          this.tableCard().closeCreateDialog();
          console.debug('Resource created', result);
        },
      });
  }

  private getListQueryFields() {
    const additionalFields = [{ property: 'metadata.deletionTimestamp' }];
    if (this.isNamespaced()) {
      additionalFields.push({ property: 'metadata.namespace' });
    }
    return generateGraphQLFields(
      flattenFieldTree(this.columns()).concat(additionalFields),
    );
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
