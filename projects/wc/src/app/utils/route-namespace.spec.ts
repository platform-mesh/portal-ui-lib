import {
  isMissingRequiredNamespace,
  withRouteNamespace,
} from './route-namespace';

describe('withRouteNamespace', () => {
  const namespacedContext = (overrides: object = {}): any => ({
    resourceDefinition: { scope: 'Namespaced' },
    ...overrides,
  });

  it('uses the route namespace when the selection resolves none (-all-)', () => {
    const context = namespacedContext();

    const result = withRouteNamespace(context, undefined, {
      accountId: 'demo',
      namespaceId: 'default',
    });

    expect(result).toEqual({ ...context, namespaceId: 'default' });
    expect(context.namespaceId).toBeUndefined();
  });

  it('keeps a namespace that already resolves, so a concrete selection wins', () => {
    const context = namespacedContext({ namespaceId: 'team-b' });

    expect(
      withRouteNamespace(context, 'team-b', { namespaceId: 'default' }),
    ).toBe(context);
  });

  it('keeps the context for cluster-scoped resources', () => {
    const context: any = { resourceDefinition: { scope: 'Cluster' } };

    expect(
      withRouteNamespace(context, undefined, { namespaceId: 'default' }),
    ).toBe(context);
  });

  it('keeps the context when the route has no namespace', () => {
    const context = namespacedContext();

    expect(withRouteNamespace(context, undefined, { accountId: 'demo' })).toBe(
      context,
    );
  });

  it('does not adopt the -all- sentinel from the route', () => {
    const context = namespacedContext();

    expect(
      withRouteNamespace(context, undefined, { namespaceId: '-all-' }),
    ).toBe(context);
  });

  it('keeps the context without path params', () => {
    const context = namespacedContext();

    expect(withRouteNamespace(context, undefined, undefined)).toBe(context);
  });
});

describe('isMissingRequiredNamespace', () => {
  const requiredQuery =
    'query ($namespace: String!) { v1 { Secrets(namespace: $namespace) { items { metadata { name } } } } }';

  it('is true for a required $namespace without a namespace', () => {
    expect(isMissingRequiredNamespace(requiredQuery, undefined)).toBe(true);
    expect(isMissingRequiredNamespace(requiredQuery, '')).toBe(true);
  });

  it('accepts whitespace around the variable type', () => {
    expect(
      isMissingRequiredNamespace(
        'query ($name: String, $namespace : String !) { a }',
        undefined,
      ),
    ).toBe(true);
  });

  it('is false when a namespace is available', () => {
    expect(isMissingRequiredNamespace(requiredQuery, 'default')).toBe(false);
  });

  it('is false for an optional $namespace', () => {
    expect(
      isMissingRequiredNamespace(
        'query ($namespace: String) { v1 { Secrets(namespace: $namespace) { items { metadata { name } } } } }',
        undefined,
      ),
    ).toBe(false);
  });

  it('is false for a query without $namespace', () => {
    expect(
      isMissingRequiredNamespace(
        'query { v1 { Namespaces { items { metadata { name } } } } }',
        undefined,
      ),
    ).toBe(false);
  });

  it('is false for a non-string query', () => {
    expect(isMissingRequiredNamespace(undefined, undefined)).toBe(false);
    expect(isMissingRequiredNamespace(['metadata.name'], undefined)).toBe(
      false,
    );
  });
});
