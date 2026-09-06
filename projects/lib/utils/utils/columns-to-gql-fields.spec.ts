import { generateGraphQLFields, generateGraphQLReadFields } from './columns-to-gql-fields';
import { PlatformMeshFieldDefinition } from '@platform-mesh/portal-ui-lib/models';

describe('columns-to-gql-fields', () => {
  describe('generateGraphQLFields', () => {
    it('should handle empty array input', () => {
      const result = generateGraphQLFields([]);
      expect(result).toEqual([]);
    });

    it('should handle single field with simple property', () => {
      const fields: PlatformMeshFieldDefinition[] = [
        { property: 'name', label: 'Name' },
      ];
      const result = generateGraphQLFields(fields);
      expect(result).toEqual(['name']);
    });

    it('should handle multiple fields with simple properties', () => {
      const fields: PlatformMeshFieldDefinition[] = [
        { property: 'name', label: 'Name' },
        { property: 'age', label: 'Age' },
      ];
      const result = generateGraphQLFields(fields);
      expect(result).toEqual(['name', 'age']);
    });

    it('should handle nested properties with dot notation', () => {
      const fields: PlatformMeshFieldDefinition[] = [
        { property: 'user.name', label: 'User Name' },
      ];
      const result = generateGraphQLFields(fields);
      expect(result).toEqual([{ user: ['name'] }]);
    });

    it('should handle deeply nested properties', () => {
      const fields: PlatformMeshFieldDefinition[] = [
        { property: 'user.profile.address.city', label: 'City' },
      ];
      const result = generateGraphQLFields(fields);
      expect(result).toEqual([
        { user: [{ profile: [{ address: ['city'] }] }] },
      ]);
    });

    it('should handle array of properties', () => {
      const fields: PlatformMeshFieldDefinition[] = [
        { property: ['name', 'age'], label: 'User Info' },
      ];
      const result = generateGraphQLFields(fields);
      expect(result).toEqual(['name', 'age']);
    });

    it('should handle mixed array of simple and nested properties', () => {
      const fields: PlatformMeshFieldDefinition[] = [
        { property: ['name', 'user.profile.age'], label: 'Mixed Info' },
      ];
      const result = generateGraphQLFields(fields);
      expect(result).toEqual(['name', { user: [{ profile: ['age'] }] }]);
    });

    it('should handle multiple fields with mixed properties', () => {
      const fields: PlatformMeshFieldDefinition[] = [
        { property: 'name', label: 'Name' },
        { property: 'user.profile.age', label: 'Age' },
        { property: ['email', 'phone'], label: 'Contact' },
      ];
      const result = generateGraphQLFields(fields);
      expect(result).toEqual([
        'name',
        { user: [{ profile: ['age'] }] },
        'email',
        'phone',
      ]);
    });

    it('should handle empty or null property values', () => {
      const fields: PlatformMeshFieldDefinition[] = [
        { property: '', label: 'Empty' },
        { property: null as any, label: 'Null' },
      ];
      const result = generateGraphQLFields(fields);
      expect(result).toEqual([]);
    });
    it('should exclude write-only fields when forRead is true', () => {
      const fields: PlatformMeshFieldDefinition[] = [
        { property: 'spec.oidc.clientId', label: 'Client ID' },
        {
          property: 'spec.oidc.clientSecret',
          label: 'Client secret',
          uiSettings: { writeOnly: true },
        },
      ];
      const result = generateGraphQLFields(fields, { forRead: true });
      expect(result).toEqual([{ spec: [{ oidc: ['clientId'] }] }]);
    });

    it('should include write-only fields when forRead is omitted', () => {
      const fields: PlatformMeshFieldDefinition[] = [
        { property: 'spec.oidc.clientId', label: 'Client ID' },
        {
          property: 'spec.oidc.clientSecret',
          label: 'Client secret',
          uiSettings: { writeOnly: true },
        },
      ];
      const result = generateGraphQLFields(fields);
      expect(result).toEqual([
        { spec: [{ oidc: ['clientId'] }] },
        { spec: [{ oidc: ['clientSecret'] }] },
      ]);
    });

    it('should exclude nested write-only fields via generateGraphQLReadFields', () => {
      const fields = [
        {
          propertyCollection: [
            { property: 'spec.oidc.clientId', label: 'Client ID' },
            {
              property: 'spec.oidc.clientSecret',
              label: 'Client secret',
              uiSettings: { writeOnly: true },
            },
          ],
        },
      ] as PlatformMeshFieldDefinition[];
      const result = generateGraphQLReadFields(fields);
      expect(result).toEqual([{ spec: [{ oidc: ['clientId'] }] }]);
    });
  });
});
