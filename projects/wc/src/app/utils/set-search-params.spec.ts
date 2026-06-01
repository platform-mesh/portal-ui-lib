import { addSearchParams } from './set-search-params';

describe('addSearchParams', () => {
  let replaceStateSpy: ReturnType<typeof vi.spyOn>;

  /** Reset jsdom's URL between tests so each one starts from a known state. */
  const setHref = (href: string) => {
    history.replaceState(null, '', href);
  };

  /** Read the current URL's search params, since Location has no `.searchParams`. */
  const params = () => new URL(location.href).searchParams;

  beforeEach(() => {
    setHref('/');
    replaceStateSpy = vi.spyOn(history, 'replaceState');
  });

  afterEach(() => {
    replaceStateSpy.mockRestore();
    setHref('/');
  });

  it('should add a new search param when none exists', () => {
    addSearchParams({ namespace: 'team-a' });

    expect(location.search).toBe('?namespace=team-a');
  });

  it('should add multiple params in a single call', () => {
    addSearchParams({ namespace: 'team-a', view: 'grid' });

    expect(params().get('namespace')).toBe('team-a');
    expect(params().get('view')).toBe('grid');
  });

  it('should overwrite an existing param value', () => {
    setHref('/?namespace=old');

    addSearchParams({ namespace: 'new' });

    expect(location.search).toBe('?namespace=new');
  });

  it('should delete a param when its value is undefined', () => {
    setHref('/?namespace=team-a&view=grid');

    addSearchParams({ namespace: undefined });

    expect(params().has('namespace')).toBe(false);
    expect(params().get('view')).toBe('grid');
  });

  it('should be a no-op for delete when the key does not exist', () => {
    setHref('/?view=grid');

    addSearchParams({ namespace: undefined });

    expect(location.search).toBe('?view=grid');
  });

  it('should leave unrelated params untouched', () => {
    setHref('/?keep=me&also=stay');

    addSearchParams({ namespace: 'team-a' });

    expect(params().get('keep')).toBe('me');
    expect(params().get('also')).toBe('stay');
    expect(params().get('namespace')).toBe('team-a');
  });

  it('should accept and store empty-string values', () => {
    addSearchParams({ namespace: '' });

    expect(params().has('namespace')).toBe(true);
    expect(params().get('namespace')).toBe('');
  });

  it('should support a mix of additions, overwrites, and deletions in one call', () => {
    setHref('/?keep=me&drop=this&overwrite=old');

    addSearchParams({
      add: 'new-value',
      overwrite: 'new',
      drop: undefined,
    });

    const p = params();
    expect(p.get('add')).toBe('new-value');
    expect(p.get('overwrite')).toBe('new');
    expect(p.has('drop')).toBe(false);
    expect(p.get('keep')).toBe('me');
  });

  it('should be a no-op when called with an empty params object', () => {
    setHref('/?keep=me');
    replaceStateSpy.mockClear();

    addSearchParams({});

    expect(location.search).toBe('?keep=me');
    // history.replaceState is still called once (the function always writes back)
    expect(replaceStateSpy).toHaveBeenCalledTimes(1);
  });

  it('should preserve the path when updating params', () => {
    setHref('/some/deep/path?x=1');

    addSearchParams({ y: '2' });

    expect(location.pathname).toBe('/some/deep/path');
    expect(params().get('x')).toBe('1');
    expect(params().get('y')).toBe('2');
  });

  it('should preserve the hash fragment when updating params', () => {
    setHref('/page?x=1#anchor');

    addSearchParams({ y: '2' });

    expect(location.hash).toBe('#anchor');
    expect(params().get('y')).toBe('2');
  });

  it('should call history.replaceState (not pushState) so no new entry is added to the back stack', () => {
    const pushStateSpy = vi.spyOn(history, 'pushState');
    replaceStateSpy.mockClear();

    addSearchParams({ namespace: 'team-a' });

    expect(replaceStateSpy).toHaveBeenCalledTimes(1);
    expect(pushStateSpy).not.toHaveBeenCalled();

    pushStateSpy.mockRestore();
  });

  it('should pass null state and an empty title to replaceState', () => {
    addSearchParams({ namespace: 'team-a' });

    expect(replaceStateSpy).toHaveBeenCalledWith(null, '', expect.anything());
  });

  it('should URL-encode special characters in values', () => {
    addSearchParams({ filter: 'name=foo bar&x' });

    // URLSearchParams encodes '=' as %3D, ' ' as +, '&' as %26
    expect(location.search).toContain('filter=name%3Dfoo+bar%26x');
    // …and decoding round-trips back to the original value
    expect(params().get('filter')).toBe('name=foo bar&x');
  });

  it('should preserve duplicated existing keys when updating an unrelated key', () => {
    setHref('/?tag=a&tag=b');

    addSearchParams({ other: 'x' });

    expect(params().getAll('tag')).toEqual(['a', 'b']);
    expect(params().get('other')).toBe('x');
  });

  it('should collapse duplicated keys to a single value when overwriting', () => {
    setHref('/?tag=a&tag=b');

    addSearchParams({ tag: 'c' });

    // URLSearchParams.set replaces all existing values with one
    expect(params().getAll('tag')).toEqual(['c']);
  });

  it('should delete every duplicate when value is undefined', () => {
    setHref('/?tag=a&tag=b&keep=me');

    addSearchParams({ tag: undefined });

    expect(params().has('tag')).toBe(false);
    expect(params().get('keep')).toBe('me');
  });

  it('should fall back to http://localhost/ when location.href is empty', () => {
    // Force the `||` fallback branch by making location.href falsy.
    // jsdom marks `href` non-configurable on window.location, but we can shadow
    // it on the Location prototype temporarily.
    const proto = Object.getPrototypeOf(window.location);
    const original = Object.getOwnPropertyDescriptor(proto, 'href');
    Object.defineProperty(proto, 'href', {
      configurable: true,
      get: () => '',
      set: () => {},
    });

    try {
      addSearchParams({ namespace: 'team-a' });

      const url = replaceStateSpy.mock.calls.at(-1)![2] as URL;
      expect(url.origin).toBe('http://localhost');
      expect(url.searchParams.get('namespace')).toBe('team-a');
    } finally {
      if (original) {
        Object.defineProperty(proto, 'href', original);
      } else {
        delete (proto as any).href;
      }
    }
  });
});
