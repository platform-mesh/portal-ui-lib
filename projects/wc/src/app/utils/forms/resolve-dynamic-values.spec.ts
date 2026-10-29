import {
  ResolveFieldDynamicValuesDeps,
  resolveFieldDynamicValuesResult,
} from './resolve-dynamic-values';
import { PlatformMeshFieldDefinition } from '@platform-mesh/portal-ui-lib/models';
import { ResourceNodeContext } from '@platform-mesh/portal-ui-lib/services';
import { of, throwError } from 'rxjs';

const baseContext = {
  namespaceId: 'ctx-ns',
  resourceDefinition: {
    entityCollection: 'Items',
    entity: 'Item',
    apiGroup: 'g',
    version: 'v1',
    scope: 'Namespaced',
  },
} as unknown as ResourceNodeContext;

const requiredNsQuery =
  'query ($namespace: String!) { v1 { Secrets(namespace: $namespace) { items { metadata { name } } } } }';

const nonNsQuery =
  'query { v1 { Namespaces { items { metadata { name } } } } }';

function makeDeps(
  overrides: Partial<ResolveFieldDynamicValuesDeps> = {},
): ResolveFieldDynamicValuesDeps {
  return {
    list: vi.fn().mockReturnValue(of([{ metadata: { name: 'a' } }])),
    getNamespace: vi.fn().mockReturnValue(undefined),
    handleError: vi.fn(),
    ...overrides,
  };
}

