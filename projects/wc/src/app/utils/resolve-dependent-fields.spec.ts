import { resolveDependentFields } from './resolve-dependent-fields';
import type { FormFieldChangeEvent, FormFieldDefinition } from '@openmfp/ngx';
import type { PlatformMeshFieldDefinition } from '@platform-mesh/portal-ui-lib/models';

describe('resolveDependentFields', () => {
  const makeField = (
    property: string,
    dependsOn?: string[],
  ): PlatformMeshFieldDefinition => ({
    property,
    ...(dependsOn
      ? { dynamicValuesDefinition: { operation: '', gqlQuery: '', value: '', key: '', dependsOn } }
      : {}),
  });

  const makeCurrentField = (name: string, values?: string[]): FormFieldDefinition =>
    ({ name, ...(values ? { values } : {}) }) as FormFieldDefinition;

  const makeEvent = (fieldProperty: string, value: unknown): FormFieldChangeEvent =>
    ({ fieldProperty, value }) as FormFieldChangeEvent;

  const neverResolve = vi.fn();

  it('returns undefined when no field depends on the changed field', async () => {
    const allFields: PlatformMeshFieldDefinition[] = [
      makeField('metadata.name'),
      makeField('spec.type'),
    ];
    const currentFields = [makeCurrentField('metadata.name'), makeCurrentField('spec.type')];

    const result = await resolveDependentFields(
      makeEvent('metadata.name', 'my-name'),
      currentFields,
      allFields,
      neverResolve,
    );

    expect(result).toBeUndefined();
    expect(neverResolve).not.toHaveBeenCalled();
  });

  it('resolves one dependent: calls resolve once with {[parent]: value}', async () => {
    const allFields: PlatformMeshFieldDefinition[] = [
      makeField('metadata.namespace'),
      makeField('spec.secretRef', ['metadata.namespace']),
    ];
    const currentFields = [
      makeCurrentField('metadata.namespace', ['ns-a']),
      makeCurrentField('spec.secretRef', ['stale-secret']),
    ];
    const resolve = vi.fn().mockResolvedValue(['new-secret']);

    const result = await resolveDependentFields(
      makeEvent('metadata.namespace', 'ns-a'),
      currentFields,
      allFields,
      resolve,
    );

    expect(resolve).toHaveBeenCalledTimes(1);
    expect(resolve).toHaveBeenCalledWith(allFields[1], { 'metadata.namespace': 'ns-a' });

    expect(result).toBeDefined();
    // nextFields: dependent gets new values
    const depField = result!.fields.find((f) => f.name === 'spec.secretRef');
    expect(depField?.values).toEqual(['new-secret']);
    // parent field untouched
    const parentField = result!.fields.find((f) => f.name === 'metadata.namespace');
    expect(parentField?.values).toEqual(['ns-a']);
    // initialValues clears the dependent
    expect(result!.initialValues).toEqual({ 'spec.secretRef': '' });
    // resolvedNames contains the dependent name
    expect(result!.resolvedNames).toEqual(['spec.secretRef']);
  });

  it('resolves multiple dependents in parallel', async () => {
    const allFields: PlatformMeshFieldDefinition[] = [
      makeField('spec.region'),
      makeField('spec.zone', ['spec.region']),
      makeField('spec.subzone', ['spec.region']),
    ];
    const currentFields = [
      makeCurrentField('spec.region', ['eu']),
      makeCurrentField('spec.zone', ['old-zone']),
      makeCurrentField('spec.subzone', ['old-subzone']),
    ];

    const callOrder: string[] = [];
    const resolve = vi.fn().mockImplementation(
      (field: PlatformMeshFieldDefinition) => {
        callOrder.push(field.property as string);
        return Promise.resolve([`resolved-${field.property}`]);
      },
    );

    const result = await resolveDependentFields(
      makeEvent('spec.region', 'us-east'),
      currentFields,
      allFields,
      resolve,
    );

    expect(resolve).toHaveBeenCalledTimes(2);
    expect(result!.fields.find((f) => f.name === 'spec.zone')?.values).toEqual([
      'resolved-spec.zone',
    ]);
    expect(result!.fields.find((f) => f.name === 'spec.subzone')?.values).toEqual([
      'resolved-spec.subzone',
    ]);
    expect(result!.initialValues).toEqual({ 'spec.zone': '', 'spec.subzone': '' });
    expect(result!.resolvedNames).toHaveLength(2);
    expect(result!.resolvedNames).toContain('spec.zone');
    expect(result!.resolvedNames).toContain('spec.subzone');
  });

  it('falls back to [] when resolve returns undefined', async () => {
    const allFields: PlatformMeshFieldDefinition[] = [
      makeField('metadata.namespace'),
      makeField('spec.secretRef', ['metadata.namespace']),
    ];
    const currentFields = [
      makeCurrentField('metadata.namespace'),
      makeCurrentField('spec.secretRef', ['stale']),
    ];
    const resolve = vi.fn().mockResolvedValue(undefined);

    const result = await resolveDependentFields(
      makeEvent('metadata.namespace', ''),
      currentFields,
      allFields,
      resolve,
    );

    const depField = result!.fields.find((f) => f.name === 'spec.secretRef');
    expect(depField?.values).toEqual([]);
  });

  it('leaves non-dependent fields untouched (same reference)', async () => {
    const allFields: PlatformMeshFieldDefinition[] = [
      makeField('metadata.namespace'),
      makeField('spec.name'), // not a dependent of anything
      makeField('spec.secretRef', ['metadata.namespace']),
    ];
    const nameField = makeCurrentField('spec.name', ['a', 'b']);
    const currentFields = [
      makeCurrentField('metadata.namespace'),
      nameField,
      makeCurrentField('spec.secretRef', ['stale']),
    ];
    const resolve = vi.fn().mockResolvedValue(['new']);

    const result = await resolveDependentFields(
      makeEvent('metadata.namespace', 'ns-x'),
      currentFields,
      allFields,
      resolve,
    );

    // The non-dependent spec.name field should be the same object reference
    const nameInResult = result!.fields.find((f) => f.name === 'spec.name');
    expect(nameInResult).toBe(nameField);
  });

  it('only resolves when the changed field is in dependsOn (multi-parent scenario)', async () => {
    // spec.zone depends on BOTH spec.region and spec.provider.
    // Changing spec.region should trigger resolve; changing spec.other should not.
    const zoneField: PlatformMeshFieldDefinition = {
      property: 'spec.zone',
      dynamicValuesDefinition: {
        operation: '',
        gqlQuery: '',
        value: '',
        key: '',
        dependsOn: ['spec.region', 'spec.provider'],
      },
    };
    const allFields: PlatformMeshFieldDefinition[] = [
      makeField('spec.region'),
      makeField('spec.provider'),
      makeField('spec.other'),
      zoneField,
    ];
    const currentFields = [
      makeCurrentField('spec.region'),
      makeCurrentField('spec.provider'),
      makeCurrentField('spec.other'),
      makeCurrentField('spec.zone', ['old']),
    ];
    const resolve = vi.fn().mockResolvedValue(['new-zone']);

    // Changing spec.region — zone depends on it → should resolve
    const resultRegion = await resolveDependentFields(
      makeEvent('spec.region', 'us-east'),
      currentFields,
      allFields,
      resolve,
    );
    expect(resultRegion).toBeDefined();
    expect(resolve).toHaveBeenCalledTimes(1);

    resolve.mockClear();

    // Changing spec.other — zone does NOT depend on it → undefined
    const resultOther = await resolveDependentFields(
      makeEvent('spec.other', 'x'),
      currentFields,
      allFields,
      resolve,
    );
    expect(resultOther).toBeUndefined();
    expect(resolve).not.toHaveBeenCalled();
  });
});
