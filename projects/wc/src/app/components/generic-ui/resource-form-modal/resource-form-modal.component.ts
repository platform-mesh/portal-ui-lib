import { isImmutableOnEdit } from '../../../utils/field-definition.utils';
import { applyDependencyTriggers } from '../../../utils/field-dependencies';
import { resolveDependentFields } from '../../../utils/resolve-dependent-fields';
import { resolveFieldDynamicValues } from '../../../utils/resolve-dynamic-values';
import {
  buildInitialValues,
  toFormFields,
} from '../../../utils/to-form-fields';
import { validateFormField } from '../../../utils/validate-form-field';
import { ResourceFieldNames } from '../create-resource-modal/create-resource-modal.consts';
import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
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
  private readonly dialog = viewChild<ResourceFormDialog>('dialog');
  private originalResource = signal<Resource | null>(null);

  fieldErrors = signal<FormFieldErrors>({});
  formFields = signal<FormFieldDefinition[]>([]);

  dialogTitle = computed(() => (this.isEditMode() ? 'Edit' : 'Create'));
  confirmLabel = computed(() => (this.isEditMode() ? 'Save' : 'Create'));
  dataTestidPrefix = computed(() =>
    this.isEditMode() ? 'edit-resource-dialog' : 'create-resource-dialog',
  );

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

    applyDependencyTriggers(formFields, fields);

    this.formFields.set(formFields);
    this.dialogOpen.set(true);

    if (resource !== undefined) {
      this.dialog()?.patchForm(initialValues, { emitEvent: false });
    } else {
      this.dialog()?.patchForm(initialValues);
    }
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
    this.validateField(event.fieldProperty, event.value);
  }

  /**
   * Called by the dialog when the `onFieldChange` hook returns a result.
   * Writes `fields` back through the signal (input re-flows) and seeds any
   * reset `initialValues` silently via `patchForm({ emitEvent: false })`
   * so the dependent-clear does not echo through `fieldChange` and
   * re-trigger the hook (loop prevention).
   */
  onFieldsUpdated(payload: {
    fields: FormFieldDefinition[];
    initialValues?: Record<string, unknown>;
  }): void {
    this.formFields.set(payload.fields);
    if (payload.initialValues !== undefined) {
      this.dialog()?.patchForm(payload.initialValues, { emitEvent: false });
    }
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

  private validateField(name: string, value: unknown): void {
    const error = validateFormField({
      name,
      value,
      fields: this.calculateFields(),
      editMode: this.isEditMode(),
    });
    this.fieldErrors.update((errors) => ({ ...errors, [name]: error }));
  }

  private buildFormFieldsAsync(
    fields: PlatformMeshFieldDefinition[],
    formValues: Record<string, unknown> = {},
  ): Promise<FormFieldDefinition[]> {
    const editMode = this.isEditMode();
    return toFormFields(fields, {
      disabled: (field) => editMode && isImmutableOnEdit(field),
      resolveDynamicValues: (field, fv) => this.resolveDynamicValues(field, fv),
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
