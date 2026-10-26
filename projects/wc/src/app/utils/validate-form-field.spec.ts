import { K8S_NAME_ERROR } from '../components/generic-ui/create-resource-modal/create-resource-modal.consts';
import { validateFormField } from './validate-form-field';
import type { PlatformMeshFieldDefinition } from '@platform-mesh/portal-ui-lib/models';

describe('validateFormField', () => {
  const fields: PlatformMeshFieldDefinition[] = [
    { property: 'spec.required', required: true },
    { property: 'spec.optional' },
    { property: 'spec.secret', required: true, writeOnly: true },
  ];

  function validate(
    name: string,
    value: unknown,
    editMode = false,
  ): string | null {
    return validateFormField({ name, value, fields, editMode });
  }

  it('requires a non-empty resource name', () => {
    expect(validate('metadata.name', undefined)).toBe('This field is required');
    expect(validate('metadata.name', '   ')).toBe('This field is required');
  });

  it('rejects resource names that do not match the Kubernetes name pattern', () => {
    expect(validate('metadata.name', 'Invalid_Name')).toBe(K8S_NAME_ERROR);
  });

  it('accepts a valid resource name even when it is not declared in fields', () => {
    expect(validate('metadata.name', 'valid-name')).toBeNull();
  });

  it('requires a non-empty value for required fields', () => {
    expect(validate('spec.required', null)).toBe('This field is required');
    expect(validate('spec.required', '   ')).toBe('This field is required');
    expect(validate('spec.required', 'value')).toBeNull();
  });

  it('allows empty values for optional fields', () => {
    expect(validate('spec.optional', '')).toBeNull();
  });

  it('allows an empty write-only field when editing', () => {
    expect(validate('spec.secret', '', true)).toBeNull();
    expect(validate('spec.secret', 'new-secret', true)).toBeNull();
  });

  it('requires a write-only field when creating', () => {
    expect(validate('spec.secret', '')).toBe('This field is required');
  });

  it('ignores fields that are not part of the form', () => {
    expect(validate('spec.unknown', '')).toBeNull();
  });
});
