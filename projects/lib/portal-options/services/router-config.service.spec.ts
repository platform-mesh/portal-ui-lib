import { CustomRoutingConfigServiceImpl } from './router-config.service';
import { TestBed } from '@angular/core/testing';
import { ClientEnvironment, EnvConfigService } from '@openmfp/portal-ui-lib';

describe('CustomRoutingConfigServiceImpl', () => {
  let service: CustomRoutingConfigServiceImpl;
  let mockEnvConfigService: jest.Mocked<EnvConfigService>;

  const mockClientEnvironment: ClientEnvironment = {
    baseDomain: 'test.example.com',
    idpName: 'test-idp',
  } as ClientEnvironment;

  beforeEach(() => {
    const envConfigServiceMock = {
      getEnvConfig: jest.fn(),
    } as jest.Mocked<Partial<EnvConfigService>>;

    TestBed.configureTestingModule({
      providers: [
        CustomRoutingConfigServiceImpl,
        { provide: EnvConfigService, useValue: envConfigServiceMock },
      ],
    });

    service = TestBed.inject(CustomRoutingConfigServiceImpl);
    mockEnvConfigService = TestBed.inject(
      EnvConfigService,
    ) as jest.Mocked<EnvConfigService>;
  });

  describe('constructor and initialization', () => {
    it('should be created', () => {
      expect(service).toBeTruthy();
    });

    it('should call getEnvConfig on initialization', () => {
      expect(mockEnvConfigService.getEnvConfig).toHaveBeenCalled();
    });
  });

  describe('getEnvConfig', () => {
    it('should set envConfig when getEnvConfig is called', async () => {
      mockEnvConfigService.getEnvConfig.mockResolvedValue(
        mockClientEnvironment,
      );

      await service.getEnvConfig();

      expect(service['envConfig']).toEqual(mockClientEnvironment);
    });

    it('should handle error when getEnvConfig fails', async () => {
      const error = new Error('Failed to get env config');
      mockEnvConfigService.getEnvConfig.mockRejectedValue(error);

      await expect(service.getEnvConfig()).rejects.toThrow(
        'Failed to get env config',
      );
    });
  });

  describe('getRoutingConfig', () => {
    beforeEach(() => {
      Object.defineProperty(window, 'location', {
        value: {
          hostname: 'test.example.com',
        },
        writable: true,
      });
    });

    it('should return routing config with pageNotFoundHandler', () => {
      const config = service.getRoutingConfig();

      expect(config).toBeDefined();
      expect(config.pageNotFoundHandler).toBeDefined();
      expect(typeof config.pageNotFoundHandler).toBe('function');
    });

    it('should redirect to welcome when hostname does not match baseDomain', async () => {
      service['envConfig'] = mockClientEnvironment;

      Object.defineProperty(window, 'location', {
        value: {
          hostname: 'different.example.com',
        },
        writable: true,
      });

      const config = service.getRoutingConfig();
      const result = await config.pageNotFoundHandler();

      expect(result).toEqual({
        redirectTo: 'welcome',
        keepURL: true,
      });
    });

    it('should redirect to error/404 when hostname matches baseDomain', async () => {
      service['envConfig'] = mockClientEnvironment;

      Object.defineProperty(window, 'location', {
        value: {
          hostname: 'test.example.com',
        },
        writable: true,
      });

      const config = service.getRoutingConfig();
      const result = await config.pageNotFoundHandler();

      expect(result).toEqual({
        redirectTo: 'error/404',
        keepURL: true,
      });
    });

    it('should redirect to error/404 when envConfig is null', async () => {
      service['envConfig'] = null;

      Object.defineProperty(window, 'location', {
        value: {
          hostname: 'any.example.com',
        },
        writable: true,
      });

      const config = service.getRoutingConfig();
      const result = await config.pageNotFoundHandler();

      expect(result).toEqual({
        redirectTo: 'error/404',
        keepURL: true,
      });
    });

    it('should redirect to error/404 when envConfig.baseDomain is undefined', async () => {
      service['envConfig'] = {
        ...mockClientEnvironment,
        baseDomain: undefined,
      };

      Object.defineProperty(window, 'location', {
        value: {
          hostname: 'any.example.com',
        },
        writable: true,
      });

      const config = service.getRoutingConfig();
      const result = await config.pageNotFoundHandler();

      expect(result).toEqual({
        redirectTo: 'error/404',
        keepURL: true,
      });
    });

    it('should handle exact hostname match', async () => {
      service['envConfig'] = mockClientEnvironment;

      Object.defineProperty(window, 'location', {
        value: {
          hostname: 'test.example.com',
        },
        writable: true,
      });

      const config = service.getRoutingConfig();
      const result = await config.pageNotFoundHandler();

      expect(result).toEqual({
        redirectTo: 'error/404',
        keepURL: true,
      });
    });

    it('should handle subdomain hostname match', async () => {
      service['envConfig'] = mockClientEnvironment;

      Object.defineProperty(window, 'location', {
        value: {
          hostname: 'subdomain.test.example.com',
        },
        writable: true,
      });

      const config = service.getRoutingConfig();
      const result = await config.pageNotFoundHandler();

      expect(result).toEqual({
        redirectTo: 'welcome',
        keepURL: true,
      });
    });
  });

  describe('integration tests', () => {
    it('should work correctly with real env config flow', async () => {
      mockEnvConfigService.getEnvConfig.mockResolvedValue(
        mockClientEnvironment,
      );

      Object.defineProperty(window, 'location', {
        value: {
          hostname: 'test.example.com',
        },
        writable: true,
      });

      await service.getEnvConfig();

      const config = service.getRoutingConfig();
      const result = await config.pageNotFoundHandler();

      expect(result).toEqual({
        redirectTo: 'error/404',
        keepURL: true,
      });
    });

    it('should handle env config loading failure gracefully', async () => {
      mockEnvConfigService.getEnvConfig.mockRejectedValue(
        new Error('Network error'),
      );

      Object.defineProperty(window, 'location', {
        value: {
          hostname: 'any.example.com',
        },
        writable: true,
      });

      try {
        await service.getEnvConfig();
      } catch (error) {}

      const config = service.getRoutingConfig();
      const result = await config.pageNotFoundHandler();

      expect(result).toEqual({
        redirectTo: 'error/404',
        keepURL: true,
      });
    });
  });
});
