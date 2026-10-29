import {
  applyDependencyTriggers,
  collectDependencyTriggers,
  collectFieldDependencies,
} from './field-dependencies';
import { FormFieldDefinition } from '@openmfp/ngx';
import { PlatformMeshFieldDefinition } from '@platform-mesh/portal-ui-lib/models';

describe('collectFieldDependencies', () => {
  const field = (
    gqlQueryVariables?: Record<string, string>,
  ): PlatformMeshFieldDefinition => ({
    property: 'spec.secret',
    dynamicValuesDefinition: {
      operation: 'items',
      gqlQuery: 'query { items { name } }',
      value: 'name',
      key: 'name',
      gqlQueryVariables,
    },
  });

  it('returns no dependencies without dynamic values or query variables', () => {
    expect(collectFieldDependencies({ property: 'metadata.name' })).toEqual([]);
    expect(collectFieldDependencies(field())).toEqual([]);
    expect(collectFieldDependencies(field({}))).toEqual([]);
  });

  it('uses placeholder properties rather than GraphQL variable names', () => {
    expect(
      collectFieldDependencies(
        field({ selectedNamespace: '{form.metadata.namespace}' }),
      ),
    ).toEqual(['metadata.namespace']);
  });

  it('recognizes properties containing hyphens and slashes', () => {
    expect(
      collectFieldDependencies(
        field({
          label: '{form.metadata.labels.app.kubernetes.io/name}',
          annotation: '{form.metadata.annotations.example.io/my-key}',
        }),
      ),
    ).toEqual([
      'metadata.labels.app.kubernetes.io/name',
      'metadata.annotations.example.io/my-key',
    ]);
  });

  it('collects multiple placeholders within strings and across variables once', () => {
    expect(
      collectFieldDependencies(
        field({
          selector: '{form.spec.region}/{form.spec.zone}/{form.spec.region}',
          namespace: '{form.metadata.namespace}',
          repeated: '{form.spec.zone}',
        }),
      ),
    ).toEqual(['spec.region', 'spec.zone', 'metadata.namespace']);
  });

  it('ignores context placeholders, literal values and incomplete placeholders', () => {
    expect(
      collectFieldDependencies(
        field({
          context: '{context.metadata.namespace}',
          literal: 'form.spec.region',
          empty: '',
          incomplete: '{form.spec.zone',
        }),
      ),
    ).toEqual([]);
  });
});

describe('collectDependencyTriggers', () => {
  it('returns an empty set for an empty fields array', () => {
    expect(collectDependencyTriggers([])).toEqual(new Set());
  });

  it('returns an empty set when no field references form placeholders', () => {
    const fields: PlatformMeshFieldDefinition[] = [
      { property: 'metadata.name', label: 'Name' },
      { property: 'spec.region', label: 'Region' },
    ];
    expect(collectDependencyTriggers(fields)).toEqual(new Set());
  });

  it('returns an empty set when dynamicValuesDefinition has no query variables', () => {
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

  it('returns the single parent name when one field references form placeholders', () => {
    const fields: PlatformMeshFieldDefinition[] = [
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
          gqlQueryVariables: { namespace: '{form.metadata.namespace}' },
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
          gqlQuery:
            'query ($namespace: String!) { v1 { Secrets(namespace: $namespace) { items { metadata { name } } } } }',
          value: 'metadata.name',
          key: 'metadata.name',
          gqlQueryVariables: { namespace: '{form.metadata.namespace}' },
        },
      },
      {
        property: 'spec.secretB',
        label: 'Secret B',
        dynamicValuesDefinition: {
          operation: 'v1.Secrets.items',
          gqlQuery:
            'query ($namespace: String!) { v1 { Secrets(namespace: $namespace) { items { metadata { name } } } } }',
          value: 'metadata.name',
          key: 'metadata.name',
          gqlQueryVariables: { namespace: '{form.metadata.namespace}' },
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
          gqlQueryVariables: { region: '{form.spec.region}' },
        },
      },
      {
        property: 'spec.secret',
        label: 'Secret',
        dynamicValuesDefinition: {
          operation: 'v1.Secrets.items',
          gqlQuery:
            'query ($namespace: String!) { v1 { Secrets(namespace: $namespace) { items { metadata { name } } } } }',
          value: 'metadata.name',
          key: 'metadata.name',
          gqlQueryVariables: { namespace: '{form.metadata.namespace}' },
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
        gqlQueryVariables: { namespace: '{form.metadata.namespace}' },
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
