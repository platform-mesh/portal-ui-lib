import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
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
  Validators,
} from '@angular/forms';
import { Bar } from '@fundamental-ngx/ui5-webcomponents/bar';
import { Dialog } from '@fundamental-ngx/ui5-webcomponents/dialog';
import { Icon } from '@fundamental-ngx/ui5-webcomponents/icon';
import { Input } from '@fundamental-ngx/ui5-webcomponents/input';
import { Text } from '@fundamental-ngx/ui5-webcomponents/text';
import { Title } from '@fundamental-ngx/ui5-webcomponents/title';
import { Toolbar } from '@fundamental-ngx/ui5-webcomponents/toolbar';
import { ToolbarButton } from '@fundamental-ngx/ui5-webcomponents/toolbar-button';
import { Resource } from '@platform-mesh/portal-ui-lib/models';
import { ResourceNodeContext } from '@platform-mesh/portal-ui-lib/services';

@Component({
  selector: 'pm-delete-resource-modal',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    Dialog,
    Title,
    ToolbarButton,
    Toolbar,
    Input,
    Bar,
    Icon,
    Text,
  ],
  templateUrl: './delete-resource-modal.component.html',
  styleUrl: './delete-resource-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeleteResourceModal implements OnInit {
  context = input<ResourceNodeContext>();
  innerResource = signal<Resource | null>(null);
  dialogOpen = signal<boolean>(false);

  resource = output<Resource>();

  fb = inject(FormBuilder);
  form: FormGroup;

  ngOnInit(): void {
    this.form = this.fb.group(this.createControls());
  }

  open(resource: Resource): void {
    this.dialogOpen.set(true);
    this.innerResource.set(resource);
    this.form?.controls?.resource?.updateValueAndValidity();
  }

  close(): void {
    this.form.controls.resource.setValue(null);
    this.form.controls.resource.markAsPristine();
    this.form.controls.resource.markAsUntouched();
    this.form.controls.resource.updateValueAndValidity();
    this.dialogOpen.set(false);
  }

  delete(): void {
    const res = this.innerResource();
    if (res) {
      this.resource.emit(res);
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
