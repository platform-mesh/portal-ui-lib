import { PlatformMeshFieldDefinition } from '@platform-mesh/portal-ui-lib/models';
import { ResourceNodeContext } from '@platform-mesh/portal-ui-lib/services';
import { of, throwError } from 'rxjs';

import {
  ResolveFieldDynamicValuesDeps,
  resolveFieldDynamicValues,
} from './resolve-dynamic-values';

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

describe('resolveFieldDynamicValues', () => {
  it('returns undefined when the field has no dynamicValuesDefinition', async () => {
    const deps = makeDeps();
    const field: PlatformMeshFieldDefinition = { property: 'x' } as any;
    const result = await resolveFieldDynamicValues(
      field,
      baseContext,
      false,
      {},
      deps,
    );
    expect(result).toBeUndefined();
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

    const result = await resolveFieldDynamicValues(
      field,
      baseContext,
      true,
      { 'metadata.namespace': 'injected-ns' },
      deps,
    );

    expect(result).toEqual(['secret-a', 'secret-b']);
    expect(deps.list).toHaveBeenCalledWith(
      'v1.Secrets.items',
      requiredNsQuery,
      baseContext,
      { variables: { namespace: { type: 'String', value: 'injected-ns' } } },
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

    await resolveFieldDynamicValues(field, baseContext, true, {}, deps);

    expect(deps.list).toHaveBeenCalledWith(
      'v1.Secrets.items',
      requiredNsQuery,
      baseContext,
      { variables: { namespace: { type: 'String', value: 'ctx-ns' } } },
    );
  });

  it('skips when {form.*} namespace placeholder cannot be resolved and no context namespace is available', async () => {
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

    const result = await resolveFieldDynamicValues(
      field,
      baseContext,
      true,
      {},
      deps,
    );

    expect(result).toBeUndefined();
    expect(deps.list).not.toHaveBeenCalled();
  });

  it('skips when {context.*} namespace placeholder cannot be resolved and no context namespace is available', async () => {
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

    const result = await resolveFieldDynamicValues(field, ctx, true, {}, deps);

    expect(result).toBeUndefined();
    expect(deps.list).not.toHaveBeenCalled();
  });

  it('falls back to the context namespace for the skip-check when the placeholder is unresolved but one is available', async () => {
    // The namespace fallback is used ONLY for the isMissingRequiredNamespace
    // check — the raw placeholder is still passed through in variables. The
    // ResourceService injects the context namespace downstream.
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

    await resolveFieldDynamicValues(field, baseContext, true, {}, deps);

    // list IS called (skip-check passed via fallback)
    expect(deps.list).toHaveBeenCalledWith(
      'v1.Secrets.items',
      requiredNsQuery,
      baseContext,
      {
        variables: {
          namespace: {
            type: 'String',
            value: '{form.metadata.namespace}',
          },
        },
      },
    );
  });

  it('skips a query that declares $namespace! when no namespace is available', async () => {
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

    const result = await resolveFieldDynamicValues(
      field,
      baseContext,
      true,
      {},
      deps,
    );

    expect(result).toBeUndefined();
    expect(deps.list).not.toHaveBeenCalled();
  });

  it('does not require a namespace for queries that do not declare one', async () => {
    const deps = makeDeps({
      list: vi
        .fn()
        .mockReturnValue(of([{ metadata: { name: 'default' } }])),
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

    const result = await resolveFieldDynamicValues(
      field,
      baseContext,
      true,
      {},
      deps,
    );

    expect(result).toEqual(['default']);
    expect(deps.list).toHaveBeenCalledTimes(1);
  });

  it('forwards errors to deps.handleError and returns undefined', async () => {
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

    const result = await resolveFieldDynamicValues(
      field,
      baseContext,
      true,
      {},
      deps,
    );

    expect(result).toBeUndefined();
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

    const result = await resolveFieldDynamicValues(
      field,
      baseContext,
      false,
      {},
      deps,
    );
    expect(result).toEqual(['a', 'b']);
  });

  it('passes a non-namespace {form.*} variable verbatim (documented limitation)', async () => {
    // The namespace fallback is for the skip-check only — it does NOT rewrite
    // variables. Unresolved {form.*} literals (namespace or otherwise) pass
    // through to the gateway as-is. This test pins current behavior so future
    // expansion is intentional.
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

    await resolveFieldDynamicValues(field, baseContext, true, {}, deps);

    expect(deps.list).toHaveBeenCalledWith(
      'v1.Items.items',
      nonNsQuery,
      baseContext,
      {
        variables: {
          region: { type: 'String', value: '{form.spec.region}' },
          namespace: { type: 'String', value: '{form.metadata.namespace}' },
        },
      },
    );
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

    await resolveFieldDynamicValues(field, baseContext, false, {}, deps);

    expect(deps.getNamespace).not.toHaveBeenCalled();
  });
});
