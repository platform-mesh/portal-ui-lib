import { ErrorHandlerService } from './error-handler.service';
import { TestBed } from '@angular/core/testing';
import { LuigiCoreService } from '@openmfp/portal-ui-lib';
import { Resource } from '@platform-mesh/portal-ui-lib/models';
import { MockedObject } from 'vitest';
import { mock } from 'vitest-mock-extended';

describe('ErrorHandlerService', () => {
  let service: ErrorHandlerService;
  let luigiCoreService: MockedObject<LuigiCoreService>;
  let postMessageSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    luigiCoreService = mock<LuigiCoreService>();
    luigiCoreService.showAlert = vi.fn();
    postMessageSpy = vi
      .spyOn(window, 'postMessage')
      .mockImplementation(() => {});

    TestBed.configureTestingModule({
      providers: [
        ErrorHandlerService,
        { provide: LuigiCoreService, useValue: luigiCoreService },
      ],
    });

    service = TestBed.inject(ErrorHandlerService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  function expectNavigatedTo(path: string) {
    expect(postMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        msg: 'luigi.navigation.open',
        params: expect.objectContaining({
          link: path,
          preventHistoryEntry: true,
        }),
      }),
      '*',
    );
  }

  describe('handleError', () => {
    it('should navigate to 403 when error message contains forbidden', () => {
      const error = { message: 'Access is forbidden' };

      service.handleError(error);

      expectNavigatedTo('/error/403');
      expect(luigiCoreService.showAlert).not.toHaveBeenCalled();
    });

    it('should navigate to 403 when error message contains Forbidden with capital F', () => {
      const error = { message: 'Forbidden resource' };

      service.handleError(error);

      expectNavigatedTo('/error/403');
      expect(luigiCoreService.showAlert).not.toHaveBeenCalled();
    });

    it('should navigate to 403 when error message contains FORBIDDEN in uppercase', () => {
      const error = { message: 'FORBIDDEN' };

      service.handleError(error);

      expectNavigatedTo('/error/403');
      expect(luigiCoreService.showAlert).not.toHaveBeenCalled();
    });

    it('should navigate to 403 when error message contains access denied', () => {
      const error = { message: 'access denied to resource' };

      service.handleError(error);

      expectNavigatedTo('/error/403');
      expect(luigiCoreService.showAlert).not.toHaveBeenCalled();
    });

    it('should navigate to 403 when error message contains Access Denied with capitals', () => {
      const error = { message: 'Access Denied' };

      service.handleError(error);

      expectNavigatedTo('/error/403');
      expect(luigiCoreService.showAlert).not.toHaveBeenCalled();
    });

    it('should show alert when error message does not contain forbidden or access denied', () => {
      const error = { message: 'Resource not found' };

      service.handleError(error);

      expect(luigiCoreService.showAlert).toHaveBeenCalledWith({
        text: 'Resource not found',
        type: 'error',
      });
      expect(postMessageSpy).not.toHaveBeenCalled();
    });

    it('should show alert with default message when error message is empty string', () => {
      const error = { message: '' };

      service.handleError(error);

      expect(luigiCoreService.showAlert).toHaveBeenCalledWith({
        text: 'An unknown error occurred',
        type: 'error',
      });
      expect(postMessageSpy).not.toHaveBeenCalled();
    });

    it('should show alert with default message when error message is undefined', () => {
      const error = { message: undefined } as any;

      service.handleError(error);

      expect(luigiCoreService.showAlert).toHaveBeenCalledWith({
        text: 'An unknown error occurred',
        type: 'error',
      });
      expect(postMessageSpy).not.toHaveBeenCalled();
    });

    it('should show alert with default message when error message is null', () => {
      const error = { message: null } as any;

      service.handleError(error);

      expect(luigiCoreService.showAlert).toHaveBeenCalledWith({
        text: 'An unknown error occurred',
        type: 'error',
      });
      expect(postMessageSpy).not.toHaveBeenCalled();
    });

    it('should show alert when received error with message', () => {
      const error = { message: 'Some error' };

      service.handleError(error);

      expect(luigiCoreService.showAlert).toHaveBeenCalled();
    });

    it('should show alert exactly once for non-403 errors', () => {
      const error = { message: 'Some error' };

      service.handleError(error);

      expect(luigiCoreService.showAlert).toHaveBeenCalledTimes(1);
    });

    it('should handle error with both forbidden and access denied', () => {
      const error = { message: 'Access denied: forbidden resource' };

      service.handleError(error);

      expectNavigatedTo('/error/403');
      expect(luigiCoreService.showAlert).not.toHaveBeenCalled();
    });

    it('should show alert for generic error messages', () => {
      const error = { message: 'Internal server error' };

      service.handleError(error);

      expect(luigiCoreService.showAlert).toHaveBeenCalledWith({
        text: 'Internal server error',
        type: 'error',
      });
      expect(postMessageSpy).not.toHaveBeenCalled();
    });

    it('should show alert for validation errors', () => {
      const error = { message: 'Invalid input provided' };

      service.handleError(error);

      expect(luigiCoreService.showAlert).toHaveBeenCalledWith({
        text: 'Invalid input provided',
        type: 'error',
      });
      expect(postMessageSpy).not.toHaveBeenCalled();
    });

    it('should handle error message with forbidden in the middle', () => {
      const error = { message: 'This action is forbidden for you' };

      service.handleError(error);

      expectNavigatedTo('/error/403');
      expect(luigiCoreService.showAlert).not.toHaveBeenCalled();
    });

    it('should handle error message with access denied at the end', () => {
      const error = { message: 'You do not have access denied' };

      service.handleError(error);

      expectNavigatedTo('/error/403');
      expect(luigiCoreService.showAlert).not.toHaveBeenCalled();
    });

    it('should be case-insensitive for forbidden check', () => {
      const error = { message: 'fOrBiDdEn' };

      service.handleError(error);

      expectNavigatedTo('/error/403');
      expect(luigiCoreService.showAlert).not.toHaveBeenCalled();
    });

    it('should handle error with special characters', () => {
      const error = { message: 'Error: 403 - Access Denied!' };

      service.handleError(error);

      expectNavigatedTo('/error/403');
      expect(luigiCoreService.showAlert).not.toHaveBeenCalled();
    });

    it('should show alert when message contains similar but different words', () => {
      const error = { message: 'forbid access' };

      service.handleError(error);

      expect(luigiCoreService.showAlert).toHaveBeenCalledWith({
        text: 'forbid access',
        type: 'error',
      });
      expect(postMessageSpy).not.toHaveBeenCalled();
    });

    it('should handle errors array and join messages', () => {
      const error = {
        errors: [{ message: 'Error 1' }, { message: 'Error 2' }],
      };

      service.handleError(error);

      expect(luigiCoreService.showAlert).toHaveBeenCalledWith({
        text: 'Error 1\nError 2',
        type: 'error',
      });
    });

    it('should navigate to 404 without an alert when statusCode is 404', () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const error = { message: 'Received status code 404', statusCode: 404 };

      service.handleError(error);

      expectNavigatedTo('/error/404');
      expect(luigiCoreService.showAlert).not.toHaveBeenCalled();
      expect(consoleSpy).not.toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should show the custom message followed by the error message', () => {
      service.handleError(
        { message: 'Some error' },
        'Failure! Could not delete resource: test.',
      );

      expect(luigiCoreService.showAlert).toHaveBeenCalledWith({
        text: 'Failure! Could not delete resource: test.\nSome error',
        type: 'error',
      });
    });

    it('should show only the custom message when the error has no message', () => {
      service.handleError({}, 'Failure! Could not delete resource: test.');

      expect(luigiCoreService.showAlert).toHaveBeenCalledWith({
        text: 'Failure! Could not delete resource: test.',
        type: 'error',
      });
    });

    it('should navigate to 403 without showing the custom message', () => {
      service.handleError(
        { message: 'forbidden' },
        'Failure! Could not delete resource: test.',
      );

      expectNavigatedTo('/error/403');
      expect(luigiCoreService.showAlert).not.toHaveBeenCalled();
    });

    it('should console.error the error for non-403 cases', () => {
      const consoleSpy = vi
        .spyOn(console, 'error')
        .mockImplementation(() => {});
      const error = { message: 'Some error' };

      service.handleError(error);

      expect(consoleSpy).toHaveBeenCalledWith(error);
      consoleSpy.mockRestore();
    });
  });

  describe('handleResourcePendingDeletionError', () => {
    const mockResource: Resource = {
      metadata: {
        name: 'test-resource',
        namespace: 'default',
      },
    } as Resource;

    it('should navigate to 422 error page', () => {
      service.handleResourcePendingDeletion(mockResource);

      expectNavigatedTo('/error/422');
    });

    it('should post navigation message with replaceHistory flag', () => {
      service.handleResourcePendingDeletion(mockResource);

      expect(postMessageSpy).toHaveBeenCalledTimes(1);
      expectNavigatedTo('/error/422');
    });
  });

  describe('integration tests', () => {
    it('should post navigation messages for both error types', () => {
      const error = { message: 'forbidden' };
      const resource: Resource = {
        metadata: {
          name: 'test',
          namespace: 'default',
        },
      } as Resource;

      service.handleError(error);
      service.handleResourcePendingDeletion(resource);

      expect(postMessageSpy).toHaveBeenCalledTimes(2);
    });

    it('should show alert for non-403 errors', () => {
      const error = { message: 'test error' };

      service.handleError(error);

      expect(luigiCoreService.showAlert).toHaveBeenCalledTimes(1);
      expect(postMessageSpy).not.toHaveBeenCalled();
    });
  });

  describe('redirectToErrorPage', () => {
    it('should navigate to 403 and return true when message contains forbidden', () => {
      expect(
        service.redirectToErrorPage({ message: 'Access is forbidden' }),
      ).toBe(true);

      expectNavigatedTo('/error/403');
    });

    it('should navigate to 403 and return true when message contains access denied', () => {
      expect(service.redirectToErrorPage({ message: 'access denied' })).toBe(
        true,
      );

      expectNavigatedTo('/error/403');
    });

    it('should navigate to 404 and return true when statusCode is 404', () => {
      expect(service.redirectToErrorPage({ statusCode: 404 })).toBe(true);

      expectNavigatedTo('/error/404');
    });

    it('should prefer 403 over 404 when the error matches both', () => {
      expect(
        service.redirectToErrorPage({ message: 'forbidden', statusCode: 404 }),
      ).toBe(true);

      expect(postMessageSpy).toHaveBeenCalledTimes(1);
      expectNavigatedTo('/error/403');
    });

    it('should return false without navigating for other status codes', () => {
      expect(service.redirectToErrorPage({ statusCode: 500 })).toBe(false);

      expect(postMessageSpy).not.toHaveBeenCalled();
    });

    it('should return false without navigating when only the message says not found', () => {
      expect(service.redirectToErrorPage({ message: 'Not found' })).toBe(false);

      expect(postMessageSpy).not.toHaveBeenCalled();
    });

    it('should return false without navigating for an undefined error', () => {
      expect(service.redirectToErrorPage(undefined)).toBe(false);

      expect(postMessageSpy).not.toHaveBeenCalled();
    });

    it('should add a history entry when replaceHistory is false', () => {
      expect(service.redirectToErrorPage({ message: 'forbidden' }, false)).toBe(
        true,
      );

      expect(postMessageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: 'luigi.navigation.open',
          params: expect.objectContaining({
            link: '/error/403',
            preventHistoryEntry: false,
          }),
        }),
        '*',
      );
    });

    it('should add a history entry for 404 when replaceHistory is false', () => {
      expect(service.redirectToErrorPage({ statusCode: 404 }, false)).toBe(
        true,
      );

      expect(postMessageSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          msg: 'luigi.navigation.open',
          params: expect.objectContaining({
            link: '/error/404',
            preventHistoryEntry: false,
          }),
        }),
        '*',
      );
    });

    it('should never show an alert', () => {
      service.redirectToErrorPage({ message: 'Some error' });

      expect(luigiCoreService.showAlert).not.toHaveBeenCalled();
    });
  });
});
