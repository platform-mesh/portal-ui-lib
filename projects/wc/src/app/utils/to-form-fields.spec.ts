import { PlatformMeshFieldDefinition } from '@platform-mesh/portal-ui-lib/models';

import {
  buildInitialValues,
  flattenFieldTree,
  toFormFields,
  toFormFieldsAsync,
} from './to-form-fields';

/**
 * Casts a literal array of partial field definitions to
 * `PlatformMeshFieldDefinition[]`. The upstream type intersects
 * `Omit<FormFieldDefinition, 'name'>` with `TableFieldDefinition`, whose
 * declared `collection?` element type still requires `name` — irrelevant
 * for these runtime tests, so we sidestep the compile-time noise here.
 */
const defs = (items: readonly unknown[]): PlatformMeshFieldDefinition[] =>
  items as PlatformMeshFieldDefinition[];

// ---------------------------------------------------------------------------
// flattenFieldTree
// ---------------------------------------------------------------------------

describe('flattenFieldTree', () => {
  it('returns [] for undefined / empty input', () => {
    expect(flattenFieldTree(undefined)).toEqual([]);
    expect(flattenFieldTree([])).toEqual([]);
  });

  it('passes scalar fields through untouched', () => {
    const fields = defs([
      { property: 'metadata.name' },
      { property: 'spec.type' },
    ]);
    expect(flattenFieldTree(fields)).toEqual(fields);
  });

  it('replaces a collection field with its sub-fields', () => {
    const fields = defs([
      { property: 'metadata.name' },
      {
        label: 'Conditions',
        property: 'status.conditions',
        propertyCollection: [
          { property: 'status.conditions.type' },
          { property: 'status.conditions.status' },
        ],
      },
    ]);

    // The collection wrapper itself is dropped — the parent path is only a
    // segment and can't be selected without its scalar leaves. Sub-fields
    // are hoisted into the flat list with their original `property` values.
    expect(flattenFieldTree(fields)).toEqual([
      { property: 'metadata.name' },
      { property: 'status.conditions.type' },
      { property: 'status.conditions.status' },
    ]);
  });

  it('recurses into nested collections', () => {
    const fields = defs([
      {
        property: 'spec.stages',
        propertyCollection: [
          { property: 'spec.stages.name' },
          {
            property: 'spec.stages.steps',
            propertyCollection: [
              { property: 'spec.stages.steps.command' },
              { property: 'spec.stages.steps.image' },
            ],
          },
        ],
      },
    ]);

    expect(flattenFieldTree(fields)).toEqual([
      { property: 'spec.stages.name' },
      { property: 'spec.stages.steps.command' },
      { property: 'spec.stages.steps.image' },
    ]);
  });
});

// ---------------------------------------------------------------------------
// toFormFields
// ---------------------------------------------------------------------------

