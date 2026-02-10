import { NavigationRedirectStrategyServiceImpl } from './navigation-redirect-strategy.service';
import { TestBed } from '@angular/core/testing';
import { LocalStorageKeys } from '@openmfp/portal-ui-lib';

const originalLocalStorage = window.localStorage;

describe('NavigationRedirectStrategyServiceImpl', () => {
  let service: NavigationRedirectStrategyServiceImpl;
  let localStorageMock: {
    getItem: ReturnType<typeof vi.fn>;
    setItem: ReturnType<typeof vi.fn>;
    removeItem: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    localStorageMock = {
      getItem: vi.fn(),
      setItem: vi.fn(),
      removeItem: vi.fn(),
    };
    Object.defineProperty(window, 'localStorage', {
      value: localStorageMock,
      writable: true,
      configurable: true,
    });

    TestBed.configureTestingModule({
      providers: [NavigationRedirectStrategyServiceImpl],
    });

    service = TestBed.inject(NavigationRedirectStrategyServiceImpl);
  });

  afterEach(() => {
    vi.clearAllMocks();
    Object.defineProperty(window, 'localStorage', {
      value: originalLocalStorage,
      writable: true,
      configurable: true,
    });
  });

  describe('getRedirectUrl', () => {
    it('should return empty string when nothing is stored', () => {
      localStorageMock.getItem.mockReturnValue(null);

      const result = service.getRedirectUrl();

      expect(result).toBe('');
      expect(localStorageMock.getItem).toHaveBeenCalledWith(
        LocalStorageKeys.LAST_NAVIGATION_URL,
      );
    });

    it('should return stored redirect URL', () => {
      const url = '/dashboard/settings';
      localStorageMock.getItem.mockReturnValue(url);

      const result = service.getRedirectUrl();

      expect(result).toBe(url);
      expect(localStorageMock.getItem).toHaveBeenCalledWith(
        LocalStorageKeys.LAST_NAVIGATION_URL,
      );
    });
  });

  describe('saveRedirectUrl', () => {
    it('should save URL to localStorage when URL does not start with /error', () => {
      const url = '/some/path';

      service.saveRedirectUrl(url);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        LocalStorageKeys.LAST_NAVIGATION_URL,
        url,
      );
    });

    it('should not save URL when it starts with /error', () => {
      service.saveRedirectUrl('/error');

      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    it('should not save URL when it starts with /error/404', () => {
      service.saveRedirectUrl('/error/404');

      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    it('should save URL when path contains error but does not start with /error', () => {
      const url = '/page/error-handling';

      service.saveRedirectUrl(url);

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        LocalStorageKeys.LAST_NAVIGATION_URL,
        url,
      );
    });
  });

  describe('clearRedirectUrl', () => {
    it('should remove redirectUrl from localStorage', () => {
      service.clearRedirectUrl();

      expect(localStorageMock.removeItem).toHaveBeenCalledWith(
        LocalStorageKeys.LAST_NAVIGATION_URL,
      );
    });
  });
});
