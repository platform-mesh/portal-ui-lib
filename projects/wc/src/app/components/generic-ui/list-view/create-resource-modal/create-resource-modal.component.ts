import { k8sMessages } from '../../../../consts/k8s-messages';
import { k8sNameValidator } from '../../../../validators/k8s-name-validator';
import {
  FormFieldDefinition,
  SelectOption,
} from '../../../generic-ui/generic-form/form-field-definition';
import { GenericForm } from '../../../generic-ui/generic-form/generic-form.component';
import { ResourceFieldNames } from './create-resource-modal.enums';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ViewEncapsulation,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { ValidatorFn } from '@angular/forms';
import { Bar } from '@fundamental-ngx/ui5-webcomponents/bar';
import { Dialog } from '@fundamental-ngx/ui5-webcomponents/dialog';
import { Title } from '@fundamental-ngx/ui5-webcomponents/title';
import { Toolbar } from '@fundamental-ngx/ui5-webcomponents/toolbar';
import { ToolbarButton } from '@fundamental-ngx/ui5-webcomponents/toolbar-button';
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
import { map } from 'rxjs/operators';

@Component({
  selector: 'pm-create-resource-modal',
  standalone: true,
  imports: [Dialog, ToolbarButton, Toolbar, GenericForm, Bar, Title],
  templateUrl: './create-resource-modal.component.html',
  styleUrl: './create-resource-modal.component.scss',
  encapsulation: ViewEncapsulation.ShadowDom,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateResourceModal implements OnInit {
  context = input.required<ResourceNodeContext>();
  fields = input<FieldDefinition[]>([]);

  resource = output<Resource>();
  updateResource = output<Resource>();
  dialogOpen = signal<boolean>(false);
  isNamespacedResource = computed(() => isNamespacedResource(this.context()));

  private readonly resourceService = inject(ResourceService);
  private originalResource = signal<Resource | null>(null);
  private latestFormValue = signal<Record<string, any> | null>(null);
  isFormValid = signal<boolean>(false);

  formFields = signal<FormFieldDefinition[]>([]);
  formInitialValues = signal<Record<string, any>>({});

  protected readonly k8sMessages = k8sMessages;

  ngOnInit(): void {
    this.formFields.set(this.buildFormFields());
  }

  open(resource?: Resource) {
    this.originalResource.set(resource ?? null);
    const fields = this.calculateFields();
    this.formFields.set(this.buildFormFields(fields));
    this.formInitialValues.set(this.buildInitialValues(fields, resource));
    this.dialogOpen.set(true);
  }

  close() {
    this.dialogOpen.set(false);
    this.latestFormValue.set(null);
    this.isFormValid.set(false);
    this.originalResource.set(null);
  }

  submit() {
    const value = this.latestFormValue();
    if (value) {
      if (this.isEditMode()) {
        this.updateResource.emit(value as Resource);
      } else {
        this.resource.emit(value as Resource);
      }
    }
  }

  onFormValue(value: Record<string, any>) {
    this.latestFormValue.set(value);
  }

  onFormValidChange(valid: boolean) {
    this.isFormValid.set(valid);
  }

  isEditMode() {
    return !!this.originalResource();
  }

  private buildFormFields(fields?: FieldDefinition[]): FormFieldDefinition[] {
    return (fields ?? this.calculateFields()).map((field) =>
      this.toFormField(field),
    );
  }

  private toFormField(field: FieldDefinition): FormFieldDefinition {
    const name = this.sanitizePropertyName(field);
    const formField: FormFieldDefinition = {
      name,
      label: field.label,
      required: field.required,
      disabled: this.isCreateFieldOnly(field) && this.isEditMode(),
    };

    if (field.values?.length) {
      formField.values = field.values;
    } else if (field.dynamicValuesDefinition) {
      const def = field.dynamicValuesDefinition;
      const context = this.context();
      formField.loadValues = (): Promise<SelectOption[]> =>
        firstValueFrom(
          this.resourceService.list(def.operation, def.gqlQuery, context).pipe(
            map((resources) =>
              resources.map((r) => ({
                value: getValueByPath(r, def.value),
                label: getValueByPath(r, def.key),
              })),
            ),
          ),
        );
    }

    const validators = this.getValidators(field);
    if (validators.length) {
      formField.validators = validators;
    }

    return formField;
  }

  private buildInitialValues(
    fields: FieldDefinition[],
    resource?: Resource,
  ): Record<string, any> {
    if (!resource) return {};
    return fields.reduce(
      (acc, field) => {
        if (typeof field.property === 'string') {
          acc[this.sanitizePropertyName(field)] =
            getResourceValueByJsonPath(resource, field) ?? '';
        }
        return acc;
      },
      {} as Record<string, any>,
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

  private isCreateFieldOnly(field: FieldDefinition): boolean {
    return (
      field.property === ResourceFieldNames.MetadataName ||
      field.property === ResourceFieldNames.SpecType ||
      field.property === ResourceFieldNames.MetadataNamespace
    );
  }

  private sanitizePropertyName(field: FieldDefinition): string {
    const property: string | string[] = field.property || '';
    if (property instanceof Array) {
      throw new Error('Wrong property type, array not supported');
    }
    return (
      (property as string).replaceAll('.', '_') +
      (field.propertyField ? `_${field.propertyField.key}` : '')
    );
  }

  private getValidators(field: FieldDefinition): ValidatorFn[] {
    const validators: ValidatorFn[] = [];
    if (field.property === ResourceFieldNames.MetadataName) {
      validators.push(k8sNameValidator);
    }
    return validators;
  }
}
