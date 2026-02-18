import { addSearchParams } from './set-search-params';

describe('addSearchParams', () => {
  it('forwards params to Luigi routing', () => {
    const addSearchParamsMock = vi.fn();
    (window as any).Luigi = {
      routing: () => ({
        addSearchParams: addSearchParamsMock,
      }),
    };

    addSearchParams({ namespace: 'test-namespace' });

    expect(addSearchParamsMock).toHaveBeenCalledWith({
      namespace: 'test-namespace',
    });
  });
});
