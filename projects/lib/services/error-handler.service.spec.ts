import { ErrorHandlerService } from './error-handler.service';
import { TestBed } from '@angular/core/testing';
import { LuigiCoreService } from '@openmfp/portal-ui-lib';
import { Resource } from '@platform-mesh/portal-ui-lib/models';
import { mock } from 'jest-mock-extended';

describe('ErrorHandlerService', () => {
  let service: ErrorHandlerService;
  let luigiCoreService: jest.Mocked<LuigiCoreService>;

  const mockNavigation = {
    navigate: jest.fn(),
  };

  beforeEach(() => {
    luigiCoreService = mock<LuigiCoreService>();
    luigiCoreService.navigation.mockReturnValue(mockNavigation as any);

    TestBed.configureTestingModule({
      providers: [
        ErrorHandlerService,
        { provide: LuigiCoreService, useValue: luigiCoreService },
      ],
    });

    service = TestBed.inject(ErrorHandlerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handlePostErrorNavigation', () => {
    it('should navigate to 403 when error message contains forbidden', () => {
      const error = { message: 'Access is forbidden' };

      service.handleUnauthorizedAccess(error);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('/error/403');
    });

    it('should navigate to 403 when error message contains Forbidden with capital F', () => {
      const error = { message: 'Forbidden resource' };

      service.handleUnauthorizedAccess(error);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('/error/403');
    });

    it('should navigate to 403 when error message contains FORBIDDEN in uppercase', () => {
      const error = { message: 'FORBIDDEN' };

      service.handleUnauthorizedAccess(error);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('/error/403');
    });

    it('should navigate to 403 when error message contains access denied', () => {
      const error = { message: 'access denied to resource' };

      service.handleUnauthorizedAccess(error);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('/error/403');
    });

    it('should navigate to 403 when error message contains Access Denied with capitals', () => {
      const error = { message: 'Access Denied' };

      service.handleUnauthorizedAccess(error);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('/error/403');
    });

    it('should navigate to 404 when error message does not contain forbidden or access denied', () => {
      const error = { message: 'Resource not found' };

      service.handleUnauthorizedAccess(error);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('/error/404');
    });

    it('should navigate to 404 when error message is empty string', () => {
      const error = { message: '' };

      service.handleUnauthorizedAccess(error);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('/error/404');
    });

    it('should navigate to 404 when error message is undefined', () => {
      const error = { message: undefined } as any;

      service.handleUnauthorizedAccess(error);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('/error/404');
    });

    it('should navigate to 404 when error message is null', () => {
      const error = { message: null } as any;

      service.handleUnauthorizedAccess(error);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('/error/404');
    });

    it('should call luigiCoreService.navigation', () => {
      const error = { message: 'Some error' };

      service.handleUnauthorizedAccess(error);

      expect(luigiCoreService.navigation).toHaveBeenCalled();
    });

    it('should call navigation.navigate exactly once', () => {
      const error = { message: 'Some error' };

      service.handleUnauthorizedAccess(error);

      expect(mockNavigation.navigate).toHaveBeenCalledTimes(1);
    });

    it('should handle error with both forbidden and access denied', () => {
      const error = { message: 'Access denied: forbidden resource' };

      service.handleUnauthorizedAccess(error);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('/error/403');
    });

    it('should navigate to 404 for generic error messages', () => {
      const error = { message: 'Internal server error' };

      service.handleUnauthorizedAccess(error);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('/error/404');
    });

    it('should navigate to 404 for validation errors', () => {
      const error = { message: 'Invalid input provided' };

      service.handleUnauthorizedAccess(error);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('/error/404');
    });

    it('should handle error message with forbidden in the middle', () => {
      const error = { message: 'This action is forbidden for you' };

      service.handleUnauthorizedAccess(error);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('/error/403');
    });

    it('should handle error message with access denied at the end', () => {
      const error = { message: 'You do not have access denied' };

      service.handleUnauthorizedAccess(error);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('/error/403');
    });

    it('should be case-insensitive for forbidden check', () => {
      const error = { message: 'fOrBiDdEn' };

      service.handleUnauthorizedAccess(error);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('/error/403');
    });

    it('should handle error with special characters', () => {
      const error = { message: 'Error: 403 - Access Denied!' };

      service.handleUnauthorizedAccess(error);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('/error/403');
    });

    it('should navigate to 404 when message contains similar but different words', () => {
      const error = { message: 'forbid access' };

      service.handleUnauthorizedAccess(error);

      expect(mockNavigation.navigate).toHaveBeenCalledWith('/error/404');
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
      expect(() =>
        service.handleResourcePendingDeletion(mockResource),
      ).toThrow();

      expect(mockNavigation.navigate).toHaveBeenCalledWith('/error/422');
    });

    it('should throw error with resource name in message', () => {
      expect(() => service.handleResourcePendingDeletion(mockResource)).toThrow(
        'The resource test-resource is pending deletion.',
      );
    });

    it('should call luigiCoreService.navigation', () => {
      expect(() =>
        service.handleResourcePendingDeletion(mockResource),
      ).toThrow();

      expect(luigiCoreService.navigation).toHaveBeenCalled();
    });

    it('should handle resource with different name', () => {
      const differentResource: Resource = {
        metadata: {
          name: 'another-resource',
          namespace: 'default',
        },
      } as Resource;

      expect(() =>
        service.handleResourcePendingDeletion(differentResource),
      ).toThrow('The resource another-resource is pending deletion.');
    });

    it('should include exact resource name from metadata', () => {
      const resourceWithSpecialName: Resource = {
        metadata: {
          name: 'my-app-v1.2.3',
          namespace: 'production',
        },
      } as Resource;

      expect(() =>
        service.handleResourcePendingDeletion(resourceWithSpecialName),
      ).toThrow('The resource my-app-v1.2.3 is pending deletion.');
    });

    it('should call navigation.navigate with exactly /error/422', () => {
      expect(() =>
        service.handleResourcePendingDeletion(mockResource),
      ).toThrow();

      expect(mockNavigation.navigate).toHaveBeenCalledWith('/error/422');
      expect(mockNavigation.navigate).toHaveBeenCalledTimes(1);
    });

    it('should throw Error instance', () => {
      expect(() => service.handleResourcePendingDeletion(mockResource)).toThrow(
        Error,
      );
    });

    it('should handle resource with hyphenated name', () => {
      const hyphenatedResource: Resource = {
        metadata: {
          name: 'my-test-resource-name',
          namespace: 'default',
        },
      } as Resource;

      expect(() =>
        service.handleResourcePendingDeletion(hyphenatedResource),
      ).toThrow('The resource my-test-resource-name is pending deletion.');
    });

    it('should handle resource with numeric name', () => {
      const numericResource: Resource = {
        metadata: {
          name: 'resource-123',
          namespace: 'default',
        },
      } as Resource;

      expect(() =>
        service.handleResourcePendingDeletion(numericResource),
      ).toThrow('The resource resource-123 is pending deletion.');
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

      service.handleUnauthorizedAccess(error);
      const firstCallCount = mockNavigation.navigate.mock.calls.length;

      expect(() => service.handleResourcePendingDeletion(resource)).toThrow();
      const secondCallCount = mockNavigation.navigate.mock.calls.length;

      expect(secondCallCount).toBe(firstCallCount + 1);
    });

    it('should call luigiCoreService.navigation for each error handling', () => {
      const error = { message: 'test error' };

      service.handleUnauthorizedAccess(error);

      expect(luigiCoreService.navigation).toHaveBeenCalledTimes(1);
    });
  });
});
