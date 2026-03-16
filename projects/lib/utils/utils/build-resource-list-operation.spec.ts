import { buildResourcePath } from './build-resource-list-operation';

describe('buildResourceOperation', () => {
  it('should build versioned operation', () => {
    expect(
      buildResourcePath({
        apiGroup: 'core.platform-mesh.io',
        version: 'v1alpha1',
        entity: 'myresources',
      }),
    ).toBe('core.platform-mesh.io_v1alpha1_myresources');
  });

  it('should build unversioned operation', () => {
    expect(
      buildResourcePath({
        apiGroup: 'core.platform-mesh.io',
        version: undefined,
        entity: 'accounts',
      }),
    ).toBe('core.platform-mesh.io_accounts');
  });

  it('should build operation with custom separator', () => {
    expect(
      buildResourcePath(
        {
          apiGroup: 'core.platform-mesh.io',
          entity: 'accounts',
        },
        '.',
      ),
    ).toBe('core.platform-mesh.io.accounts');
  });
});
