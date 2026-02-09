import { parseRawGqlQueryToFields } from './parse-raw-gql-query';

describe('parse-raw-gql-query', () => {
  describe('parseRawGqlQueryToFields', () => {
    it('should parse flat fields', () => {
      expect(parseRawGqlQueryToFields('{ id name }')).toEqual(['id', 'name']);
    });

    it('should parse nested fields', () => {
      expect(parseRawGqlQueryToFields('{ user { id name } }')).toEqual([
        { user: ['id', 'name'] },
      ]);
    });

    it('should parse deeply nested fields', () => {
      expect(
        parseRawGqlQueryToFields('{ user { profile { address { city } } } }'),
      ).toEqual([{ user: [{ profile: [{ address: ['city'] }] }] }]);
    });

    it('should parse mixed flat and nested fields', () => {
      expect(
        parseRawGqlQueryToFields('{ id user { profile { age } } status }'),
      ).toEqual(['id', { user: [{ profile: ['age'] }] }, 'status']);
    });

    it('should handle whitespace and newlines', () => {
      expect(
        parseRawGqlQueryToFields(`
          {
            id
            user {
              name
            }
          }
        `),
      ).toEqual(['id', { user: ['name'] }]);
    });

    it('should handle missing outer braces', () => {
      expect(parseRawGqlQueryToFields('id name')).toEqual(['id', 'name']);
    });

    it('should handle queries without spaces around braces', () => {
      expect(parseRawGqlQueryToFields('{user{id}}')).toEqual([{ user: ['id'] }]);
    });
  });
});