describe('toFormFields', () => {
  it('returns [] for undefined / empty input', () => {
    expect(toFormFields(undefined)).toEqual([]);
    expect(toFormFields([])).toEqual([]);
  });

  it('maps a scalar field: property → name, copies label / required', () => {
    const [formField] = toFormFields(
      defs([{ property: 'spec.displayName', label: 'Display Name', required: false }]),
    );
    expect(formField).toEqual({
      name: 'spec.displayName',
      label: 'Display Name',
      required: false,
    });
  });

  it('copies non-empty `values` and preserves order', () => {
    const [formField] = toFormFields(
      defs([{ property: 'spec.type', values: ['account', 'namespace'] }]),
    );
    expect(formField.values).toEqual(['account', 'namespace']);
  });

  it('sets validation onChange for required fields', () => {
    const [formField] = toFormFields(
      defs([{ property: 'spec.displayName', required: true }]),
    );
    expect(formField.validation).toBe('onChange');
  });

  it('sets validation onChange for metadata.name even when not required', () => {
    const [formField] = toFormFields(defs([{ property: 'metadata.name' }]));
    expect(formField.validation).toBe('onChange');
  });

  it('leaves validation unset when field is neither required nor metadata.name', () => {
    const [formField] = toFormFields(defs([{ property: 'spec.displayName' }]));
    expect(formField.validation).toBeUndefined();
  });

  it('leaves disabled unset when no predicate is supplied', () => {
    const [formField] = toFormFields(defs([{ property: 'spec.displayName' }]));
    expect(formField.disabled).toBeUndefined();
  });

  it('writes disabled: true / false based on the predicate', () => {
    const [name, displayName] = toFormFields(
      defs([{ property: 'metadata.name' }, { property: 'spec.displayName' }]),
      { disabled: (f) => f.property === 'metadata.name' },
    );
    expect(name.disabled).toBe(true);
    expect(displayName.disabled).toBe(false);
  });

  describe('collections', () => {
    it('promotes a collection field to a nested form field, using property as name', () => {
      const [formField] = toFormFields(
        defs([
          {
            label: 'Conditions',
            property: 'status.conditions',
            propertyCollection: [{ property: 'status.conditions.type', label: 'Type' }],
          },
        ]),
      );

      expect(formField.name).toBe('status.conditions');
      expect(formField.label).toBe('Conditions');
      expect(formField.propertyCollection).toBeDefined();
    });

    it('strips the parent collection path from sub-field names when they start with it', () => {
      const [formField] = toFormFields(
        defs([
          {
            property: 'status.conditions',
            propertyCollection: [
              { property: 'status.conditions.type', label: 'Type' },
              { property: 'status.conditions.status', label: 'Status' },
            ],
          },
        ]),
      );

      expect(formField.propertyCollection?.map((f) => f.name)).toEqual([
        'type',
        'status',
      ]);
    });

    it('leaves sub-field names unchanged when they do not start with the parent path', () => {
      // Author style B: sub-field paths are already relative to the entry.
      const [formField] = toFormFields(
        defs([
          {
            property: 'status.conditions',
            propertyCollection: [
              { property: 'type', label: 'Type' },
              { property: 'status', label: 'Status' },
            ],
          },
        ]),
      );

      expect(formField.propertyCollection?.map((f) => f.name)).toEqual([
        'type',
        'status',
      ]);
    });

    it('recursively promotes nested collections', () => {
      const [formField] = toFormFields(
        defs([
          {
            property: 'spec.stages',
            propertyCollection: [
              { property: 'spec.stages.name', label: 'Stage name' },
              {
                property: 'spec.stages.steps',
                propertyCollection: [
                  { property: 'spec.stages.steps.command', label: 'Command' },
                ],
              },
            ],
          },
        ]),
      );

      const stage = formField.propertyCollection?.[0];
      const steps = formField.propertyCollection?.[1];
      expect(stage?.name).toBe('name');
      expect(steps?.name).toBe('steps');
      expect(steps?.propertyCollection?.[0].name).toBe('command');
    });

    it('does not apply the disabled predicate result to sub-fields by parent property', () => {
      // The predicate receives *each* raw definition — the caller decides
      // per-field. Here we make the predicate `true` only for the outer
      // collection; sub-fields are their own definitions and should not
      // inherit the flag automatically.
      const [formField] = toFormFields(
        defs([
          {
            property: 'status.conditions',
            propertyCollection: [{ property: 'status.conditions.type' }],
          },
        ]),
        {
          disabled: (f) => f.property === 'status.conditions',
        },
      );

      expect(formField.disabled).toBe(true);
      expect(formField.propertyCollection?.[0].disabled).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// toFormFieldsAsync
// ---------------------------------------------------------------------------

describe('toFormFieldsAsync', () => {
  it('falls back to the sync mapping when no resolver is provided', async () => {
    const fields = defs([{ property: 'metadata.name' }]);
    await expect(toFormFieldsAsync(fields)).resolves.toEqual(
      toFormFields(fields),
    );
  });

  it('leaves fields alone when the resolver returns undefined', async () => {
    const [formField] = await toFormFieldsAsync(
      defs([{ property: 'spec.type', values: ['account'] }]),
      { resolveDynamicValues: async () => undefined },
    );
    // No dynamicValuesDefinition on the field → resolver isn't called
    // anyway, but the sanity check is that the static `values` are kept.
    expect(formField.values).toEqual(['account']);
  });

  it('overwrites `values` from the resolver only for fields with dynamicValuesDefinition', async () => {
    const fields = defs([
      {
        property: 'spec.namespace',
        dynamicValuesDefinition: {
          operation: 'v1.Namespaces.items',
          gqlQuery: '',
          value: 'metadata.name',
          key: 'metadata.name',
        },
      },
      { property: 'spec.type', values: ['static-1'] },
    ]);

    const [nsField, typeField] = await toFormFieldsAsync(fields, {
      resolveDynamicValues: async (field) =>
        field.property === 'spec.namespace' ? ['dev', 'prod'] : undefined,
    });

    expect(nsField.values).toEqual(['dev', 'prod']);
    // Static values on a field without a dynamic definition are untouched.
    expect(typeField.values).toEqual(['static-1']);
  });

  it('resolves nested collection sub-fields in parallel', async () => {
    const calls: string[] = [];
    const fields = defs([
      {
        property: 'spec.stages',
        propertyCollection: [
          {
            property: 'spec.stages.name',
            dynamicValuesDefinition: {
              operation: 'op',
              gqlQuery: '',
              value: 'x',
              key: 'x',
            },
          },
        ],
      },
    ]);

    const [formField] = await toFormFieldsAsync(fields, {
      resolveDynamicValues: async (field) => {
        calls.push(field.property as string);
        return ['a', 'b'];
      },
    });

    expect(calls).toEqual(['spec.stages.name']);
    expect(formField.propertyCollection?.[0].values).toEqual(['a', 'b']);
    // Prefix-strip is still applied inside the async path.
    expect(formField.propertyCollection?.[0].name).toBe('name');
  });

  it('propagates resolver rejections', async () => {
    const promise = toFormFieldsAsync(
      defs([
        {
          property: 'spec.namespace',
          dynamicValuesDefinition: {
            operation: 'op',
            gqlQuery: '',
            value: 'x',
            key: 'x',
          },
        },
      ]),
      {
        resolveDynamicValues: async () => {
          throw new Error('resolver blew up');
        },
      },
    );
    await expect(promise).rejects.toThrow('resolver blew up');
  });
});

// ---------------------------------------------------------------------------
// buildInitialValues
// ---------------------------------------------------------------------------

describe('buildInitialValues', () => {
  it('returns {} for an undefined resource', () => {
    expect(
      buildInitialValues(defs([{ property: 'metadata.name' }]), undefined),
    ).toEqual({});
  });

  it('reads scalar values by dotted path and keys them by the same path', () => {
    const result = buildInitialValues(
      defs([{ property: 'metadata.name' }, { property: 'spec.displayName' }]),
      {
        metadata: { name: 'a4' },
        spec: { displayName: 'Test' },
      },
    );
    expect(result).toEqual({
      'metadata.name': 'a4',
      'spec.displayName': 'Test',
    });
  });

  it('defaults missing scalar paths to an empty string', () => {
    const result = buildInitialValues(
      defs([{ property: 'spec.notThere' }]),
      { spec: {} },
    );
    expect(result).toEqual({ 'spec.notThere': '' });
  });

  it('ignores scalar fields whose property is not a string', () => {
    // Array-valued `property` is used for tables (multi-column paths) — it
    // is not a valid form-field key. Skipping keeps the output clean.
    const result = buildInitialValues(
      defs([{ property: ['a', 'b'] }]),
      { a: 1, b: 2 },
    );
    expect(result).toEqual({});
  });

  describe('collections', () => {
    it('reads the array at property and maps entries via sub-field paths', () => {
      const result = buildInitialValues(
        defs([
          {
            property: 'status.conditions',
            propertyCollection: [
              { property: 'status.conditions.type' },
              { property: 'status.conditions.status' },
              { property: 'status.conditions.reason' },
            ],
          },
        ]),
        {
          status: {
            conditions: [
              { type: 'Ready', status: 'True', reason: 'OK' },
              { type: 'Progressing', status: 'False', reason: 'Retry' },
            ],
          },
        },
      );

      // Sub-field keys are stripped of the parent prefix, so entries land
      // as {type, status, reason} — the shape the collection editor expects.
      expect(result).toEqual({
        'status.conditions': [
          { type: 'Ready', status: 'True', reason: 'OK' },
          { type: 'Progressing', status: 'False', reason: 'Retry' },
        ],
      });
    });

    it('falls back to the absolute path inside an entry when the stripped key is missing', () => {
      // Simulates a backend that returned entries keyed by full dotted paths
      // (unusual but possible). We should still hydrate correctly.
      const result = buildInitialValues(
        defs([
          {
            property: 'status.conditions',
            propertyCollection: [{ property: 'status.conditions.type' }],
          },
        ]),
        {
          status: {
            conditions: [{ 'status.conditions.type': 'Ready' }],
          },
        } as Record<string, unknown>,
      );
      expect(result).toEqual({
        'status.conditions': [{ type: 'Ready' }],
      });
    });

    it('defaults missing sub-field values inside an entry to an empty string', () => {
      const result = buildInitialValues(
        defs([
          {
            property: 'status.conditions',
            propertyCollection: [
              { property: 'status.conditions.type' },
              { property: 'status.conditions.reason' },
            ],
          },
        ]),
        { status: { conditions: [{ type: 'Ready' }] } },
      );
      expect(result).toEqual({
        'status.conditions': [{ type: 'Ready', reason: '' }],
      });
    });

    it('returns an empty array when the collection path is missing on the resource', () => {
      const result = buildInitialValues(
        defs([
          {
            property: 'status.conditions',
            propertyCollection: [{ property: 'status.conditions.type' }],
          },
        ]),
        { spec: {} },
      );
      expect(result).toEqual({ 'status.conditions': [] });
    });

    it('returns an empty array when the resource has a non-array at the collection path', () => {
      const result = buildInitialValues(
        defs([
          {
            property: 'status.conditions',
            propertyCollection: [{ property: 'status.conditions.type' }],
          },
        ]),
        { status: { conditions: 'oops' } },
      );
      expect(result).toEqual({ 'status.conditions': [] });
    });

    it('recurses into nested collections', () => {
      const result = buildInitialValues(
        defs([
          {
            property: 'spec.stages',
            propertyCollection: [
              { property: 'spec.stages.name' },
              {
                property: 'spec.stages.steps',
                propertyCollection: [{ property: 'spec.stages.steps.command' }],
              },
            ],
          },
        ]),
        {
          spec: {
            stages: [
              {
                name: 'build',
                steps: [{ command: 'npm ci' }, { command: 'npm run build' }],
              },
              { name: 'deploy', steps: [{ command: 'kubectl apply' }] },
            ],
          },
        },
      );

      expect(result).toEqual({
        'spec.stages': [
          {
            name: 'build',
            steps: [{ command: 'npm ci' }, { command: 'npm run build' }],
          },
          { name: 'deploy', steps: [{ command: 'kubectl apply' }] },
        ],
      });
    });

    it('handles collection sub-fields authored with relative paths', () => {
      // Same output as the absolute-path style, so YAML authors can pick
      // either without changing the emitted payload.
      const result = buildInitialValues(
        defs([
          {
            property: 'status.conditions',
            propertyCollection: [{ property: 'type' }, { property: 'status' }],
          },
        ]),
        {
          status: {
            conditions: [{ type: 'Ready', status: 'True' }],
          },
        },
      );
      expect(result).toEqual({
        'status.conditions': [{ type: 'Ready', status: 'True' }],
      });
    });
  });
});
