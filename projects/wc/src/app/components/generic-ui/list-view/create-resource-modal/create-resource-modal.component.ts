import {
  K8S_NAME_ERROR,
  K8S_NAME_RE,
  ResourceFieldNames,
} from './create-resource-modal.consts';
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
import { FieldDefinition, Resource } from '@platform-mesh/portal-ui-lib/models';
import {
  ResourceNodeContext,
  ResourceService,
} from '@platform-mesh/portal-ui-lib/services';
import {
  getResourceValueByJsonPath,
  getValueByPath,
  isNamespacedResource,
} from '@platform-mesh/portal-ui-lib/utils';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'pm-create-resource-modal',
  standalone: true,
  imports: [Dialog, ToolbarButton, Toolbar, DeclarativeForm, Bar, Title],
  templateUrl: './create-resource-modal.component.html',
  styleUrl: './create-resource-modal.component.scss',
  encapsulation: ViewEncapsulation.ShadowDom,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateResourceModal {
  context = input.required<ResourceNodeContext>();
  fields = input<FieldDefinition[]>([]);

  resource = output<Resource>();
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

  async open(resource?: Resource) {
    const fields = this.calculateFields();
    this.originalResource.set(resource ?? null);
    const formFields = await this.buildFormFieldsAsync(fields);
    const initialValues = this.buildInitialValues(fields, resource);

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

  isEditMode() {
    return !!this.originalResource();
  }

  onFieldChange(event: FormFieldChangeEvent): void {
    this.validateField(event.fieldProperty, String(event.value ?? '').trim());
  }

  onFormSubmit(value: Record<string, unknown>): void {
    if (this.isEditMode()) {
      this.updateResource.emit(value as Resource);
    } else {
      this.resource.emit(value as Resource);
    }
  }

  protected submitForm(): void {
    this.declarativeFormRef().submit();
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
        if (field?.required && !value) {
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

  private async buildFormFieldsAsync(
    fields: FieldDefinition[],
  ): Promise<FormFieldDefinition[]> {
    return Promise.all(fields.map((field) => this.toFormFieldAsync(field)));
  }

  private async toFormFieldAsync(
    field: FieldDefinition,
  ): Promise<FormFieldDefinition> {
    const formField = this.toFormField(field);

    if (field.dynamicValuesDefinition) {
      const def = field.dynamicValuesDefinition;
      const resources = await firstValueFrom(
        this.resourceService.list(def.operation, def.gqlQuery, this.context()),
      );
      formField.values = (resources as Resource[])
        .map((r) => getValueByPath(r, def.value) as string)
        .filter(Boolean);
    }

    return formField;
  }

  private toFormField(field: FieldDefinition): FormFieldDefinition {
    if (typeof field.property !== 'string') {
      throw new Error(
        `Form field property must be a string, got: ${JSON.stringify(field.property)}`,
      );
    }

    const formField: FormFieldDefinition = {
      name: field.property,
      label: field.label,
      required: field.required,
      disabled: this.isCreateFieldOnly(field) && this.isEditMode(),
    };

    if (field.values?.length) {
      formField.values = field.values as string[];
    }

    if (field.required || field.property === ResourceFieldNames.MetadataName) {
      formField.validation = 'onChange';
    }

    return formField;
  }

  private buildInitialValues(
    fields: FieldDefinition[],
    resource?: Resource,
  ): Record<string, unknown> {
    if (!resource) return {};
    return fields.reduce(
      (acc, field) => {
        if (typeof field.property === 'string') {
          acc[field.property as string] =
            getResourceValueByJsonPath(resource, field) ?? '';
        }
        return acc;
      },
      {} as Record<string, unknown>,
    );
  }

  private calculateFields(): FieldDefinition[] {
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
    return this.isNamespacedResource();
  }

  private checkFormValidity(): boolean {
    return Object.values(this.fieldErrors()).filter(Boolean).length === 0;
  }

  private isCreateFieldOnly(field: FieldDefinition): boolean {
    return (
      field.property === ResourceFieldNames.MetadataName ||
      field.property === ResourceFieldNames.SpecType ||
      field.property === ResourceFieldNames.MetadataNamespace
    );
  }
}
