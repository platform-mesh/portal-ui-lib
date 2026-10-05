import { isImmutableOnEdit } from '../../../utils/field-definition.utils';
import { resolveContextPlaceholders } from '../../../utils/resolve-context-placeholders';
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
  getValueByPath,
  isNamespacedResource,
  omitEmptyWriteOnlyFields,
} from '@platform-mesh/portal-ui-lib/utils';
import { firstValueFrom } from 'rxjs';

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

  async open(resource?: Resource) {
    const fields = this.calculateFields();
    this.originalResource.set(resource ?? null);
    const formFields = await this.buildFormFieldsAsync(fields);
    const initialValues = buildInitialValues(fields, resource);

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

  onFieldChange(event: FormFieldChangeEvent): void {
    this.validateField(event.fieldProperty, String(event.value ?? '').trim());
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
  ): Promise<FormFieldDefinition[]> {
    const editMode = this.isEditMode();
    return toFormFields(fields, {
      disabled: (field) => editMode && isImmutableOnEdit(field),
      resolveDynamicValues: (field) => this.resolveDynamicValues(field),
      editMode,
    });
  }

  private async resolveDynamicValues(
    field: PlatformMeshFieldDefinition,
  ): Promise<string[] | undefined> {
    const def = field.dynamicValuesDefinition;
    if (!def) return undefined;

    const ctx = this.context();
    const variables = Object.fromEntries(
      Object.entries(def.gqlQueryVariables ?? {}).map(([name, value]) => [
        name,
        { type: 'String', value: resolveContextPlaceholders(value, ctx) },
      ]),
    );

    try {
      const resources = await firstValueFrom(
        this.resourceService.list(def.operation, def.gqlQuery, ctx, {
          variables,
        }),
      );
      return (resources as Resource[])
        .map((r) => getValueByPath(r, def.value) as string)
        .filter(Boolean);
    } catch (error) {
      this.errorHandlerService.handleError(error);
      return undefined;
    }
  }

  private calculateFields(): PlatformMeshFieldDefinition[] {
    const fields = this.fields().slice();

    if (this.shouldAddNamespaceControl()) {
      fields.push({
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
