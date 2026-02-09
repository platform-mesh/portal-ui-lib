import { stripTypename } from '@platform-mesh/portal-ui-lib/utils';

describe('stripTypename (utils)', () => {
  it('should return primitives as-is', () => {
    expect(stripTypename(42 as any)).toBe(42);
    expect(stripTypename('x' as any)).toBe('x');
    expect(stripTypename(null as any)).toBe(null);
    expect(stripTypename(undefined as any)).toBe(undefined);
  });

  it('should clean nested objects and arrays', () => {
    const input = {
      __typename: 'Root',
      a: { __typename: 'A', b: 1 },
      arr: [{ __typename: 'X', v: 1 }, [{ __typename: 'Y', z: 2 }, 3]],
    } as any;

    const output = stripTypename(input);
    expect(output).toEqual({ a: { b: 1 }, arr: [{ v: 1 }, [{ z: 2 }, 3]] });
  });
});
