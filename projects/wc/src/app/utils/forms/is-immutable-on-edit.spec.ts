import { isImmutableOnEdit } from './is-immutable-on-edit';

describe('isImmutableOnEdit', () => {
  it('returns true for metadata.name, spec.alias, spec.type, and metadata.namespace', () => {
    expect(isImmutableOnEdit({ property: 'metadata.name' })).toBe(true);
    expect(isImmutableOnEdit({ property: 'spec.alias' })).toBe(true);
    expect(isImmutableOnEdit({ property: 'spec.type' })).toBe(true);
    expect(isImmutableOnEdit({ property: 'metadata.namespace' })).toBe(true);
  });

  it('returns false for editable fields', () => {
    expect(isImmutableOnEdit({ property: 'spec.displayName' })).toBe(false);
    expect(isImmutableOnEdit({ property: 'spec.oidc.clientSecret' })).toBe(
      false,
    );
  });
});
