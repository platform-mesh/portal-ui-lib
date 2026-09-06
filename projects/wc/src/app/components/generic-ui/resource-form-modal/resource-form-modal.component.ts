import { isImmutableOnEdit } from '../../../utils/field-definition.utils';
import { resolveContextPlaceholders } from '../../../utils/resolve-context-placeholders';
import {
  buildInitialValues,
  toFormFields,
} from '../../../utils/to-form-fields';
import { ResourceFieldNames } from './resource-form-modal.consts';
import {
  ChangeDetectionStrategy,
  Component,
  ViewEncapsulation,
  computed,
  inject,
  input,
  linkedSignal,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Bar } from '@fundamental-ngx/ui5-webcomponents/bar';
import { Dialog } from '@fundamental-ngx/ui5-webcomponents/dialog';
import { Title } from '@fundamental-ngx/ui5-webcomponents/title';
import { Toolbar } from '@fundamental-ngx/ui5-webcomponents/toolbar';
import { ToolbarButton } from '@fundamental-ngx/ui5-webcomponents/toolbar-button';
import {
  DeclarativeForm,
  FormFieldChangeEvent,
  FormFieldDefinition,
  FormFieldErrors,
} from '@openmfp/ngx';
import {
  PlatformMeshFieldDefinition,
  Resource,
} from '@platform-mesh/portal-ui-lib/models';
import {
  ResourceNodeContext,
  ResourceService,
} from '@platform-mesh/portal-ui-lib/services';
import {
  getValueByPath,
  isNamespacedResource,
  omitEmptyWriteOnlyFields,
  setPropertyByPath,
} from '@platform-mesh/portal-ui-lib/utils';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'pm-resource-form-modal',
  standalone: true,
  imports: [Dialog, ToolbarButton, Toolbar, DeclarativeForm, Bar, Title],
  templateUrl: './resource-form-modal.component.html',
  styleUrl: './resource-form-modal.component.scss',
  encapsulation: ViewEncapsulation.ShadowDom,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ResourceFormModal {
  context = input.required<ResourceNodeContext>();
  fields = input<PlatformMeshFieldDefinition[]>([]);

  updateResource = output<Resource>();
  dialogOpen = signal<boolean>(false);
  isNamespacedResource = computed(() => isNamespacedResource(this.context()));

  private readonly resourceService = inject(ResourceService);
  private originalResource = signal<Resource | null>(null);
  private declarativeFormRef = viewChild.required(DeclarativeForm);

  fieldErrors = signal<FormFieldErrors>({});
  formFields = signal<FormFieldDefinition[]>([]);
  formInitialValues = signal<Record<string, unknown>>({});
  isFormValid = linkedSignal(() => this.checkFormValidity());

  async open(resource: Resource) {
    const fields = this.calculateFields();
    this.originalResource.set(resource);
    const formFields = await this.buildFormFieldsAsync(fields);
    const initialValues = buildInitialValues(fields, resource);

    this.formFields.set(formFields);
    this.isFormValid.set(this.checkFormValidity());
    this.formInitialValues.set(initialValues);
    this.dialogOpen.set(true);
  }

  close() {
    this.dialogOpen.set(false);
    this.fieldErrors.set({});
    this.isFormValid.set(false);
    this.originalResource.set(null);
    this.declarativeFormRef().clear();
  }

  onFieldChange(event: FormFieldChangeEvent): void {
    this.validateField(event.fieldProperty, String(event.value ?? '').trim());
  }

  onFormSubmit(value: Record<string, unknown>): void {
    const sanitized = omitEmptyWriteOnlyFields(value, this.calculateFields());
    this.updateResource.emit(
      this.restoreImmutableFields(sanitized) as Resource,
    );
  }

  protected submitForm(): void {
    this.declarativeFormRef().submit();
  }

  private validateField(name: string, value: string): void {
    let error: string | null = null;

    const field = this.formFields().find((f) => f.name === name);
    if (field?.writeOnly && !value) {
      error = null;
    } else if (field?.required && !value) {
      error = 'This field is required';
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
    return toFormFields(fields, {
      disabled: (field) => isImmutableOnEdit(field),
      resolveDynamicValues: (field) => this.resolveDynamicValues(field),
      editMode: true,
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

    const resources = await firstValueFrom(
      this.resourceService.list(def.operation, def.gqlQuery, ctx, {
        variables,
      }),
    );
    return (resources as Resource[])
      .map((r) => getValueByPath(r, def.value) as string)
      .filter(Boolean);
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

  private checkFormValidity(): boolean {
    return Object.values(this.fieldErrors()).filter(Boolean).length === 0;
  }

  private restoreImmutableFields(
    value: Record<string, unknown>,
  ): Record<string, unknown> {
    const original = this.originalResource();
    if (!original) {
      return value;
    }

    const result = structuredClone(value) as Record<string, unknown>;
    for (const field of this.fields()) {
      if (!isImmutableOnEdit(field) || typeof field.property !== 'string') {
        continue;
      }

      const originalValue = getValueByPath(original, field.property);
      if (originalValue !== undefined) {
        setPropertyByPath(result, field.property, originalValue);
      }
    }

    return result;
  }
}
