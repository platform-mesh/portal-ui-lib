import { k8sMessages } from '../../../../consts/k8s-messages';
import { k8sNameValidator } from '../../../../validators/k8s-name-validator';
import { DynamicSelect } from '../../../dynamic-select/dynamic-select.component';
import { ResourceFieldNames } from './create-resource-modal.enums';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  ViewEncapsulation,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { Bar } from '@fundamental-ngx/ui5-webcomponents/bar';
import { Dialog } from '@fundamental-ngx/ui5-webcomponents/dialog';
import { Input } from '@fundamental-ngx/ui5-webcomponents/input';
import { Label } from '@fundamental-ngx/ui5-webcomponents/label';
import { Option } from '@fundamental-ngx/ui5-webcomponents/option';
import { Select } from '@fundamental-ngx/ui5-webcomponents/select';
import { Title } from '@fundamental-ngx/ui5-webcomponents/title';
import { Toolbar } from '@fundamental-ngx/ui5-webcomponents/toolbar';
import { ToolbarButton } from '@fundamental-ngx/ui5-webcomponents/toolbar-button';
import { FieldDefinition, Resource } from '@platform-mesh/portal-ui-lib/models';
import { ResourceNodeContext } from '@platform-mesh/portal-ui-lib/services';
import {
  getResourceValueByJsonPath,
  setPropertyByPath,
} from '@platform-mesh/portal-ui-lib/utils';

@Component({
  selector: 'pm-create-resource-modal',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    Dialog,
    Option,
    Select,
    Input,
    Label,
    ToolbarButton,
    Toolbar,
    DynamicSelect,
    Bar,
    Title,
  ],
  templateUrl: './create-resource-modal.component.html',
  styleUrl: './create-resource-modal.component.scss',
  encapsulation: ViewEncapsulation.ShadowDom,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CreateResourceModal implements OnInit {
  fields = input<FieldDefinition[]>([]);
  context = input.required<ResourceNodeContext>();
  resource = output<Resource>();
  updateResource = output<Resource>();
  dialogOpen = signal<boolean>(false);

  fb = inject(FormBuilder);
  form: FormGroup;

  private originalResource = signal<Resource | null>(null);

  protected readonly k8sMessages = k8sMessages;

  ngOnInit(): void {
    this.form = this.fb.group(this.createControls());
  }

  open(resource?: Resource) {
    this.originalResource.set(resource ?? null);
    this.form = this.fb.group(this.createControls(resource));
    this.dialogOpen.set(true);
  }

  close() {
    this.dialogOpen.set(false);
    this.form.reset();
    this.originalResource.set(null);
  }

  create() {
    if (this.form.valid) {
      const result = {} as Resource;
      for (const key in this.form.value) {
        setPropertyByPath(
          result,
          key.replaceAll('_', '.'),
          this.form.value[key],
        );
      }

      if (this.isEditMode()) {
        this.updateResource.emit(result);
      } else {
        this.resource.emit(result);
      }
    }
  }

  setFormControlValue($event: any, formControlName: string) {
    this.form.controls[formControlName].setValue($event.target.value);
    this.form.controls[formControlName].markAsTouched();
    this.form.controls[formControlName].markAsDirty();
  }

  getValueState(formControlName: string) {
    const control = this.form.controls[formControlName];
    return control.invalid && control.touched ? 'Negative' : 'None';
  }

  onFieldBlur(formControlName: string) {
    this.form.controls[formControlName].markAsTouched();
  }

  sanitizePropertyName(field: FieldDefinition) {
    const property: string | string[] = field.property || '';
    if (property instanceof Array) {
      throw new Error('Wrong property type, array not supported');
    }

    return (
      (property as string).replaceAll('.', '_') +
      (field.propertyField ? `_${field.propertyField?.key}` : '')
    );
  }

  isEditMode() {
    return !!this.originalResource();
  }

  isCreateFieldOnly(field: FieldDefinition): boolean {
    return (
      field.property === ResourceFieldNames.MetadataName ||
      field.property === ResourceFieldNames.SpecType ||
      field.property === ResourceFieldNames.MetadataNamespace
    );
  }

  private createControls(resource?: Resource) {
    return this.fields().reduce(
      (obj, fieldDefinition) => {
        const validators = this.getValidator(fieldDefinition);
        const fieldName = this.sanitizePropertyName(fieldDefinition);
        const fieldValue =
          resource && typeof fieldDefinition.property === 'string'
            ? getResourceValueByJsonPath(resource, fieldDefinition)
            : '';
        obj[fieldName] = new FormControl(fieldValue, validators);

        return obj;
      },
      {} as Record<string, FormControl>,
    );
  }

  private getValidator(fieldDefinition: FieldDefinition) {
    const validators: ValidatorFn[] = [];

    if (fieldDefinition.required) {
      validators.push(Validators.required);
    }

    if (fieldDefinition.property === ResourceFieldNames.MetadataName) {
      validators.push(k8sNameValidator);
    }

    return validators;
  }
}
