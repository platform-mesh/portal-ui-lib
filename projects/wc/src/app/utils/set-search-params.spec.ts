import { addSearchParams } from './set-search-params';

describe('addSearchParams', () => {
  beforeEach(() => {
    history.replaceState(null, '', '?namespace=old&view=list');
  });

  it('updates only matching key and keeps other params', () => {
    addSearchParams({ namespace: 'test-namespace' });

    const url = new URL(window.location.href);

    expect(url.searchParams.get('namespace')).toBe('test-namespace');
    expect(url.searchParams.get('view')).toBe('list');
  });

  it('removes key when value is undefined', () => {
    addSearchParams({ namespace: undefined });

    const url = new URL(window.location.href);

    expect(url.searchParams.has('namespace')).toBe(false);
    expect(url.searchParams.get('view')).toBe('list');
  });

  it('calls history.replaceState to update url without navigation', () => {
    const replaceStateSpy = vi.spyOn(history, 'replaceState');

    addSearchParams({ namespace: 'new' });

    expect(replaceStateSpy).toHaveBeenCalledOnce();
    expect(window.location.search).toContain('namespace=new');
  });
});
