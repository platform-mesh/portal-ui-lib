import { DynamicSelectComponent } from '../../../dynamic-select/dynamic-select.component';
import {
  CreateOnlyResourceFieldNames,
  DialogHeaderText,
  DialogMode,
} from './create-resource-modal.enums';
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
  Validators,
} from '@angular/forms';
import { FieldDefinition, Resource } from '@openmfp/portal-ui-lib';
import { ResourceNodeContext } from '@platform-mesh/portal-ui-lib/services';
import { getValueByPath } from '@platform-mesh/portal-ui-lib/utils';
import {
  DialogComponent,
  InputComponent,
  LabelComponent,
  OptionComponent,
  SelectComponent,
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
  ],
  templateUrl: './create-resource-modal.component.html',
  styleUrl: './create-resource-modal.component.scss',
  encapsulation: ViewEncapsulation.ShadowDom,
})
export class CreateResourceModalComponent implements OnInit {
  fields = input<FieldDefinition[]>([]);
  context = input<ResourceNodeContext>();
  resource = output<Resource>();
  updateResource = output<Resource>();
  dialog = viewChild<DialogComponent>('dialog');

  fb = inject(FormBuilder);
  form: FormGroup;

  private mode = signal<DialogMode>(DialogMode.Create);
  private originalResource = signal<Resource | null>(null);

  ngOnInit(): void {
    this.form = this.fb.group(this.createControls());
  }

  open() {
    this.mode.set(DialogMode.Create);
    this.originalResource.set(null);
    const dialog = this.dialog();
    if (dialog) {
      dialog.headerText = DialogHeaderText.Create;
      dialog.open = true;
    }
  }

  openForEdit(resource: Resource) {
    this.mode.set(DialogMode.Edit);
    this.originalResource.set(resource);

    const flds = this.fields();
    if (flds?.length) {
      flds.forEach((field) => {
        const controlName = this.sanitizePropertyName(field.property);
        const path = Array.isArray(field.property)
          ? ''
          : (field.property as string);
        const value = path ? getValueByPath(resource, path) : null;
        if (this.form.controls[controlName]) {
          this.form.controls[controlName].setValue(value ?? '');
          this.form.controls[controlName].markAsPristine();
          this.form.controls[controlName].markAsUntouched();
        }
      });
    }

    this.setNameNamespaceDisabled(true);

    const dialog = this.dialog();
    if (dialog) {
      dialog.headerText = DialogHeaderText.Edit;
      dialog.open = true;
    }
  }

  close() {
    const dialog = this.dialog();
    if (dialog) {
      dialog.open = false;
      this.form.reset();
      this.setNameNamespaceDisabled(false);
      this.mode.set(DialogMode.Create);
      this.originalResource.set(null);
    }
  }

  create() {
    if (this.form.valid) {
      const result = {} as Resource;
      for (const key in this.form.value) {
        set(result, key.replaceAll('_', '.'), this.form.value[key]);
      }

      if (this.mode() === DialogMode.Edit) {
        const orig = this.originalResource();
        if (orig?.metadata) {
          result['metadata'] = { ...orig.metadata, ...result['metadata'] };
        }
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
    return this.mode() === DialogMode.Edit;
  }

  isCreateFieldOnly(field: FieldDefinition): boolean {
    return (
      field.property === CreateOnlyResourceFieldNames.MetadataName ||
      field.property === CreateOnlyResourceFieldNames.MetadataNamespace
    );
  }

  private setNameNamespaceDisabled(disabled: boolean) {
    const fields = this.fields() || [];
    fields.forEach((f) => {
      const prop = Array.isArray(f.property) ? '' : (f.property as string);
      if (
        prop === CreateOnlyResourceFieldNames.MetadataName ||
        prop === CreateOnlyResourceFieldNames.MetadataNamespace
      ) {
        const ctrlName = this.sanitizePropertyName(prop);
        const ctrl = this.form.controls[ctrlName];
        if (ctrl) {
          disabled
            ? ctrl.disable({ emitEvent: false })
            : ctrl.enable({ emitEvent: false });
        }
      }
    });
  }

  private createControls() {
    return this.fields().reduce(
      (obj, fieldDefinition) => {
        const validator = fieldDefinition.required ? Validators.required : null;
        obj[this.sanitizePropertyName(fieldDefinition.property)] =
          new FormControl('', validator);
        return obj;
      },
      {} as Record<string, FormControl>,
    );
  }
}