describe('resolveFieldDynamicValuesResult', () => {
  it('returns blocked when the field has no dynamicValuesDefinition', async () => {
    const deps = makeDeps();
    const field: PlatformMeshFieldDefinition = { property: 'x' } as any;
    const result = await resolveFieldDynamicValuesResult(
      field,
      baseContext,
      false,
      {},
      deps,
    );
    expect(result).toEqual({ kind: 'blocked' });
    expect(deps.list).not.toHaveBeenCalled();
  });

  it('resolves {form.*} placeholder into list call variables and maps results', async () => {
    const deps = makeDeps({
      list: vi
        .fn()
        .mockReturnValue(
          of([
            { metadata: { name: 'secret-a' } },
            { metadata: { name: 'secret-b' } },
          ]),
        ),
    });
    const field = {
      dynamicValuesDefinition: {
        operation: 'v1.Secrets.items',
        gqlQuery: requiredNsQuery,
        value: 'metadata.name',
        key: 'metadata.name',
        gqlQueryVariables: { namespace: '{form.metadata.namespace}' },
      },
    } as PlatformMeshFieldDefinition;

    const result = await resolveFieldDynamicValuesResult(
      field,
      baseContext,
      true,
      { 'metadata.namespace': 'injected-ns' },
      deps,
    );

    expect(result).toEqual({
      kind: 'ready',
      values: ['secret-a', 'secret-b'],
    });
    expect(deps.list).toHaveBeenCalledWith(
      'v1.Secrets.items',
      requiredNsQuery,
      baseContext,
      { variables: { namespace: { type: 'String!', value: 'injected-ns' } } },
    );
  });

  it('resolves {context.*} placeholder into list call variables', async () => {
    const deps = makeDeps();
    const field = {
      dynamicValuesDefinition: {
        operation: 'v1.Secrets.items',
        gqlQuery: requiredNsQuery,
        value: 'metadata.name',
        key: 'metadata.name',
        gqlQueryVariables: { namespace: '{context.namespaceId}' },
      },
    } as PlatformMeshFieldDefinition;

    await resolveFieldDynamicValuesResult(field, baseContext, true, {}, deps);

    expect(deps.list).toHaveBeenCalledWith(
      'v1.Secrets.items',
      requiredNsQuery,
      baseContext,
      { variables: { namespace: { type: 'String!', value: 'ctx-ns' } } },
    );
  });

  it('returns blocked when {form.*} namespace placeholder cannot be resolved and no context namespace is available', async () => {
    const deps = makeDeps({
      getNamespace: vi.fn().mockReturnValue(undefined),
    });
    const field = {
      dynamicValuesDefinition: {
        operation: 'v1.Secrets.items',
        gqlQuery: requiredNsQuery,
        value: 'metadata.name',
        key: 'metadata.name',
        gqlQueryVariables: { namespace: '{form.metadata.namespace}' },
      },
    } as PlatformMeshFieldDefinition;

    const result = await resolveFieldDynamicValuesResult(
      field,
      baseContext,
      true,
      {},
      deps,
    );

    expect(result).toEqual({ kind: 'blocked' });
    expect(deps.list).not.toHaveBeenCalled();
  });

  it('returns blocked when {context.*} namespace placeholder cannot be resolved and no context namespace is available', async () => {
    const deps = makeDeps({
      getNamespace: vi.fn().mockReturnValue(undefined),
    });
    const ctx = { resourceDefinition: baseContext.resourceDefinition } as any;
    const field = {
      dynamicValuesDefinition: {
        operation: 'v1.Secrets.items',
        gqlQuery: requiredNsQuery,
        value: 'metadata.name',
        key: 'metadata.name',
        gqlQueryVariables: { namespace: '{context.missing}' },
      },
    } as PlatformMeshFieldDefinition;

    const result = await resolveFieldDynamicValuesResult(
      field,
      ctx,
      true,
      {},
      deps,
    );

    expect(result).toEqual({ kind: 'blocked' });
    expect(deps.list).not.toHaveBeenCalled();
  });

  it('uses the context namespace when the form namespace is unresolved', async () => {
    const deps = makeDeps({
      getNamespace: vi.fn().mockReturnValue('ctx-ns'),
    });
    const field = {
      dynamicValuesDefinition: {
        operation: 'v1.Secrets.items',
        gqlQuery: requiredNsQuery,
        value: 'metadata.name',
        key: 'metadata.name',
        gqlQueryVariables: { namespace: '{form.metadata.namespace}' },
      },
    } as PlatformMeshFieldDefinition;

    await resolveFieldDynamicValuesResult(field, baseContext, true, {}, deps);

    expect(deps.list).toHaveBeenCalledWith(
      'v1.Secrets.items',
      requiredNsQuery,
      baseContext,
      {
        variables: {
          namespace: {
            type: 'String!',
            value: 'ctx-ns',
          },
        },
      },
    );
  });

  it('returns blocked for a query that declares $namespace! when no namespace is available', async () => {
    const deps = makeDeps({
      getNamespace: vi.fn().mockReturnValue(undefined),
    });
    const field = {
      dynamicValuesDefinition: {
        operation: 'v1.Secrets.items',
        gqlQuery: requiredNsQuery,
        value: 'metadata.name',
        key: 'metadata.name',
      },
    } as PlatformMeshFieldDefinition;

    const result = await resolveFieldDynamicValuesResult(
      field,
      baseContext,
      true,
      {},
      deps,
    );

    expect(result).toEqual({ kind: 'blocked' });
    expect(deps.list).not.toHaveBeenCalled();
  });

  it('does not require a namespace for queries that do not declare one', async () => {
    const deps = makeDeps({
      list: vi.fn().mockReturnValue(of([{ metadata: { name: 'default' } }])),
      getNamespace: vi.fn().mockReturnValue(undefined),
    });
    const field = {
      dynamicValuesDefinition: {
        operation: 'v1.Namespaces.items',
        gqlQuery: nonNsQuery,
        value: 'metadata.name',
        key: 'metadata.name',
      },
    } as PlatformMeshFieldDefinition;

    const result = await resolveFieldDynamicValuesResult(
      field,
      baseContext,
      true,
      {},
      deps,
    );

    expect(result).toEqual({ kind: 'ready', values: ['default'] });
    expect(deps.list).toHaveBeenCalledTimes(1);
  });

  it('returns an error result and forwards it to handleError when list fails', async () => {
    const error = new Error('list failed');
    const deps = makeDeps({
      list: vi.fn().mockReturnValue(throwError(() => error)),
      getNamespace: vi.fn().mockReturnValue('ctx-ns'),
    });
    const field = {
      dynamicValuesDefinition: {
        operation: 'v1.Secrets.items',
        gqlQuery: requiredNsQuery,
        value: 'metadata.name',
        key: 'metadata.name',
      },
    } as PlatformMeshFieldDefinition;

    const result = await resolveFieldDynamicValuesResult(
      field,
      baseContext,
      true,
      {},
      deps,
    );

    expect(result).toEqual({ kind: 'error', error });
    expect(deps.handleError).toHaveBeenCalledWith(error);
  });

  it('filters falsy values from the mapped result', async () => {
    const deps = makeDeps({
      list: vi
        .fn()
        .mockReturnValue(
          of([
            { metadata: { name: 'a' } },
            { metadata: { name: '' } },
            { metadata: {} },
            { metadata: { name: 'b' } },
          ]),
        ),
    });
    const field = {
      dynamicValuesDefinition: {
        operation: 'v1.Namespaces.items',
        gqlQuery: nonNsQuery,
        value: 'metadata.name',
        key: 'metadata.name',
      },
    } as PlatformMeshFieldDefinition;

    const result = await resolveFieldDynamicValuesResult(
      field,
      baseContext,
      false,
      {},
      deps,
    );
    expect(result).toEqual({ kind: 'ready', values: ['a', 'b'] });
  });

  it('returns blocked for a query with an unresolved non-namespace form variable', async () => {
    const deps = makeDeps({
      list: vi.fn().mockReturnValue(of([])),
      getNamespace: vi.fn().mockReturnValue('ctx-ns'),
    });
    const field = {
      dynamicValuesDefinition: {
        operation: 'v1.Items.items',
        gqlQuery: nonNsQuery,
        value: 'metadata.name',
        key: 'metadata.name',
        gqlQueryVariables: {
          region: '{form.spec.region}',
          namespace: '{form.metadata.namespace}',
        },
      },
    } as PlatformMeshFieldDefinition;

    const result = await resolveFieldDynamicValuesResult(
      field,
      baseContext,
      true,
      {},
      deps,
    );

    expect(result).toEqual({ kind: 'blocked' });
    expect(deps.list).not.toHaveBeenCalled();
  });

  it('does not call getNamespace when the host flag isNamespaced is false', async () => {
    const deps = makeDeps({ getNamespace: vi.fn() });
    const field = {
      dynamicValuesDefinition: {
        operation: 'v1.Namespaces.items',
        gqlQuery: nonNsQuery,
        value: 'metadata.name',
        key: 'metadata.name',
      },
    } as PlatformMeshFieldDefinition;

    await resolveFieldDynamicValuesResult(field, baseContext, false, {}, deps);

    expect(deps.getNamespace).not.toHaveBeenCalled();
  });

  it('resolves a missing form namespace from context regardless of variable name', async () => {
    const deps = makeDeps({
      getNamespace: vi.fn().mockReturnValue('fixed-ns'),
    });
    const query =
      'query ($selectedNs: String!) { items(namespace: $selectedNs) { name } }';
    const field: PlatformMeshFieldDefinition = {
      property: 'secret',
      dynamicValuesDefinition: {
        operation: 'items',
        gqlQuery: query,
        key: 'name',
        value: 'metadata.name',
        gqlQueryVariables: { selectedNs: '{form.metadata.namespace}' },
      },
    };
    expect(
      await resolveFieldDynamicValuesResult(field, baseContext, true, {}, deps),
    ).toEqual({ kind: 'ready', values: ['a'] });
    expect(deps.list).toHaveBeenCalledWith('items', query, baseContext, {
      variables: { selectedNs: { type: 'String!', value: 'fixed-ns' } },
    });
    vi.mocked(deps.list).mockClear();
    expect(
      await resolveFieldDynamicValuesResult(
        field,
        baseContext,
        true,
        {
          'metadata.namespace': '',
        },
        deps,
      ),
    ).toEqual({ kind: 'blocked' });
    expect(deps.list).not.toHaveBeenCalled();
  });

  it('preserves GraphQL variable types and exact form values including false and zero', async () => {
    const deps = makeDeps();
    const query =
      'query ($limit: Int!, $enabled: Boolean!, $tags: [String!]!, $filter: FilterInput, $label: String) { items { metadata { name } } }';
    const field: PlatformMeshFieldDefinition = {
      property: 'child',
      dynamicValuesDefinition: {
        operation: 'items',
        gqlQuery: query,
        key: 'name',
        value: 'metadata.name',
        gqlQueryVariables: {
          limit: '{form.spec.limit}',
          enabled: '{form.spec.enabled}',
          tags: '{form.spec.tags}',
          filter: '{form.spec.filter}',
          label: 'prefix-{form.spec.limit}',
        },
      },
    };
    await resolveFieldDynamicValuesResult(
      field,
      baseContext,
      false,
      {
        'spec.limit': 0,
        'spec.enabled': false,
        'spec.tags': ['a'],
        'spec.filter': { ready: true },
      },
      deps,
    );
    expect(deps.list).toHaveBeenCalledWith('items', query, baseContext, {
      variables: {
        limit: { type: 'Int!', value: 0 },
        enabled: { type: 'Boolean!', value: false },
        tags: { type: '[String!]!', value: ['a'] },
        filter: { type: 'FilterInput', value: { ready: true } },
        label: { type: 'String', value: 'prefix-0' },
      },
    });
  });

  it('reports invalid query syntax through the error handler', async () => {
    const deps = makeDeps();
    const field: PlatformMeshFieldDefinition = {
      property: 'child',
      dynamicValuesDefinition: {
        operation: 'items',
        gqlQuery: 'invalid',
        key: 'name',
        value: 'name',
      },
    };
    const result = await resolveFieldDynamicValuesResult(
      field,
      baseContext,
      false,
      {},
      deps,
    );
    expect(result.kind).toBe('error');
    expect(deps.handleError).toHaveBeenCalledWith(expect.any(Error));
    expect(deps.list).not.toHaveBeenCalled();
  });
});
