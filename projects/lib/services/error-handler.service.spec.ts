import { ErrorHandlerService } from './error-handler.service';
import { TestBed } from '@angular/core/testing';
import { LuigiCoreService } from '@openmfp/portal-ui-lib';
import { Resource } from '@platform-mesh/portal-ui-lib/models';
import { MockedObject } from 'vitest';
import { mock } from 'vitest-mock-extended';

describe('ErrorHandlerService', () => {
  let service: ErrorHandlerService;
  let luigiCoreService: MockedObject<LuigiCoreService>;

  const mockNavigation = {
    navigate: vi.fn(),
  };

  beforeEach(() => {
    luigiCoreService = mock<LuigiCoreService>();
    luigiCoreService.navigation.mockReturnValue(mockNavigation as any);
    luigiCoreService.showAlert = vi.fn();

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

  describe('handleError', () => {
    it('should navigate to 403 when error message contains forbidden', () => {
      const error = { message: 'Access is forbidden' };

      service.handleError(error);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('/error/403');
      expect(luigiCoreService.showAlert).not.toHaveBeenCalled();
    });

    it('should navigate to 403 when error message contains Forbidden with capital F', () => {
      const error = { message: 'Forbidden resource' };

      service.handleError(error);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('/error/403');
      expect(luigiCoreService.showAlert).not.toHaveBeenCalled();
    });

    it('should navigate to 403 when error message contains FORBIDDEN in uppercase', () => {
      const error = { message: 'FORBIDDEN' };

      service.handleError(error);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('/error/403');
      expect(luigiCoreService.showAlert).not.toHaveBeenCalled();
    });

    it('should navigate to 403 when error message contains access denied', () => {
      const error = { message: 'access denied to resource' };

      service.handleError(error);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('/error/403');
      expect(luigiCoreService.showAlert).not.toHaveBeenCalled();
    });

    it('should navigate to 403 when error message contains Access Denied with capitals', () => {
      const error = { message: 'Access Denied' };

      service.handleError(error);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('/error/403');
      expect(luigiCoreService.showAlert).not.toHaveBeenCalled();
    });

    it('should show alert when error message does not contain forbidden or access denied', () => {
      const error = { message: 'Resource not found' };

      service.handleError(error);

      expect(luigiCoreService.showAlert).toHaveBeenCalledWith({
        text: 'Resource not found',
        type: 'error',
      });
      expect(mockNavigation.navigate).not.toHaveBeenCalled();
    });

    it('should show alert with default message when error message is empty string', () => {
      const error = { message: '' };

      service.handleError(error);

      expect(luigiCoreService.showAlert).toHaveBeenCalledWith({
        text: 'An unknown error occurred',
        type: 'error',
      });
      expect(mockNavigation.navigate).not.toHaveBeenCalled();
    });

    it('should show alert with default message when error message is undefined', () => {
      const error = { message: undefined } as any;

      service.handleError(error);

      expect(luigiCoreService.showAlert).toHaveBeenCalledWith({
        text: 'An unknown error occurred',
        type: 'error',
      });
      expect(mockNavigation.navigate).not.toHaveBeenCalled();
    });

    it('should show alert with default message when error message is null', () => {
      const error = { message: null } as any;

      service.handleError(error);

      expect(luigiCoreService.showAlert).toHaveBeenCalledWith({
        text: 'An unknown error occurred',
        type: 'error',
      });
      expect(mockNavigation.navigate).not.toHaveBeenCalled();
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

      expect(mockNavigation.navigate).toHaveBeenCalledWith('/error/403');
      expect(luigiCoreService.showAlert).not.toHaveBeenCalled();
    });

    it('should show alert for generic error messages', () => {
      const error = { message: 'Internal server error' };

      service.handleError(error);

      expect(luigiCoreService.showAlert).toHaveBeenCalledWith({
        text: 'Internal server error',
        type: 'error',
      });
      expect(mockNavigation.navigate).not.toHaveBeenCalled();
    });

    it('should show alert for validation errors', () => {
      const error = { message: 'Invalid input provided' };

      service.handleError(error);

      expect(luigiCoreService.showAlert).toHaveBeenCalledWith({
        text: 'Invalid input provided',
        type: 'error',
      });
      expect(mockNavigation.navigate).not.toHaveBeenCalled();
    });

    it('should handle error message with forbidden in the middle', () => {
      const error = { message: 'This action is forbidden for you' };

      service.handleError(error);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('/error/403');
      expect(luigiCoreService.showAlert).not.toHaveBeenCalled();
    });

    it('should handle error message with access denied at the end', () => {
      const error = { message: 'You do not have access denied' };

      service.handleError(error);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('/error/403');
      expect(luigiCoreService.showAlert).not.toHaveBeenCalled();
    });

    it('should be case-insensitive for forbidden check', () => {
      const error = { message: 'fOrBiDdEn' };

      service.handleError(error);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('/error/403');
      expect(luigiCoreService.showAlert).not.toHaveBeenCalled();
    });

    it('should handle error with special characters', () => {
      const error = { message: 'Error: 403 - Access Denied!' };

      service.handleError(error);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('/error/403');
      expect(luigiCoreService.showAlert).not.toHaveBeenCalled();
    });

    it('should show alert when message contains similar but different words', () => {
      const error = { message: 'forbid access' };

      service.handleError(error);

      expect(luigiCoreService.showAlert).toHaveBeenCalledWith({
        text: 'forbid access',
        type: 'error',
      });
      expect(mockNavigation.navigate).not.toHaveBeenCalled();
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

      expect(mockNavigation.navigate).toHaveBeenCalledWith('/error/422');
    });

    it('should call luigiCoreService.navigation', () => {
      service.handleResourcePendingDeletion(mockResource);
      expect(luigiCoreService.navigation).toHaveBeenCalled();
    });

    it('should call navigation.navigate with exactly /error/422', () => {
      service.handleResourcePendingDeletion(mockResource);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('/error/422');
      expect(mockNavigation.navigate).toHaveBeenCalledTimes(1);
    });
  });

  describe('integration tests', () => {
    it('should use same navigation instance for both methods', () => {
      const error = { message: 'forbidden' };
      const resource: Resource = {
        metadata: {
          name: 'test',
          namespace: 'default',
        },
      } as Resource;

      service.handleError(error);
      const firstCallCount = mockNavigation.navigate.mock.calls.length;

      service.handleResourcePendingDeletion(resource);
      const secondCallCount = mockNavigation.navigate.mock.calls.length;

      expect(secondCallCount).toBe(firstCallCount + 1);
    });

    it('should show alert for non-403 errors', () => {
      const error = { message: 'test error' };

      service.handleError(error);

      expect(luigiCoreService.showAlert).toHaveBeenCalledTimes(1);
      expect(mockNavigation.navigate).not.toHaveBeenCalled();
    });
  });

  describe('isUnauthorizedAccess', () => {
    it('should return true when message contains forbidden', () => {
      const error = { message: 'Access is forbidden' };

      expect(service.isUnauthorizedAccess(error)).toBe(true);
    });

    it('should return true when message contains access denied', () => {
      const error = { message: 'access denied' };

      expect(service.isUnauthorizedAccess(error)).toBe(true);
    });

    it('should return false for other errors', () => {
      const error = { message: 'Not found' };

      expect(service.isUnauthorizedAccess(error)).toBe(false);
    });

    it('should handle undefined message', () => {
      const error = { message: undefined };

      expect(service.isUnauthorizedAccess(error)).toBe(false);
    });
  });
});
