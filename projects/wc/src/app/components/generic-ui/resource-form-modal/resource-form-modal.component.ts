import { isImmutableOnEdit } from '../../../utils/field-definition.utils';
import { applyDependencyTriggers } from '../../../utils/field-dependencies';
import {
  DependentFieldUpdate,
  DynamicValuesResult,
  FormDependencyController,
} from '../../../utils/form-dependency-controller';
import { resolveFieldDynamicValuesResult } from '../../../utils/resolve-dynamic-values';
import {
  buildInitialValues,
  toFormFields,
} from '../../../utils/to-form-fields';
import { validateFormField } from '../../../utils/validate-form-field';
import { ResourceFieldNames } from '../create-resource-modal/create-resource-modal.consts';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
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
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = viewChild<ResourceFormDialog>('dialog');
  private originalResource = signal<Resource | null>(null);

  fieldErrors = signal<FormFieldErrors>({});
  formFields = signal<FormFieldDefinition[]>([]);
  initialValues = signal<Record<string, unknown>>({});
  pending = signal(false);
  private dependencyContext?: ResourceNodeContext;
  private readonly dependencies = new FormDependencyController(
    (field, values) => this.resolveDynamicValuesResult(field, values),
    (update) => this.applyDependentUpdate(update),
  );

  dialogTitle = computed(() => (this.isEditMode() ? 'Edit' : 'Create'));
  confirmLabel = computed(() => (this.isEditMode() ? 'Save' : 'Create'));
  dataTestidPrefix = computed(() =>
    this.isEditMode() ? 'edit-resource-dialog' : 'create-resource-dialog',
  );

  constructor() {
    this.destroyRef.onDestroy(() => this.dependencies.end());
  }

  async open(resource?: Resource) {
    this.dependencies.end();
    this.dialogOpen.set(false);
    this.pending.set(false);
    this.fieldErrors.set({});
    const fields = this.calculateFields();
    this.originalResource.set(resource ?? null);
    const values = buildInitialValues(fields, resource);
    const generation = this.dependencies.begin(fields, values);
    this.dependencyContext = this.context();
    const formFields = await this.buildFormFieldsAsync(fields, values);
    if (!this.dependencies.isCurrent(generation)) return;

    applyDependencyTriggers(formFields, fields);
    this.formFields.set(formFields);
    this.initialValues.set(values);
    this.dialogOpen.set(true);
  }

  close() {
    this.dependencies.end();
    this.dialogOpen.set(false);
    this.pending.set(false);
    this.fieldErrors.set({});
    this.originalResource.set(null);
  }

  isEditMode() {
    return !!this.originalResource();
  }

  onFieldChange(event: FormFieldChangeEvent): void {
    this.validateField(event.fieldProperty, event.value);
    this.dependencies.handleChange(event);
  }

  private applyDependentUpdate(update: DependentFieldUpdate): void {
    if (update.clear) {
      this.dialog()?.patchForm(
        { [update.name]: '' },
        { emitEvent: false, markAsDirty: true },
      );
      this.validateField(update.name, '');
    }
    this.formFields.update((fields) =>
      fields.map((field) =>
        field.name === update.name
          ? { ...field, values: update.values }
          : field,
      ),
    );
    this.pending.set(update.pending);
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
      resolveDynamicValues: async (field, fv) => {
        if (
          field.dynamicValuesDefinition?.dependsOn?.some(
            (parent) => fv?.[parent] == null || fv[parent] === '',
          )
        ) {
          return [];
        }
        const result = await this.resolveDynamicValuesResult(field, fv ?? {});
        return result.kind === 'ready'
          ? result.values
          : field.dynamicValuesDefinition?.dependsOn?.length
            ? []
            : undefined;
      },
      editMode,
      formValues,
    });
  }

  private resolveDynamicValuesResult(
    field: PlatformMeshFieldDefinition,
    values: Record<string, unknown>,
  ): Promise<DynamicValuesResult> {
    return resolveFieldDynamicValuesResult(
      field,
      this.dependencyContext ?? this.context(),
      this.isNamespacedResource(),
      values,
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
      !this.resourceService.getNamespace(this.context()) &&
      !this.fields().some(
        (field) => field.property === ResourceFieldNames.MetadataNamespace,
      )
    );
  }
}
