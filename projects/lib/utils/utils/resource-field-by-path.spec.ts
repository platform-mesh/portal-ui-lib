import {
  decodeBase64,
  encodeBase64,
  getResourceValueByJsonPath,
} from './resource-field-by-path';
import { PropertyField, Resource } from '@platform-mesh/portal-ui-lib/models';
import jsonpath from 'jsonpath';

jest.mock('jsonpath');

describe('getResourceValueByJsonPath', () => {
  const mockResource: Resource = {
    metadata: { name: 'test-resource' },
    spec: { value: 'test-value', nested: { field: 'nested-value' } },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return undefined when no property or jsonPathExpression is provided', () => {
    const result = getResourceValueByJsonPath(mockResource, {});
    expect(result).toBeUndefined();
  });

  it('should return undefined and log error when property is an array', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const result = getResourceValueByJsonPath(mockResource, {
      property: ['path1', 'path2'],
    });

    expect(result).toBeUndefined();
    expect(consoleSpy).toHaveBeenCalledWith(
      expect.stringContaining('Property defined as an array'),
    );
    consoleSpy.mockRestore();
  });

  it('should query resource using jsonPathExpression', () => {
    (jsonpath.query as jest.Mock).mockReturnValue(['test-result']);

    const result = getResourceValueByJsonPath(mockResource, {
      jsonPathExpression: 'spec.value',
    });

    expect(jsonpath.query).toHaveBeenCalledWith(mockResource, '$.spec.value');
    expect(result).toBe('test-result');
  });

  it('should query resource using property', () => {
    (jsonpath.query as jest.Mock).mockReturnValue(['property-result']);

    const result = getResourceValueByJsonPath(mockResource, {
      property: 'metadata.name',
    });

    expect(jsonpath.query).toHaveBeenCalledWith(
      mockResource,
      '$.metadata.name',
    );
    expect(result).toBe('property-result');
  });

  it('should return undefined when query result is empty', () => {
    (jsonpath.query as jest.Mock).mockReturnValue([]);

    const result = getResourceValueByJsonPath(mockResource, {
      property: 'nonexistent',
    });

    expect(result).toBeUndefined();
  });

  it('should apply propertyField transform when provided', () => {
    const mockValue = { key1: 'value1', key2: 'value2' };
    (jsonpath.query as jest.Mock).mockReturnValue([mockValue]);

    const propertyField: PropertyField = {
      key: 'key1',
      transform: ['uppercase'],
    };

    const result = getResourceValueByJsonPath(mockResource, {
      property: 'spec.data',
      propertyField,
    });

    expect(result).toBe('VALUE1');
  });

  it('should handle none existing transform', () => {
    const mockValue = { text: 'hello world' };
    (jsonpath.query as jest.Mock).mockReturnValue([mockValue]);

    const result = getResourceValueByJsonPath(mockResource, {
      property: 'spec.data',
      propertyField: { key: 'text', transform: ['notknown' as any] },
    });

    expect(result).toBe('hello world');
  });

  it('should handle uppercase transform', () => {
    const mockValue = { text: 'hello world' };
    (jsonpath.query as jest.Mock).mockReturnValue([mockValue]);

    const result = getResourceValueByJsonPath(mockResource, {
      property: 'spec.data',
      propertyField: { key: 'text', transform: ['uppercase'] },
    });

    expect(result).toBe('HELLO WORLD');
  });

  it('should handle lowercase transform', () => {
    const mockValue = { text: 'HELLO WORLD' };
    (jsonpath.query as jest.Mock).mockReturnValue([mockValue]);

    const result = getResourceValueByJsonPath(mockResource, {
      property: 'spec.data',
      propertyField: { key: 'text', transform: ['lowercase'] },
    });

    expect(result).toBe('hello world');
  });

  it('should handle capitalize transform', () => {
    const mockValue = { text: 'hello' };
    (jsonpath.query as jest.Mock).mockReturnValue([mockValue]);

    const result = getResourceValueByJsonPath(mockResource, {
      property: 'spec.data',
      propertyField: { key: 'text', transform: ['capitalize'] },
    });

    expect(result).toBe('Hello');
  });

  it('should handle multiple transforms', () => {
    const mockValue = { text: 'HELLO WORLD' };
    (jsonpath.query as jest.Mock).mockReturnValue([mockValue]);

    const result = getResourceValueByJsonPath(mockResource, {
      property: 'spec.data',
      propertyField: { key: 'text', transform: ['lowercase', 'capitalize'] },
    });

    expect(result).toBe('Hello world');
  });

  it('should handle encode transform', () => {
    const mockValue = { text: 'test' };
    (jsonpath.query as jest.Mock).mockReturnValue([mockValue]);

    const result = getResourceValueByJsonPath(mockResource, {
      property: 'spec.data',
      propertyField: { key: 'text', transform: ['encode'] },
    });

    expect(result).toBe(encodeBase64('test'));
  });

  it('should return original value when encode transform fails', () => {
    jest.spyOn(global, 'btoa').mockImplementation(() => {
      throw new Error('btoa error');
    });
    jest.spyOn(console, 'error').mockImplementation();

    const mockValue = { text: 'test-value' };
    (jsonpath.query as jest.Mock).mockReturnValue([mockValue]);

    const result = getResourceValueByJsonPath(mockResource, {
      property: 'spec.data',
      propertyField: { key: 'text', transform: ['encode'] },
    });

    expect(result).toBe('test-value');

    jest.restoreAllMocks();
  });

  it('should handle decode transform', () => {
    const encoded = encodeBase64('test');
    const mockValue = { text: encoded };
    (jsonpath.query as jest.Mock).mockReturnValue([mockValue]);

    const result = getResourceValueByJsonPath(mockResource, {
      property: 'spec.data',
      propertyField: { key: 'text', transform: ['decode'] },
    });

    expect(result).toBe('test');
  });

  it('should return original value when transform fails', () => {
    const mockValue = { text: 'invalid-base64!!!' };
    (jsonpath.query as jest.Mock).mockReturnValue([mockValue]);

    const result = getResourceValueByJsonPath(mockResource, {
      property: 'spec.data',
      propertyField: { key: 'text', transform: ['decode'] },
    });

    expect(result).toBe('invalid-base64!!!');
  });

  it('should handle null value in transform', () => {
    const mockValue = { text: null };
    (jsonpath.query as jest.Mock).mockReturnValue([mockValue]);

    const result = getResourceValueByJsonPath(mockResource, {
      property: 'spec.data',
      propertyField: { key: 'text', transform: ['uppercase'] },
    });

    expect(result).toBeNull();
  });

  it('should handle undefined value in transform', () => {
    const mockValue = { text: undefined };
    (jsonpath.query as jest.Mock).mockReturnValue([mockValue]);

    const result = getResourceValueByJsonPath(mockResource, {
      property: 'spec.data',
      propertyField: { key: 'text', transform: ['uppercase'] },
    });

    expect(result).toBeUndefined();
  });

  it('should return value when no transform is provided', () => {
    const mockValue = { text: 'no-transform' };
    (jsonpath.query as jest.Mock).mockReturnValue([mockValue]);

    const result = getResourceValueByJsonPath(mockResource, {
      property: 'spec.data',
      propertyField: { key: 'text' },
    });

    expect(result).toBe('no-transform');
  });

  it('should return value when transform is empty array', () => {
    const mockValue = { text: 'empty-transform' };
    (jsonpath.query as jest.Mock).mockReturnValue([mockValue]);

    const result = getResourceValueByJsonPath(mockResource, {
      property: 'spec.data',
      propertyField: { key: 'text', transform: [] },
    });

    expect(result).toBe('empty-transform');
  });
});

