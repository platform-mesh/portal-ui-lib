import { executeButtonAction } from '../../../../utils/field-definition.utils';
import { addSearchParams } from '../../../../utils/set-search-params';
import {
  K8S_NAME_ERROR,
  K8S_NAME_RE,
  ResourceFieldNames,
} from '../create-resource-modal/create-resource-modal.consts';
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
  FormFieldDefinition,
  FormFieldErrors,
  ResourceFieldButtonClickEvent,
  TableCardConfig,
  TableCardFormState,
} from '@openmfp/ngx';
import {
  FieldDefinition,
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
  isNamespacedResource,
  mergeListWithSubscriptionResult,
} from '@platform-mesh/portal-ui-lib/utils';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'pm-resource-table-card',
  standalone: true,
  imports: [DeclarativeTableCard],
  templateUrl: './resource-table-card.component.html',
  styles: `
    mfp-declarative-table-card {
      opacity: 80%;
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
      tableConfig: {
        fields: this.columns(),
        totalItemsCount: this.totalItemsCount(),
        paginationLimit: this.paginationLimit(),
        hasMore: this.hasMore(),
      },
      ...(this.hasUiCreateViewFields() && {
        createResourceFormConfig: {
          fields: this.toFormFields(this.createFormFields()),
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

  onCreateFieldChange(event: FormFieldChangeEvent): void {
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
      const field = this.toFormFields(this.createFormFields()).find(
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

  private toFormFields(fields: FieldDefinition[]): FormFieldDefinition[] {
    return (fields || []).map((field) => {
      if (typeof field.property !== 'string') {
        throw new Error(
          `Form field property must be a string, got: ${JSON.stringify(field.property)}`,
        );
      }

      const formField: FormFieldDefinition = {
        name: field.property,
        label: field.label,
        required: field.required,
        values: field.values as string[] | undefined,
      };

      if (
        field.required ||
        field.property === ResourceFieldNames.MetadataName
      ) {
        formField.validation = 'onChange';
      }

      return formField;
    });
  }

  private getListQueryFields() {
    const additionalFields = [{ property: 'metadata.deletionTimestamp' }];
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
