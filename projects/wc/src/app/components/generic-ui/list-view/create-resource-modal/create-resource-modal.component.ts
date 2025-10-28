import { k8sMessages } from '../../../../consts/k8s-messages';
import { k8sNameValidator } from '../../../../validators/k8s-name-validator';
import { DynamicSelectComponent } from '../../../dynamic-select/dynamic-select.component';
import { ResourceFieldNames } from './create-resource-modal.enums';
import {
  Component,
  OnInit,
  ViewEncapsulation,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidatorFn,
  Validators,
} from '@angular/forms';
import { FieldDefinition, Resource } from '@platform-mesh/portal-ui-lib/models';
import { ResourceNodeContext } from '@platform-mesh/portal-ui-lib/services';
import { getValueByPath } from '@platform-mesh/portal-ui-lib/utils';
import {
  BarComponent,
  DialogComponent,
  InputComponent,
  LabelComponent,
  OptionComponent,
  SelectComponent,
  TitleComponent,
  ToolbarButtonComponent,
  ToolbarComponent,
} from '@ui5/webcomponents-ngx';
import { set } from 'lodash';

@Component({
  selector: 'create-resource-modal',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DialogComponent,
    OptionComponent,
    SelectComponent,
    InputComponent,
    LabelComponent,
    ToolbarButtonComponent,
    ToolbarComponent,
    DynamicSelectComponent,
    BarComponent,
    TitleComponent,
  ],
  templateUrl: './create-resource-modal.component.html',
  styleUrl: './create-resource-modal.component.scss',
  encapsulation: ViewEncapsulation.ShadowDom,
})
export class CreateResourceModalComponent implements OnInit {
  fields = input<FieldDefinition[]>([]);
  context = input.required<ResourceNodeContext>();
  resource = output<Resource>();
  updateResource = output<Resource>();
  dialog = viewChild<DialogComponent>('dialog');

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
    const dialog = this.dialog();
    if (dialog) {
      dialog.open = true;
    }
  }

  close() {
    const dialog = this.dialog();
    if (dialog) {
      dialog.open = false;
      this.form.reset();
      this.originalResource.set(null);
    }
  }

  create() {
    if (this.form.valid) {
      const result = {} as Resource;
      for (const key in this.form.value) {
        set(result, key.replaceAll('_', '.'), this.form.value[key]);
      }

      if (this.isEditMode()) {
        this.updateResource.emit(result);
      } else {
        this.resource.emit(result);
      }
      this.close();
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

  sanitizePropertyName(property: string | string[]) {
    if (property instanceof Array) {
      throw new Error('Wrong property type, array not supported');
    }
    return (property as string).replaceAll('.', '_');
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
        const fieldName = this.sanitizePropertyName(fieldDefinition.property);
        const fieldValue =
          resource && typeof fieldDefinition.property === 'string'
            ? getValueByPath(resource, fieldDefinition.property)
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
