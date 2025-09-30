import { AbstractControl } from '@angular/forms';

export function k8sNameValidator(control: AbstractControl) {
  if (!control.value) {
    return null;
  }

  const value = control.value.toString();

  // RFC 1035 validation: max 63 chars, lowercase alphanumeric or '-', starts with letter, ends with alphanumeric
  const k8sNameRegex = /^[a-z]([a-z0-9-]{0,61}[a-z0-9])?$/;

  if (!k8sNameRegex.test(value)) {
    return { k8sNameInvalid: true };
  }

  return null;
}
