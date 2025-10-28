import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
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
import { Resource } from '@platform-mesh/portal-ui-lib/models';
import { ResourceNodeContext } from '@platform-mesh/portal-ui-lib/services';
import {
  BarComponent,
  DialogComponent,
  IconComponent,
  InputComponent,
  TextComponent,
  TitleComponent,
  ToolbarButtonComponent,
  ToolbarComponent,
} from '@ui5/webcomponents-ngx';

@Component({
  selector: 'delete-resource-modal',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    DialogComponent,
    TitleComponent,
    ToolbarButtonComponent,
    ToolbarComponent,
    InputComponent,
    BarComponent,
    IconComponent,
    TextComponent,
  ],
  templateUrl: './delete-resource-modal.component.html',
  styleUrl: './delete-resource-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteResourceModalComponent implements OnInit {
  context = input<ResourceNodeContext>();
  dialog = viewChild<DialogComponent>('dialog');
  innerResource = signal<Resource | null>(null);

  resource = output<Resource>();

  fb = inject(FormBuilder);
  form: FormGroup;

  ngOnInit(): void {
    this.form = this.fb.group(this.createControls());
  }

  open(resource: Resource): void {
    const dialog = this.dialog();
    if (dialog) {
      dialog.open = true;
      this.innerResource.set(resource);
      this.form?.controls?.resource?.updateValueAndValidity();
    }
  }

  close(): void {
    const dialog = this.dialog();
    if (dialog) {
      this.form.controls.resource.setValue(null);
      this.form.controls.resource.markAsPristine();
      this.form.controls.resource.markAsUntouched();
      this.form.controls.resource.updateValueAndValidity();
      dialog.open = false;
    }
  }

  delete(): void {
    const res = this.innerResource();
    if (res) {
      this.resource.emit(res);
    }
    this.close();
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

  private createControls() {
    const resourceNameValidator = () => {
      return (control: FormControl) => {
        const expected = this.innerResource()?.metadata?.name?.toLowerCase();
        const value = (control.value ?? '').toString().toLowerCase();
        if (!value || !expected || value !== expected) {
          return { invalidResource: true };
        }
        return null;
      };
    };

    return {
      resource: new FormControl(null, [
        Validators.required,
        resourceNameValidator(),
      ]),
    };
  }
}
