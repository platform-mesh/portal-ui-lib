import { isImmutableOnEdit } from '../../../utils/field-definition.utils';
import { applyDependencyTriggers } from '../../../utils/field-dependencies';
import { resolveDependentFields } from '../../../utils/resolve-dependent-fields';
import { resolveFieldDynamicValues } from '../../../utils/resolve-dynamic-values';
import {
  buildInitialValues,
  toFormFields,
} from '../../../utils/to-form-fields';
import {
  K8S_NAME_ERROR,
  K8S_NAME_RE,
  ResourceFieldNames,
} from '../create-resource-modal/create-resource-modal.consts';
import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  FormFieldChangeEvent,
  FormFieldDefinition,
  FormFieldErrors,
  ResourceFormConfig,
  ResourceFormDialog,
} from '@openmfp/ngx';
import {
  PlatformMeshFieldDefinition,
  Resource,
} from '@platform-mesh/portal-ui-lib/models';
import {
  ErrorHandlerService,
  ResourceNodeContext,
  ResourceService,
} from '@platform-mesh/portal-ui-lib/services';
import {
  isNamespacedResource,
  omitEmptyWriteOnlyFields,
} from '@platform-mesh/portal-ui-lib/utils';

@Component({
  selector: 'pm-resource-form-modal',
  standalone: true,
  imports: [ResourceFormDialog],
  templateUrl: './resource-form-modal.component.html',
  encapsulation: ViewEncapsulation.ShadowDom,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResourceFormModal {
  context = input.required<ResourceNodeContext>();
  fields = input<PlatformMeshFieldDefinition[]>([]);

  resource = output<Resource>();
  updateResource = output<Resource>();

  dialogOpen = signal<boolean>(false);
  isNamespacedResource = computed(() => isNamespacedResource(this.context()));

  private readonly resourceService = inject(ResourceService);
  private readonly errorHandlerService = inject(ErrorHandlerService);
  private originalResource = signal<Resource | null>(null);

  fieldErrors = signal<FormFieldErrors>({});
  formFields = signal<FormFieldDefinition[]>([]);
  formInitialValues = signal<Record<string, unknown>>({});

  dialogTitle = computed(() => (this.isEditMode() ? 'Edit' : 'Create'));
  confirmLabel = computed(() => (this.isEditMode() ? 'Save' : 'Create'));
  dataTestidPrefix = computed(() =>
    this.isEditMode() ? 'edit-resource-dialog' : 'create-resource-dialog',
  );

  /**
   * Config passed to the dialog so it can run the `onFieldChange` hook via the
   * shared ngx guard. The hook returns `{ fields, initialValues }` and the
   * dialog applies them — host no longer writes `formFields` / `formInitialValues`
   * from field changes. Error clearing stays here because it is not part of
   * the hook's return shape.
   */
  dialogConfig = computed<ResourceFormConfig>(() => ({
    fields: this.formFields(),
    onFieldChange: (event, currentFields) =>
      this.resolveDependents(event, currentFields),
  }));

  async open(resource?: Resource) {
    const fields = this.calculateFields();
    this.originalResource.set(resource ?? null);
    const initialValues = buildInitialValues(fields, resource);
    const formFields = await this.buildFormFieldsAsync(fields, initialValues);

    // Wire parent triggers: fields that others depend on need onChange so
    // their changes are observable via fieldChange.
    applyDependencyTriggers(formFields, fields);

    this.formFields.set(formFields);
    this.formInitialValues.set(initialValues);
    this.dialogOpen.set(true);
  }

  close() {
    this.dialogOpen.set(false);
    this.fieldErrors.set({});
    this.originalResource.set(null);
  }

  isEditMode() {
    return !!this.originalResource();
  }

  /**
   * Called by the dialog on every form field change. Validation stays here
   * (field-level, synchronous). The async dependent re-resolution is split
   * out into `resolveDependents`, which the dialog invokes via `dialogConfig`.
   */
  onFieldChange(event: FormFieldChangeEvent): void {
    const name = event.fieldProperty;
    this.validateField(name, String(event.value ?? '').trim());
  }

  /**
   * Re-resolves dependent fields when a parent changes. The ngx dialog owns
   * the last-write-wins guard around this call — a slower resolver whose
   * result would clobber a faster one is dropped there.
   */
  private async resolveDependents(
    event: FormFieldChangeEvent,
    currentFields: FormFieldDefinition[],
  ): Promise<
    | {
        fields: FormFieldDefinition[];
        initialValues?: Record<string, unknown>;
      }
    | undefined
  > {
    const result = await resolveDependentFields(
      event,
      currentFields,
      this.calculateFields(),
      (f, fv) => this.resolveDynamicValues(f, fv),
    );
    if (result) {
      // Clearing errors is a side effect not representable in the hook's return
      // shape, so it stays here.
      this.fieldErrors.update((errs) => {
        const next = { ...errs };
        for (const n of result.resolvedNames) next[n] = null;
        return next;
      });
      return { fields: result.fields, initialValues: result.initialValues };
    }
    return undefined;
  }

  onFormSubmit(value: Record<string, unknown>): void {
    if (this.isEditMode()) {
      const sanitized = omitEmptyWriteOnlyFields(value, this.calculateFields());
      this.updateResource.emit(sanitized as Resource);
      return;
    }

    this.resource.emit(value as Resource);
  }

  private validateField(name: string, value: string): void {
    let error: string | null = null;

    switch (name) {
      case ResourceFieldNames.MetadataName:
        if (!value) {
          error = 'This field is required';
        } else if (!K8S_NAME_RE.test(value)) {
          error = K8S_NAME_ERROR;
        }
        break;
      default: {
        const field = this.formFields().find((f) => f.name === name);
        if (field?.writeOnly && !value && this.isEditMode()) {
          error = null;
        } else if (field?.required && !value) {
          error = 'This field is required';
        }
      }
    }

    this.fieldErrors.update((errors) => {
      const updated = { ...errors };
      updated[name] = error;
      return updated;
    });
  }

  private buildFormFieldsAsync(
    fields: PlatformMeshFieldDefinition[],
    formValues: Record<string, unknown> = {},
  ): Promise<FormFieldDefinition[]> {
    const editMode = this.isEditMode();
    return toFormFields(fields, {
      disabled: (field) => editMode && isImmutableOnEdit(field),
      resolveDynamicValues: (field, fv) =>
        this.resolveDynamicValues(field, fv),
      editMode,
      formValues,
    });
  }

  private async resolveDynamicValues(
    field: PlatformMeshFieldDefinition,
    formValues: Record<string, unknown> = {},
  ): Promise<string[] | undefined> {
    return resolveFieldDynamicValues(
      field,
      this.context(),
      this.isNamespacedResource(),
      formValues,
      {
        list: (operation, gqlQuery, context, options) =>
          this.resourceService.list(operation, gqlQuery, context, options),
        getNamespace: (c) => this.resourceService.getNamespace(c),
        handleError: (error) => this.errorHandlerService.handleError(error),
      },
    );
  }

  private calculateFields(): PlatformMeshFieldDefinition[] {
    const fields = this.fields().slice();

    if (this.shouldAddNamespaceControl()) {
      // Namespace field is placed FIRST so it acts as the visible root of the
      // dependency chain (dependent fields resolve against its selected value).
      fields.unshift({
        property: ResourceFieldNames.MetadataNamespace,
        required: true,
        label: 'Namespace',
        dynamicValuesDefinition: {
          operation: 'v1.Namespaces.items',
          gqlQuery:
            'query { v1 { Namespaces { items { metadata { name } } } } }',
          value: 'metadata.name',
          key: 'metadata.name',
        },
      });
    }

    return fields;
  }

  private shouldAddNamespaceControl() {
    return (
      this.isNamespacedResource() &&
      !this.resourceService.getNamespace(this.context())
    );
  }
}
