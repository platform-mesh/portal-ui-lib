import { buildResourcePath } from './build-resource-list-operation';

describe('buildResourceOperation', () => {
  it('should build versioned operation', () => {
    expect(
      buildResourcePath({
        group: 'core.platform-mesh.io',
        version: 'v1alpha1',
        kind: 'myresources',
      }),
    ).toBe('core.platform-mesh.io_v1alpha1_myresources');
  });

  it('should build unversioned operation', () => {
    expect(
      buildResourcePath({
        group: 'core.platform-mesh.io',
        version: undefined,
        kind: 'accounts',
      }),
    ).toBe('core.platform-mesh.io_accounts');
  });

  it('should build operation with custom separator', () => {
    expect(
      buildResourcePath({
        group: 'core.platform-mesh.io',
        kind: 'accounts',
      }, '.'),
    ).toBe('core.platform-mesh.io.accounts');
  });
});
