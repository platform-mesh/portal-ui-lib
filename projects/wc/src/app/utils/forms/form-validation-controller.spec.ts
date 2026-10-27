import { FormValidationController } from './form-validation-controller';

describe('FormValidationController', () => {
  const required = (name: string, value: unknown) =>
    name === 'required' && !value ? 'This field is required' : null;

  it('validates initial seeds, skips unchanged seeds and revalidates changed values', () => {
    const validate = vi.fn(required);
    const controller = new FormValidationController(validate);
    controller.handleChange({
      fieldProperty: 'required',
      value: '',
      source: 'seed',
    });
    expect(controller.errors().required).toBe('This field is required');
    controller.handleChange({
      fieldProperty: 'required',
      value: '',
      source: 'seed',
    });
    expect(validate).toHaveBeenCalledTimes(1);
    controller.handleChange({
      fieldProperty: 'required',
      value: 'selected',
      source: 'seed',
    });
    expect(validate).toHaveBeenCalledTimes(2);
    expect(controller.errors().required).toBeNull();
  });

  it('keeps an automatic reset invalid and hidden across seed events until user interaction', () => {
    const validate = vi.fn(required);
    const controller = new FormValidationController(validate);
    controller.handleChange({ fieldProperty: 'required', value: 'old' });
    controller.resetField('required', '');
    expect(controller.errors().required).toBeNull();
    expect(controller.hasDeferredErrors()).toBe(true);
    controller.handleChange({
      fieldProperty: 'required',
      value: '',
      source: 'seed',
    });
    expect(validate).toHaveBeenCalledTimes(2);
    expect(controller.errors().required).toBeNull();
    expect(controller.hasDeferredErrors()).toBe(true);
    controller.handleChange({
      fieldProperty: 'required',
      value: '',
      source: 'user',
    });
    expect(controller.errors().required).toBe('This field is required');
    expect(controller.hasDeferredErrors()).toBe(false);
    controller.handleChange({ fieldProperty: 'required', value: 'new' });
    expect(controller.errors().required).toBeNull();
  });

  it('allows optional resets and clears all validation state between dialog sessions', () => {
    const validate = vi.fn(required);
    const controller = new FormValidationController(validate);
    controller.resetField('optional', '');
    expect(controller.hasDeferredErrors()).toBe(false);
    controller.resetField('required', '');
    controller.reset();
    expect(controller.errors()).toEqual({});
    expect(controller.hasDeferredErrors()).toBe(false);
    controller.handleChange({
      fieldProperty: 'required',
      value: '',
      source: 'seed',
    });
    expect(controller.errors().required).toBe('This field is required');
    expect(validate).toHaveBeenCalledTimes(3);
  });
});
