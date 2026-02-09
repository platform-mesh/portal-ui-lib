import { setPropertyByPath } from './set-property-by-path';

describe('setPropertyByPath', () => {
  it('should set a top-level property', () => {
    const obj = { a: 1 };

    const result = setPropertyByPath(obj, 'b', 2);

    expect(result).toBe(obj);
    expect(obj).toEqual({ a: 1, b: 2 });
  });

  it('should set a nested property and create missing objects', () => {
    const obj: Record<string, any> = { user: { name: 'Alice' } };

    setPropertyByPath(obj, 'user.address.city', 'Wonderland');

    expect(obj.user.address).toEqual({ city: 'Wonderland' });
  });

  it('should overwrite non-object intermediate values', () => {
    const obj = { settings: { theme: 'dark' } };

    setPropertyByPath(obj, 'settings.theme.color', 'blue');

    expect(obj.settings.theme).toEqual({ color: 'blue' });
  });

  it('should handle null and undefined intermediates', () => {
    const obj = { a: null, b: undefined };

    setPropertyByPath(obj, 'a.value', 1);
    setPropertyByPath(obj, 'b.value', 2);

    expect(obj.a).toEqual({ value: 1 });
    expect(obj.b).toEqual({ value: 2 });
  });

  it('should return original object when path is empty', () => {
    const obj = { a: 1 };

    const result = setPropertyByPath(obj, '', 2);

    expect(result).toBe(obj);
    expect(obj).toEqual({ a: 1 });
  });

  it('should ignore empty segments in path', () => {
    const obj = { user: {} };

    setPropertyByPath(obj, '.user..name.', 'Alice');

    expect(obj.user).toEqual({ name: 'Alice' });
  });
});
