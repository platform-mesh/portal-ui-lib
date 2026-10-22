import { executeButtonAction } from '../../../../utils/field-definition.utils';
import { applyDependencyTriggers } from '../../../../utils/field-dependencies';
import { resolveDependentFields } from '../../../../utils/resolve-dependent-fields';
import { resolveFieldDynamicValues } from '../../../../utils/resolve-dynamic-values';
import { withRouteNamespace } from '../../../../utils/route-namespace';
import {
  buildInitialValues,
  expandCollectionEntries,
  toFormFields,
} from '../../../../utils/to-form-fields';
import { addSearchParams } from '../../../../utils/url-params';
import { validateFormField } from '../../../../utils/validate-form-field';
import {
  ResourceFieldNames,
} from '../../create-resource-modal/create-resource-modal.consts';
import { InstancePermissionsStore } from '../../store/instance-permissions-store.service';
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
  untracked,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LuigiClient } from '@luigi-project/client/luigi-element';
import {
  DeclarativeTableCard,
  DeleteResourceConfirmationConfig,
  FormFieldChangeEvent,
  FormFieldDefinition,
  FormFieldErrors,
  ResourceFieldButtonClickEvent,
  TableCardConfig,
  TableCardFormState,
  TableErrorConfig,
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
  isNamespacedResource,
  mergeListWithSubscriptionResult,
  permissionKey,
  resourceActionAllowed,
} from '@platform-mesh/portal-ui-lib/utils';
import { Subscription } from 'rxjs';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'pm-resource-table-card',
  standalone: true,
  providers: [InstancePermissionsStore],
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
  protected instancePermissionsStore = inject(InstancePermissionsStore);
  private destroyRef = inject(DestroyRef);

  LuigiClient = input.required<LuigiClient>();
  context = input.required<ResourceNodeContext>();

  tableCard =
    viewChild.required<DeclarativeTableCard<Resource>>(DeclarativeTableCard);

  resources = signal<Resource[]>([]);
  tableResources = computed(() =>
    this.resources().map((r) => ({ ...r, id: this.generateResourceId(r) })),
  );
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
  loading = signal<boolean>(false);
  protected listError = signal<TableErrorConfig | null>(null);
  protected watchError = signal<TableErrorConfig | null>(null);

  private createFieldErrors = signal<FormFieldErrors>({});
  createFormState = computed<TableCardFormState>(() => ({
    fieldErrors: this.createFieldErrors(),
  }));

  private editFieldErrors = signal<FormFieldErrors>({});
  editFormState = computed<TableCardFormState>(() => ({
    fieldErrors: this.editFieldErrors(),
  }));

  createFormFields = computed(() => {
    let fields = this.resourceDefinition()?.ui?.createView?.fields || [];
    if (
      this.hasUiCreateViewFields() &&
      this.isNamespaced() &&
      !this.resourceService.getNamespace(this.createContext())
    ) {
      fields = [
        {
          property: ResourceFieldNames.MetadataNamespace,
          required: true,
          label: 'Namespace',
          values: this.context().namespaces,
        },
        ...fields,
      ];
    }

    return fields;
  });

  config = computed<TableCardConfig<Resource>>(() => {
    // Shared handler for both create and edit — both paths have identical semantics.
    const onFieldChange = (
      event: FormFieldChangeEvent,
      currentFields: FormFieldDefinition[],
    ) => this.onFormFieldChange(event, currentFields);

    return {
      header: this.resourceDefinition()?.entityCollection,
      tableConfig: {
        fields: this.columns(),
        totalItemsCount: this.totalItemsCount(),
        paginationLimit: this.paginationLimit(),
        hasMore: this.hasMore(),
      },
      ...(this.hasUiCreateViewFields() &&
        this.canDo('create') && {
          createResourceFormConfig: {
            fields: async () => {
              // Dependents resolve against `{}` until the user picks a parent.
              const parentValues: Record<string, unknown> = {};
              const formFields = await toFormFields(this.createFormFields(), {
                disabled: () => false,
                resolveDynamicValues: (field) =>
                  this.resolveDynamicValues(field, parentValues),
              });
              // Ensure parent fields emit onChange so onFieldChange is triggered.
              return applyDependencyTriggers(
                formFields,
                this.createFormFields(),
              );
            },
            onFieldChange,
          },
        }),
      ...(this.hasUiCreateViewFields() &&
        this.canDo('update') && {
          editResourceFormConfig: (resource: Resource) => ({
            fields: async () => {
              // Resolve dependent OPTIONS against prefilled parent values so
              // the user sees a populated option list immediately. Dependent
              // VALUES are seeded separately via `patchForm({ emitEvent: false })`.
              const parentValues = buildInitialValues(
                this.createFormFields(),
                resource,
              );
              const formFields = await toFormFields(this.createFormFields(), {
                disabled: () => false,
                resolveDynamicValues: (field) =>
                  this.resolveDynamicValues(field, parentValues),
              });
              return applyDependencyTriggers(
                formFields,
                this.createFormFields(),
              );
            },
            onFieldChange,
          }),
        }),
      deleteResourceConfirmationConfig: (r) => this.getDeleteConfig(r),
    };
  });

  private isNamespaced = computed(() => isNamespacedResource(this.context()));
  // The list follows the namespace selection, so '-all-' lists every
  // namespace. Create needs one namespace: on a namespace route with '-all-'
  // selected it uses the route's namespace instead of none.
  private createContext = computed(() => {
    const context = this.context();
    return withRouteNamespace(
      context,
      this.resourceService.getNamespace(context),
      this.LuigiClient().getPathParams?.(),
    );
  });
  private currentContinueToken: string | undefined = undefined;
  private listSubscription?: Subscription;
  private lastListWasInitialLoad = true;

  constructor() {
    effect((onCleanup) => {
      this.currentContinueToken = undefined;
      this.resources.set([]);
      this.resourceVersion.set(undefined);
      this.remainingItemCount.set(0);
      this.hasMore.set(false);
      this.listError.set(null);
      this.watchError.set(null);
      this.list(true);
      onCleanup(() => this.listSubscription?.unsubscribe());
    });

    effect((onCleanup) => {
      const version = this.resourceVersion();
      if (!version) return;
      if (untracked(this.watchError)) return;
      if (!this.canDo('watch')) return;
      const sub = this.subscribeToResourceChange(version);
      onCleanup(() => sub.unsubscribe());
    });

    effect(() => {
      const rows = this.resources();
      const rd = this.resourceDefinition();

      if (!rd?.permissionsDefinition?.entityActions.length || !rows.length) {
        return;
      }

      const namespaced = this.isNamespaced();
      const instances = rows.map((r) => ({
        name: r.metadata.name,
        namespace: namespaced ? r.metadata.namespace : undefined,
      }));
      this.instancePermissionsStore.sync(
        this.context(),
        rd.permissionsDefinition!,
        instances,
      );
    });
  }

  private async resolveDynamicValues(
    field: PlatformMeshFieldDefinition,
    formValues: Record<string, unknown> = {},
  ): Promise<string[] | undefined> {
    return resolveFieldDynamicValues(
      field,
      this.createContext(),
      this.isNamespaced(),
      formValues,
      {
        list: (operation, gqlQuery, context, options) =>
          this.resourceService.list(operation, gqlQuery, context, options),
        getNamespace: (c) => this.resourceService.getNamespace(c),
        handleError: (error) => this.errorHandlerService.handleError(error),
      },
    );
  }

  /** Shared handler for the create and edit form `onFieldChange` hook.
   *  Re-resolves dependent fields and returns updated fields + cleared initialValues.
   *  The ngx dialog owns the last-write-wins race guard around this call. */
  private onFormFieldChange(
    event: FormFieldChangeEvent,
    currentFields: FormFieldDefinition[],
  ): Promise<
    | {
        fields: FormFieldDefinition[];
        initialValues?: Record<string, unknown>;
      }
    | undefined
  > {
    return resolveDependentFields(
      event,
      currentFields,
      this.createFormFields(),
      (f, fv) => this.resolveDynamicValues(f, fv),
    );
  }

  onEditFieldChange({
    formChangeEvent,
  }: {
    resource: Resource;
    formChangeEvent: FormFieldChangeEvent;
  }): void {
    const name = formChangeEvent.fieldProperty;
    const error = validateFormField({
      name,
      value: formChangeEvent.value,
      fields: this.createFormFields(),
      editMode: true,
    });
    this.editFieldErrors.update((errors) => ({ ...errors, [name]: error }));
  }

  onEditSubmit({
    value,
  }: {
    resource: Resource;
    value: Record<string, unknown>;
  }): void {
    const resourceDefinition = this.getResourceDefinition();
    const expanded = expandCollectionEntries(
      value as Record<string, unknown>,
      this.createFormFields(),
    ) as Resource;
    this.resourceService
      .update(expanded, resourceDefinition, this.context())
      .subscribe({
        next: (result) => {
          this.editFieldErrors.set({});
          this.tableCard().closeEditDialog();
          console.debug('Resource updated', result);
        },
        error: (error) => this.errorHandlerService.handleError(error),
      });
  }

  private subscribeToResourceChange(version: string) {
    const fields = this.getListQueryFields();
    const context = this.context();
    const resourceDefinition = context.resourceDefinition!;
    const queryOperation = buildResourcePath({
      apiGroup: resourceDefinition.apiGroup,
      version: resourceDefinition.version,
      entity: resourceDefinition.entityCollection,
    }) as string;

    return this.resourceService
      .resourceChangeSubscription(
        queryOperation,
        fields,
        context,
        version,
        false,
      )
      .subscribe({
        next: (value) => {
          if (!value || context !== this.context()) return;
          this.mergeResourcesWithSubscriptionResult(value);
        },
        error: (error) => {
          if (context !== this.context()) return;
          if (!this.errorHandlerService.redirectToErrorPage(error)) {
            this.watchError.set(this.mapError(error));
          }
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
    if (!this.canDo('list')) return;
    if (untracked(this.loading)) return;
    this.lastListWasInitialLoad = isInitialLoad;
    this.listError.set(null);
    this.loading.set(true);

    const fields = this.getListQueryFields();
    const resourceDefinition = this.getResourceDefinition();
    const context = this.context();
    const queryOperation = buildResourcePath({
      apiGroup: resourceDefinition.apiGroup,
      version: resourceDefinition.version,
      entity: resourceDefinition.entityCollection,
    }) as string;

    this.listSubscription = this.resourceService
      .list(queryOperation, fields, context, {
        pagination: {
          limit: this.paginationLimit(),
          continue: this.currentContinueToken,
        },
      })
      .pipe(
        finalize(() => {
          this.loading.set(false);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (result: ResourceListResult) => {
          if (context !== this.context()) return;
          if (isInitialLoad) {
            this.resources.set(result.items ?? []);
          } else {
            this.resources.update((values) => {
              const map = new Map(values.map((i) => [i.id, i]));
              (result.items ?? []).forEach((i) => map.set(i.id, i));
              return [...map.values()];
            });
          }
          this.resourceVersion.set(result.resourceVersion);
          this.hasMore.set(!!result.continue);
          this.currentContinueToken = result.continue;
          this.remainingItemCount.set(result.remainingItemCount || 0);
        },
        error: (error) => {
          if (context !== this.context()) return;
          if (!this.errorHandlerService.redirectToErrorPage(error)) {
            this.listError.set(this.mapError(error));
          }
        },
      });
  }

  retryList() {
    if (untracked(this.loading)) return;
    if (untracked(this.watchError)) {
      this.currentContinueToken = undefined;
      this.resourceVersion.set(undefined);
      this.hasMore.set(false);
      this.remainingItemCount.set(0);
      this.watchError.set(null);
      this.list(true);
      return;
    }
    if (untracked(this.listError)) {
      this.list(this.lastListWasInitialLoad);
    }
  }

  private mergeResourcesWithSubscriptionResult(
    subscriptionResult: ResourceSubscriptionResult,
  ) {
    this.resources.set(
      mergeListWithSubscriptionResult(this.resources(), subscriptionResult, {
        getItemKey: (item) => item.id,
        mapSubscriptionObjectToItem: (object) => object,
      }),
    );
  }

  private mapError(error: any): TableErrorConfig {
    return {
      message: error.message,
      withRetryButton: true,
    };
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

    if (this.isNamespaced() && !resource.metadata.namespace) {
      this.LuigiClient().uxManager().showAlert({
        text: 'Resource namespace is not known',
        type: 'error',
      });
      throw new Error('Resource namespace is not defined');
    }

    addSearchParams({
      namespace: this.isNamespaced() ? resource.metadata.namespace : undefined,
    });

    this.LuigiClient().linkManager().navigate(resource.metadata.name);
  }

  executeAction(event: ResourceFieldButtonClickEvent<Resource>) {
    executeButtonAction(
      this.LuigiClient(),
      event.field,
      event.resource,
      this.context(),
    );
  }

  onCreateFieldChange(event: FormFieldChangeEvent): void {
    const name = event.fieldProperty;
    const error = validateFormField({
      name,
      value: event.value,
      fields: this.createFormFields(),
      editMode: false,
    });
    this.createFieldErrors.update((errors) => ({ ...errors, [name]: error }));
  }

  onCreateSubmit(value: Resource): void {
    const resourceDefinition = this.getResourceDefinition();
    const expanded = expandCollectionEntries(
      value as Record<string, unknown>,
      this.createFormFields(),
    ) as Resource;
    this.resourceService
      .create(expanded, resourceDefinition, this.createContext())
      .subscribe({
        next: (result) => {
          this.createFieldErrors.set({});
          this.tableCard().closeCreateDialog();
          console.debug('Resource created', result);
        },
        error: (error) => this.errorHandlerService.handleError(error),
      });
  }

  delete(resource: Resource): void {
    this.resourceService
      .delete(resource, this.getResourceDefinition(), this.context())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.tableCard().closeDeleteDialog();
        },
        error: (error) => this.errorHandlerService.handleError(error),
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

  private generateResourceId(resource: Resource): string {
    const resourceDefinition = this.getResourceDefinition();

    return permissionKey({
      resource: resourceDefinition.permissionsDefinition?.resource,
      name: resource.metadata.name,
      namespace: resource.metadata.namespace,
    });
  }

  private canDo(verb: string): boolean {
    return resourceActionAllowed(
      this.context().portalPermissions,
      this.resourceDefinition()?.permissionsDefinition?.resource,
      verb,
    );
  }

  private getDeleteConfig(
    resource: Resource,
  ): DeleteResourceConfirmationConfig {
    const resourceDefinition = this.getResourceDefinition();
    const name = resource.metadata?.name?.toLowerCase() ?? '';
    return {
      title: `Delete ${name}`,
      message: `<p>Are you sure you want to delete ${resourceDefinition?.entity} <b>${name}</b>?</p>
        <p class="dialog__message--critical">This action <b>cannot</b> be undone.</p>
        <p>Please type <b>${name}</b> to confirm:</p>`,
      confirmationText: name,
      confirmationPlaceholder: 'Type name',
      confirmLabel: 'Delete',
      cancelLabel: 'Cancel',
    };
  }
}