describe('encodeBase64', () => {
  it('should encode simple ASCII string', () => {
    const result = encodeBase64('hello');
    expect(result).toBe('aGVsbG8=');
  });

  it('should encode UTF-8 string with special characters', () => {
    const result = encodeBase64('Hello, 世界');
    expect(decodeBase64(result)).toBe('Hello, 世界');
  });

  it('should encode emojis', () => {
    const result = encodeBase64('👍🎉');
    expect(decodeBase64(result)).toBe('👍🎉');
  });

  it('should encode empty string', () => {
    const result = encodeBase64('');
    expect(result).toBe('');
  });

  it('should throw error when encoding fails', () => {
    jest.spyOn(global, 'btoa').mockImplementation(() => {
      throw new Error('btoa error');
    });

    expect(() => encodeBase64('test')).toThrow(
      'Failed to encode string to Base64',
    );

    jest.restoreAllMocks();
  });

  it('should log error when encoding fails', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    jest.spyOn(global, 'btoa').mockImplementation(() => {
      throw new Error('btoa error');
    });

    try {
      encodeBase64('test');
    } catch {}

    expect(consoleSpy).toHaveBeenCalledWith(
      'Base64 encoding failed:',
      expect.any(Error),
    );

    jest.restoreAllMocks();
    consoleSpy.mockRestore();
  });
});

describe('decodeBase64', () => {
  it('should decode simple ASCII string', () => {
    const result = decodeBase64('aGVsbG8=');
    expect(result).toBe('hello');
  });

  it('should decode UTF-8 string with special characters', () => {
    const encoded = encodeBase64('Hello, 世界');
    const result = decodeBase64(encoded);
    expect(result).toBe('Hello, 世界');
  });

  it('should decode emojis', () => {
    const encoded = encodeBase64('👍🎉');
    const result = decodeBase64(encoded);
    expect(result).toBe('👍🎉');
  });

  it('should decode empty string', () => {
    const result = decodeBase64('');
    expect(result).toBe('');
  });

  it('should throw error for invalid base64', () => {
    expect(() => decodeBase64('invalid!!!')).toThrow(
      'Failed to decode Base64 string',
    );
  });

  it('should log error when decoding fails', () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    try {
      decodeBase64('invalid!!!');
    } catch {}

    expect(consoleSpy).toHaveBeenCalledWith(
      'Base64 decoding failed:',
      expect.any(Error),
    );

    consoleSpy.mockRestore();
  });

  it('should handle round-trip encoding and decoding', () => {
    const original = 'Test string with 特殊字符 and emojis 🚀';
    const encoded = encodeBase64(original);
    const decoded = decodeBase64(encoded);
    expect(decoded).toBe(original);
  });
});
