import { FormFieldDefinition } from '@openmfp/ngx';
import { PlatformMeshFieldDefinition } from '@platform-mesh/portal-ui-lib/models';
import { applyDependencyTriggers, collectDependencyTriggers } from './field-dependencies';

describe('collectDependencyTriggers', () => {
  it('returns an empty set for an empty fields array', () => {
    expect(collectDependencyTriggers([])).toEqual(new Set());
  });

  it('returns an empty set when no field has dependsOn', () => {
    const fields: PlatformMeshFieldDefinition[] = [
      { property: 'metadata.name', label: 'Name' },
      { property: 'spec.region', label: 'Region' },
    ];
    expect(collectDependencyTriggers(fields)).toEqual(new Set());
  });

  it('returns an empty set when dynamicValuesDefinition has no dependsOn', () => {
    const fields: PlatformMeshFieldDefinition[] = [
      {
        property: 'spec.secret',
        label: 'Secret',
        dynamicValuesDefinition: {
          operation: 'v1.Secrets.items',
          gqlQuery: 'query { v1 { Secrets { items { metadata { name } } } } }',
          value: 'metadata.name',
          key: 'metadata.name',
        },
      },
    ];
    expect(collectDependencyTriggers(fields)).toEqual(new Set());
  });

  it('returns the single parent name when one field has dependsOn', () => {
    const fields: PlatformMeshFieldDefinition[] = [
      { property: 'metadata.namespace', label: 'Namespace' },
      {
        property: 'spec.secret',
        label: 'Secret',
        dynamicValuesDefinition: {
          operation: 'v1.Secrets.items',
          gqlQuery: 'query ($namespace: String!) { v1 { Secrets(namespace: $namespace) { items { metadata { name } } } } }',
          value: 'metadata.name',
          key: 'metadata.name',
          dependsOn: ['metadata.namespace'],
        },
      },
    ];
    expect(collectDependencyTriggers(fields)).toEqual(
      new Set(['metadata.namespace']),
    );
  });

  it('deduplicates parent names referenced by multiple dependents', () => {
    const fields: PlatformMeshFieldDefinition[] = [
      { property: 'metadata.namespace', label: 'Namespace' },
      {
        property: 'spec.secretA',
        label: 'Secret A',
        dynamicValuesDefinition: {
          operation: 'v1.Secrets.items',
          gqlQuery: 'query ($namespace: String!) { v1 { Secrets(namespace: $namespace) { items { metadata { name } } } } }',
          value: 'metadata.name',
          key: 'metadata.name',
          dependsOn: ['metadata.namespace'],
        },
      },
      {
        property: 'spec.secretB',
        label: 'Secret B',
        dynamicValuesDefinition: {
          operation: 'v1.Secrets.items',
          gqlQuery: 'query ($namespace: String!) { v1 { Secrets(namespace: $namespace) { items { metadata { name } } } } }',
          value: 'metadata.name',
          key: 'metadata.name',
          dependsOn: ['metadata.namespace'],
        },
      },
    ];
    expect(collectDependencyTriggers(fields)).toEqual(
      new Set(['metadata.namespace']),
    );
  });

  it('collects multiple distinct parent names', () => {
    const fields: PlatformMeshFieldDefinition[] = [
      { property: 'spec.region', label: 'Region' },
      { property: 'metadata.namespace', label: 'Namespace' },
      {
        property: 'spec.zone',
        label: 'Zone',
        dynamicValuesDefinition: {
          operation: 'zones.items',
          gqlQuery: 'query { zones { items { name } } }',
          value: 'name',
          key: 'name',
          dependsOn: ['spec.region'],
        },
      },
      {
        property: 'spec.secret',
        label: 'Secret',
        dynamicValuesDefinition: {
          operation: 'v1.Secrets.items',
          gqlQuery: 'query ($namespace: String!) { v1 { Secrets(namespace: $namespace) { items { metadata { name } } } } }',
          value: 'metadata.name',
          key: 'metadata.name',
          dependsOn: ['metadata.namespace'],
        },
      },
    ];
    expect(collectDependencyTriggers(fields)).toEqual(
      new Set(['spec.region', 'metadata.namespace']),
    );
  });
});

describe('applyDependencyTriggers', () => {
  const parentChildFields: PlatformMeshFieldDefinition[] = [
    { property: 'metadata.namespace', label: 'Namespace' },
    {
      property: 'spec.secret',
      label: 'Secret',
      dynamicValuesDefinition: {
        operation: 'v1.Secrets.items',
        gqlQuery:
          'query ($namespace: String!) { v1 { Secrets(namespace: $namespace) { items { metadata { name } } } } }',
        value: 'metadata.name',
        key: 'metadata.name',
        dependsOn: ['metadata.namespace'],
      },
    },
  ];

  it('sets validation="onChange" on the trigger field', () => {
    const formFields: FormFieldDefinition[] = [
      { name: 'metadata.namespace' } as FormFieldDefinition,
      { name: 'spec.secret' } as FormFieldDefinition,
    ];
    applyDependencyTriggers(formFields, parentChildFields);
    expect(formFields[0].validation).toBe('onChange');
    expect(formFields[1].validation).toBeUndefined();
  });

  it('is a no-op when there are no triggers', () => {
    const formFields: FormFieldDefinition[] = [
      { name: 'metadata.name' } as FormFieldDefinition,
    ];
    applyDependencyTriggers(formFields, [
      { property: 'metadata.name', label: 'Name' },
    ]);
    expect(formFields[0].validation).toBeUndefined();
  });

  it('returns the same formFields reference for chaining', () => {
    const formFields: FormFieldDefinition[] = [];
    expect(applyDependencyTriggers(formFields, parentChildFields)).toBe(
      formFields,
    );
  });
});
