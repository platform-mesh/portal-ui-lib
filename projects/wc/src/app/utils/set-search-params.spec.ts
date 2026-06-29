import { addSearchParams } from './set-search-params';

describe('addSearchParams', () => {
  let replaceStateSpy: ReturnType<typeof vi.spyOn>;

  /**
   * Deterministic, URL-backed `location`/`history` stubs.
   *
   * `addSearchParams` reads `location.href` and writes via
   * `history.replaceState`. Relying on the runner's ambient jsdom location is
   * fragile: some CI images / Node versions leave `window.location.href` empty
   * (so `new URL('')` throws `Invalid URL`) or expose a native `location` that
   * shadows jsdom's instance. Stubbing both globals against a single `href`
   * string makes this suite behave identically on every environment.
   */
  let href: string;

  const makeLocation = () => ({
    get href() {
      return href;
    },
    set href(value: string) {
      href = new URL(value, 'http://localhost/').href;
    },
    get search() {
      return new URL(href).search;
    },
    get pathname() {
      return new URL(href).pathname;
    },
    get hash() {
      return new URL(href).hash;
    },
    toString() {
      return href;
    },
  });

  const historyStub = {
    replaceState: (_state: unknown, _title: string, url?: string | URL | null) => {
      if (url != null) href = new URL(String(url), 'http://localhost/').href;
    },
    pushState: (_state: unknown, _title: string, url?: string | URL | null) => {
      if (url != null) href = new URL(String(url), 'http://localhost/').href;
    },
  };

  /** Point the stubbed location at a given URL. */
  const setHref = (value: string) => {
    href = new URL(value, 'http://localhost/').href;
  };

  /** Read the current URL's search params. */
  const params = () => new URL(href).searchParams;

  beforeEach(() => {
    href = 'http://localhost/';
    vi.stubGlobal('location', makeLocation());
    vi.stubGlobal('history', historyStub);
    replaceStateSpy = vi.spyOn(window.history, 'replaceState');
  });

  afterEach(() => {
    replaceStateSpy.mockRestore();
    vi.unstubAllGlobals();
  });

  it('should add a new search param when none exists', () => {
    addSearchParams({ namespace: 'team-a' });

    expect(window.location.search).toBe('?namespace=team-a');
  });

  it('should add multiple params in a single call', () => {
    addSearchParams({ namespace: 'team-a', view: 'grid' });

    expect(params().get('namespace')).toBe('team-a');
    expect(params().get('view')).toBe('grid');
  });

  it('should overwrite an existing param value', () => {
    setHref('http://localhost/?namespace=old');

    addSearchParams({ namespace: 'new' });

    expect(window.location.search).toBe('?namespace=new');
  });

  it('should delete a param when its value is undefined', () => {
    setHref('http://localhost/?namespace=team-a&view=grid');

    addSearchParams({ namespace: undefined });

    expect(params().has('namespace')).toBe(false);
    expect(params().get('view')).toBe('grid');
  });

  it('should be a no-op for delete when the key does not exist', () => {
    setHref('http://localhost/?view=grid');

    addSearchParams({ namespace: undefined });

    expect(window.location.search).toBe('?view=grid');
  });

  it('should leave unrelated params untouched', () => {
    setHref('http://localhost/?keep=me&also=stay');

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
    setHref('http://localhost/?keep=me&drop=this&overwrite=old');

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
    setHref('http://localhost/?keep=me');
    replaceStateSpy.mockClear();

    addSearchParams({});

    expect(window.location.search).toBe('?keep=me');
    // history.replaceState is still called once (the function always writes back)
    expect(replaceStateSpy).toHaveBeenCalledTimes(1);
  });

  it('should preserve the path when updating params', () => {
    setHref('http://localhost/some/deep/path?x=1');

    addSearchParams({ y: '2' });

    expect(window.location.pathname).toBe('/some/deep/path');
    expect(params().get('x')).toBe('1');
    expect(params().get('y')).toBe('2');
  });

  it('should preserve the hash fragment when updating params', () => {
    setHref('http://localhost/page?x=1#anchor');

    addSearchParams({ y: '2' });

    expect(window.location.hash).toBe('#anchor');
    expect(params().get('y')).toBe('2');
  });

  it('should call history.replaceState (not pushState) so no new entry is added to the back stack', () => {
    const pushStateSpy = vi.spyOn(window.history, 'pushState');
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
    expect(window.location.search).toContain(
      'filter=name%3Dfoo+bar%26x',
    );
    // …and decoding round-trips back to the original value
    expect(params().get('filter')).toBe('name=foo bar&x');
  });

  it('should preserve duplicated existing keys when updating an unrelated key', () => {
    setHref('http://localhost/?tag=a&tag=b');

    addSearchParams({ other: 'x' });

    expect(params().getAll('tag')).toEqual(['a', 'b']);
    expect(params().get('other')).toBe('x');
  });

  it('should collapse duplicated keys to a single value when overwriting', () => {
    setHref('http://localhost/?tag=a&tag=b');

    addSearchParams({ tag: 'c' });

    // URLSearchParams.set replaces all existing values with one
    expect(params().getAll('tag')).toEqual(['c']);
  });

  it('should delete every duplicate when value is undefined', () => {
    setHref('http://localhost/?tag=a&tag=b&keep=me');

    addSearchParams({ tag: undefined });

    expect(params().has('tag')).toBe(false);
    expect(params().get('keep')).toBe('me');
  });
});
