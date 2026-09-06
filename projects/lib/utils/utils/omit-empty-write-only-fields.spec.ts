import { PlatformMeshFieldDefinition } from '@platform-mesh/portal-ui-lib/models';
import { omitEmptyWriteOnlyFields } from './omit-empty-write-only-fields';

const defs = (items: readonly unknown[]): PlatformMeshFieldDefinition[] =>
  items as PlatformMeshFieldDefinition[];

describe('omitEmptyWriteOnlyFields', () => {
  const fields = defs([
    { property: 'metadata.name' },
    {
      property: 'spec.oidc.clientSecret',
      uiSettings: { writeOnly: true },
    },
  ]);

  it('removes empty write-only fields', () => {
    const input = {
      metadata: { name: 'idp' },
      spec: { oidc: { clientSecret: '' } },
    };
    expect(omitEmptyWriteOnlyFields(input, fields)).toEqual({
      metadata: { name: 'idp' },
    });
  });

  it('keeps non-empty write-only fields', () => {
    const input = {
      metadata: { name: 'idp' },
      spec: { oidc: { clientSecret: 'secret' } },
    };
    expect(omitEmptyWriteOnlyFields(input, fields)).toEqual(input);
  });

  it('does not mutate the original resource', () => {
    const input = {
      metadata: { name: 'idp' },
      spec: { oidc: { clientSecret: '' } },
    };
    omitEmptyWriteOnlyFields(input, fields);
    expect(input.spec.oidc.clientSecret).toBe('');
  });

  it('removes null write-only fields and prunes empty parent objects', () => {
    const input = {
      metadata: { name: 'idp' },
      spec: { oidc: { clientSecret: null, clientId: 'id' } },
    };
    expect(omitEmptyWriteOnlyFields(input, fields)).toEqual({
      metadata: { name: 'idp' },
      spec: { oidc: { clientId: 'id' } },
    });
  });
});
