import { k8sNameValidator } from './k8s-name-validator';
import { AbstractControl } from '@angular/forms';

describe('k8sNameValidator', () => {
  const createControl = (value: any): AbstractControl =>
    ({
      value,
    }) as AbstractControl;

  it('should return null when control value is null', () => {
    const control = createControl(null);
    const result = k8sNameValidator(control);
    expect(result).toBeNull();
  });

  it('should return null when control value is undefined', () => {
    const control = createControl(undefined);
    const result = k8sNameValidator(control);
    expect(result).toBeNull();
  });

  it('should return null when control value is empty string', () => {
    const control = createControl('');
    const result = k8sNameValidator(control);
    expect(result).toBeNull();
  });

  it('should return null for valid k8s name (single character)', () => {
    const control = createControl('a');
    const result = k8sNameValidator(control);
    expect(result).toBeNull();
  });

  it('should return null for valid k8s name (with numbers and hyphens)', () => {
    const control = createControl('my-app-123');
    const result = k8sNameValidator(control);
    expect(result).toBeNull();
  });

  it('should return null for valid k8s name (maximum length)', () => {
    const control = createControl('a'.repeat(63));
    const result = k8sNameValidator(control);
    expect(result).toBeNull();
  });

  it('should return error for invalid k8s name starting with number', () => {
    const control = createControl('123invalid');
    const result = k8sNameValidator(control);
    expect(result).toEqual({ k8sNameInvalid: true });
  });

  it('should return error for invalid k8s name starting with uppercase', () => {
    const control = createControl('Invalid');
    const result = k8sNameValidator(control);
    expect(result).toEqual({ k8sNameInvalid: true });
  });

  it('should return error for invalid k8s name ending with hyphen', () => {
    const control = createControl('invalid-');
    const result = k8sNameValidator(control);
    expect(result).toEqual({ k8sNameInvalid: true });
  });

  it('should return error for invalid k8s name with uppercase letters', () => {
    const control = createControl('Invalid-Name');
    const result = k8sNameValidator(control);
    expect(result).toEqual({ k8sNameInvalid: true });
  });

  it('should return error for invalid k8s name exceeding maximum length', () => {
    const control = createControl('a'.repeat(64));
    const result = k8sNameValidator(control);
    expect(result).toEqual({ k8sNameInvalid: true });
  });

  it('should return error for invalid k8s name with special characters', () => {
    const control = createControl('invalid@name');
    const result = k8sNameValidator(control);
    expect(result).toEqual({ k8sNameInvalid: true });
  });

  it('should handle non-string values by converting to string', () => {
    const control = createControl(123);
    const result = k8sNameValidator(control);
    expect(result).toEqual({ k8sNameInvalid: true });
  });
});
