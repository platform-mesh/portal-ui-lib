vi.mock('jsonpath', async (importOriginal) => {
  const actual: any = await importOriginal();

  const safeQuery = (...args: any[]) => {
    const res = actual?.query?.(...args);
    return Array.isArray(res) ? res : [];
  };

  return {
    ...actual,
    query: safeQuery,
    default: {
      ...(actual?.default ?? actual),
      query: safeQuery,
    },
  };
});

describe('getValueByPath', () => {
  let getValueByPath: <T extends object, R = unknown>(
    obj: T,
    path: string,
  ) => R | undefined;

  beforeEach(async () => {
    vi.resetModules();
    ({ getValueByPath } = await import('./get-value-by-path'));
    vi.clearAllMocks();
  });

  const obj = {
    user: {
      id: 1,
      name: 'Alice',
      address: {
        city: 'Wonderland',
        zip: 12345,
      },
    },
    settings: {
      theme: 'dark',
      notifications: {
        email: true,
        sms: false,
      },
    },
  };

  it('should return a top-level property', () => {
    expect(getValueByPath(obj, 'user')).toEqual(obj.user);
  });

  it('should return a nested property', () => {
    expect(getValueByPath(obj, 'user.name')).toBe('Alice');
    expect(getValueByPath(obj, 'user.address.city')).toBe('Wonderland');
  });

  it('should return undefined for a missing property', () => {
    expect(getValueByPath(obj, 'user.age')).toBeUndefined();
    expect(getValueByPath(obj, 'settings.language')).toBeUndefined();
  });

  it('should return undefined for a deeply missing property', () => {
    expect(getValueByPath(obj, 'user.address.country.code')).toBeUndefined();
  });

  it('should return undefined if the path is empty', () => {
    expect(getValueByPath(obj, '')).toBeUndefined();
  });

  it('should handle non-object intermediate values gracefully', () => {
    expect(getValueByPath(obj, 'user.name.first')).toBeUndefined();
    expect(getValueByPath(obj, 'settings.theme.color')).toBeUndefined();
  });

  it('should work with boolean, number, and null values', () => {
    expect(getValueByPath(obj, 'settings.notifications.email')).toBe(true);
    expect(getValueByPath(obj, 'user.address.zip')).toBe(12345);

    const testObj = { a: null as null | { b: string } };
    expect(getValueByPath(testObj, 'a')).toBeNull();
    expect(getValueByPath(testObj, 'a.b')).toBeUndefined();
  });
});
