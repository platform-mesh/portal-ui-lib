import type { DynamicValuesResult } from './form-dependency-controller';
import {
  buildResourceFormFields,
  createDynamicValuesResolver,
} from './resolve-form-field-values';
import { PlatformMeshFieldDefinition } from '@platform-mesh/portal-ui-lib/models';

function field(
  property: string,
  dependencies?: string[],
  extra: Partial<PlatformMeshFieldDefinition> = {},
): PlatformMeshFieldDefinition {
  return {
    property,
    label: property,
    ...extra,
    ...(dependencies
      ? {
          dynamicValuesDefinition: {
            operation: 'op',
            gqlQuery: 'q',
            value: 'metadata.name',
            key: 'metadata.name',
            gqlQueryVariables: Object.fromEntries(
              dependencies.map((parent) => [parent, `{form.${parent}}`]),
            ),
          },
        }
      : {}),
  } as PlatformMeshFieldDefinition;
}

const ready = (values: string[]): DynamicValuesResult => ({
  kind: 'ready',
  values,
});
const blocked: DynamicValuesResult = { kind: 'blocked' };
const errored: DynamicValuesResult = { kind: 'error', error: new Error('x') };

describe('createDynamicValuesResolver', () => {
  it('short-circuits to [] when any parent in dependencies is null', async () => {
    const resolveResult = vi.fn();
    const resolver = createDynamicValuesResolver(resolveResult);

    const result = await resolver(field('child', ['parent']), {
      parent: null,
    });

    expect(result).toEqual([]);
    expect(resolveResult).not.toHaveBeenCalled();
  });

  it('short-circuits to [] when any parent in dependencies is undefined', async () => {
    const resolveResult = vi.fn();
    const resolver = createDynamicValuesResolver(resolveResult);

    const result = await resolver(field('child', ['parent']), {});

    expect(result).toEqual([]);
    expect(resolveResult).not.toHaveBeenCalled();
  });

  it('short-circuits to [] when any parent in dependencies is empty string', async () => {
    const resolveResult = vi.fn();
    const resolver = createDynamicValuesResolver(resolveResult);

    const result = await resolver(field('child', ['parent']), { parent: '' });

    expect(result).toEqual([]);
    expect(resolveResult).not.toHaveBeenCalled();
  });

  it('short-circuits when ANY of multiple parents is empty, even if others are set', async () => {
    const resolveResult = vi.fn();
    const resolver = createDynamicValuesResolver(resolveResult);

    const result = await resolver(field('child', ['a', 'b']), {
      a: 'has-value',
      b: '',
    });

    expect(result).toEqual([]);
    expect(resolveResult).not.toHaveBeenCalled();
  });

  it('returns ready values when all parents are set and resolver reports ready', async () => {
    const resolveResult = vi.fn().mockResolvedValue(ready(['one', 'two']));
    const resolver = createDynamicValuesResolver(resolveResult);

    const result = await resolver(field('child', ['parent']), {
      parent: 'ns-1',
    });

    expect(result).toEqual(['one', 'two']);
    expect(resolveResult).toHaveBeenCalledWith(
      expect.objectContaining({ property: 'child' }),
      { parent: 'ns-1' },
    );
  });

  it('returns [] when dependent field resolves to blocked', async () => {
    const resolveResult = vi.fn().mockResolvedValue(blocked);
    const resolver = createDynamicValuesResolver(resolveResult);

    const result = await resolver(field('child', ['parent']), {
      parent: 'ns-1',
    });

    expect(result).toEqual([]);
  });

  it('returns [] when dependent field resolves to error', async () => {
    const resolveResult = vi.fn().mockResolvedValue(errored);
    const resolver = createDynamicValuesResolver(resolveResult);

    const result = await resolver(field('child', ['parent']), {
      parent: 'ns-1',
    });

    expect(result).toEqual([]);
  });

  it('returns undefined (falls back to static values) when a field without dependencies is blocked', async () => {
    const resolveResult = vi.fn().mockResolvedValue(blocked);
    const resolver = createDynamicValuesResolver(resolveResult);

    const result = await resolver(field('standalone', undefined), {});

    expect(result).toBeUndefined();
  });

  it('returns undefined when a field without dependencies errors', async () => {
    const resolveResult = vi.fn().mockResolvedValue(errored);
    const resolver = createDynamicValuesResolver(resolveResult);

    const result = await resolver(field('standalone', undefined), {});

    expect(result).toBeUndefined();
  });

  it('passes an empty formValues object to resolveResult when none is given', async () => {
    const resolveResult = vi.fn().mockResolvedValue(ready([]));
    const resolver = createDynamicValuesResolver(resolveResult);

    await resolver(field('standalone', undefined), undefined as any);

    expect(resolveResult).toHaveBeenCalledWith(expect.anything(), {});
  });
});

