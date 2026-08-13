import { permissionKey } from './instance-permission-key';

describe('permissionKey', () => {
  it('joins resource, namespace and name with "/"', () => {
    expect(
      permissionKey({ resource: 'pods', namespace: 'default', name: 'p1' }),
    ).toBe('pods/default/p1');
  });

  it('omits namespace when it is undefined', () => {
    expect(permissionKey({ resource: 'clusters', name: 'c1' })).toBe(
      'clusters/c1',
    );
  });

  it('omits name when it is undefined', () => {
    expect(permissionKey({ resource: 'clusters', namespace: 'ns' })).toBe(
      'clusters/ns',
    );
  });

  it('returns only the resource when namespace and name are absent', () => {
    expect(permissionKey({ resource: 'clusters' })).toBe('clusters');
  });

  it('returns an empty string when no fields are provided', () => {
    expect(permissionKey({})).toBe('');
  });

  it('filters out empty-string fields (falsy) rather than keeping empty segments', () => {
    expect(
      permissionKey({ resource: 'pods', namespace: '', name: 'p1' }),
    ).toBe('pods/p1');
  });

  it('preserves the resource/namespace/name ordering', () => {
    expect(
      permissionKey({ name: 'p1', resource: 'pods', namespace: 'ns' }),
    ).toBe('pods/ns/p1');
  });
});
