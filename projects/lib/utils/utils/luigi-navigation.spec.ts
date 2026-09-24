import { luigiNavigateTo } from './luigi-navigation';

describe('luigiNavigateTo', () => {
  let postMessageSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    postMessageSpy = vi.spyOn(window, 'postMessage').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should post a luigi.navigation.open message with the given path', () => {
    luigiNavigateTo('/some/path');

    expect(postMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        msg: 'luigi.navigation.open',
        params: expect.objectContaining({ link: '/some/path' }),
      }),
      '*',
    );
  });

  it('should set preventHistoryEntry to false by default', () => {
    luigiNavigateTo('/some/path');

    expect(postMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ preventHistoryEntry: false }),
      }),
      '*',
    );
  });

  it('should set preventHistoryEntry to true when replaceHistory is true', () => {
    luigiNavigateTo('/some/path', true);

    expect(postMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ preventHistoryEntry: true }),
      }),
      '*',
    );
  });

  it('should set preventHistoryEntry to false when replaceHistory is false', () => {
    luigiNavigateTo('/some/path', false);

    expect(postMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ preventHistoryEntry: false }),
      }),
      '*',
    );
  });

  it('should post with target origin "*"', () => {
    luigiNavigateTo('/test');

    expect(postMessageSpy).toHaveBeenCalledWith(expect.anything(), '*');
  });

  it('should include all required Luigi navigation params', () => {
    luigiNavigateTo('/test/path');

    expect(postMessageSpy).toHaveBeenCalledWith(
      {
        msg: 'luigi.navigation.open',
        params: {
          link: '/test/path',
          relative: false,
          preserveView: false,
          nodeParams: {},
          errorSkipNavigation: false,
          fromContext: null,
          fromParent: false,
          fromClosestContext: false,
          preventHistoryEntry: false,
        },
      },
      '*',
    );
  });

  it('should call postMessage exactly once per invocation', () => {
    luigiNavigateTo('/path');

    expect(postMessageSpy).toHaveBeenCalledTimes(1);
  });
});