describe('buildResourceFormFields', () => {
  it('returns a FormFieldDefinition for each input field', async () => {
    const fields: PlatformMeshFieldDefinition[] = [
      field('metadata.name'),
      field('spec.region'),
    ];

    const formFields = await buildResourceFormFields(
      fields,
      {},
      { editMode: false, resolveResult: vi.fn() },
    );

    expect(formFields).toHaveLength(2);
    expect(formFields.map((f) => f.name)).toEqual([
      'metadata.name',
      'spec.region',
    ]);
  });

  it('applies dependency triggers so parent fields get validation="onChange"', async () => {
    const fields: PlatformMeshFieldDefinition[] = [
      field('metadata.namespace'),
      field('spec.secret', ['metadata.namespace']),
    ];

    const formFields = await buildResourceFormFields(
      fields,
      {},
      {
        editMode: false,
        resolveResult: vi.fn().mockResolvedValue(ready([])),
      },
    );

    const parent = formFields.find((f) => f.name === 'metadata.namespace')!;
    const child = formFields.find((f) => f.name === 'spec.secret')!;
    expect(parent.validation).toBe('onChange');
    expect(child.validation).toBeUndefined();
  });

  it('populates dependent-field values with the resolved list when the parent is set', async () => {
    const fields: PlatformMeshFieldDefinition[] = [
      field('metadata.namespace'),
      field('spec.secret', ['metadata.namespace']),
    ];

    const formFields = await buildResourceFormFields(
      fields,
      { 'metadata.namespace': 'ns-1' },
      {
        editMode: false,
        resolveResult: vi.fn().mockResolvedValue(ready(['s-a', 's-b'])),
      },
    );

    const child = formFields.find((f) => f.name === 'spec.secret')!;
    expect(child.values).toEqual(['s-a', 's-b']);
  });

  it('leaves dependent-field values as [] when the parent is empty (no resolver call)', async () => {
    const resolveResult = vi.fn();
    const fields: PlatformMeshFieldDefinition[] = [
      field('metadata.namespace'),
      field('spec.secret', ['metadata.namespace']),
    ];

    const formFields = await buildResourceFormFields(
      fields,
      {},
      { editMode: false, resolveResult },
    );

    const child = formFields.find((f) => f.name === 'spec.secret')!;
    expect(child.values).toEqual([]);
    // Only the standalone namespace field (if its own definition had been
    // dynamic) would have reached the resolver — here the parent has no
    // dynamicValuesDefinition, so nothing calls through.
    expect(resolveResult).not.toHaveBeenCalled();
  });

  it('marks every field disabled in edit mode when the field is immutable-on-edit', async () => {
    const fields: PlatformMeshFieldDefinition[] = [
      field('metadata.name', undefined, { required: true }),
    ];

    const formFields = await buildResourceFormFields(
      fields,
      {},
      { editMode: true, resolveResult: vi.fn() },
    );

    // metadata.name is immutable-on-edit per field-definition.utils; this
    // asserts the shared disabled policy from the helper is wired up.
    expect(formFields[0].disabled).toBe(true);
  });

  it('does not mark immutable-on-edit fields disabled in create mode', async () => {
    const fields: PlatformMeshFieldDefinition[] = [
      field('metadata.name', undefined, { required: true }),
    ];

    const formFields = await buildResourceFormFields(
      fields,
      {},
      { editMode: false, resolveResult: vi.fn() },
    );

    expect(formFields[0].disabled).toBe(false);
  });

  it('returns an empty array when given no fields', async () => {
    const formFields = await buildResourceFormFields(
      [],
      {},
      {
        editMode: false,
        resolveResult: vi.fn(),
      },
    );

    expect(formFields).toEqual([]);
  });
});
