import { PlatformMeshFieldDefinition } from '@platform-mesh/portal-ui-lib/models';
import { flattenFieldTree } from './flatten-field-tree';

const defs = (items: readonly unknown[]): PlatformMeshFieldDefinition[] =>
  items as PlatformMeshFieldDefinition[];

describe('flattenFieldTree', () => {
  it('returns an empty array for undefined or empty input', () => {
    expect(flattenFieldTree(undefined)).toEqual([]);
    expect(flattenFieldTree([])).toEqual([]);
  });

  it('returns leaf fields unchanged', () => {
    const fields = defs([
      { property: 'metadata.name' },
      { property: 'spec.description' },
    ]);
    expect(flattenFieldTree(fields)).toEqual(fields);
  });

  it('flattens nested propertyCollection trees', () => {
    const fields = defs([
      {
        propertyCollection: [
          { property: 'spec.oidc.clientId' },
          { property: 'spec.oidc.clientSecret' },
        ],
      },
    ]);
    expect(flattenFieldTree(fields)).toEqual([
      { property: 'spec.oidc.clientId' },
      { property: 'spec.oidc.clientSecret' },
    ]);
  });

  it('flattens deeply nested collections', () => {
    const fields = defs([
      {
        propertyCollection: [
          {
            propertyCollection: [{ property: 'spec.nested.value' }],
          },
        ],
      },
    ]);
    expect(flattenFieldTree(fields)).toEqual([
      { property: 'spec.nested.value' },
    ]);
  });
});
