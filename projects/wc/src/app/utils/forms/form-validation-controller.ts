import { computed, signal } from '@angular/core';
import type { FormFieldChangeEvent, FormFieldErrors } from '@openmfp/ngx';

/** Keeps automatic field resets invalid without displaying an interaction error. */
export class FormValidationController {
  readonly errors = signal<FormFieldErrors>({});
  private readonly deferredErrors = signal<FormFieldErrors>({});
  private readonly values = new Map<string, unknown>();

  readonly hasDeferredErrors = computed(() =>
    Object.values(this.deferredErrors()).some(Boolean),
  );

  constructor(
    private readonly validate: (name: string, value: unknown) => string | null,
  ) {}

  handleChange(event: FormFieldChangeEvent): void {
    const name = event.fieldProperty;
    if (
      event.source === 'seed' &&
      this.values.has(name) &&
      Object.is(this.values.get(name), event.value)
    ) {
      return;
    }

    this.values.set(name, event.value);
    const error = this.validate(name, event.value);
    this.errors.update((errors) => ({ ...errors, [name]: error }));
    this.deferredErrors.update((errors) => ({ ...errors, [name]: null }));
  }

  resetField(name: string, value: unknown): void {
    this.values.set(name, value);
    const error = this.validate(name, value);
    this.errors.update((errors) => ({ ...errors, [name]: null }));
    this.deferredErrors.update((errors) => ({ ...errors, [name]: error }));
  }

  reset(): void {
    this.values.clear();
    this.errors.set({});
    this.deferredErrors.set({});
  }
}
