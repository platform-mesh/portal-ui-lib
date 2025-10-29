import { LuigiExtendedGlobalContextConfigServiceImpl } from './luigi-extended-global-context-config.service';
import { TestBed } from '@angular/core/testing';
import {
  AuthService,
  ConfigService,
  EnvConfigService,
} from '@openmfp/portal-ui-lib';
import { ResourceService } from '@platform-mesh/portal-ui-lib/services';
import { of, throwError } from 'rxjs';

describe('LuigiExtendedGlobalContextConfigServiceImpl', () => {
  let service: LuigiExtendedGlobalContextConfigServiceImpl;
  let mockResourceService: jest.Mocked<ResourceService>;
  let mockEnvConfigService: jest.Mocked<EnvConfigService>;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockAuthService: jest.Mocked<AuthService>;

  beforeEach(() => {
    const resourceServiceMock = {
      readAccountInfo: jest.fn(),
    } as jest.Mocked<Partial<ResourceService>>;

    const envConfigServiceMock = {
      getEnvConfig: jest.fn(),
    } as jest.Mocked<Partial<EnvConfigService>>;

    const configServiceMock = {
      getPortalConfig: jest.fn(),
    } as jest.Mocked<Partial<ConfigService>>;

    const authServiceMock = {
      getToken: jest.fn(),
    } as jest.Mocked<Partial<AuthService>>;

    TestBed.configureTestingModule({
      providers: [
        LuigiExtendedGlobalContextConfigServiceImpl,
        { provide: ResourceService, useValue: resourceServiceMock },
        { provide: EnvConfigService, useValue: envConfigServiceMock },
        { provide: ConfigService, useValue: configServiceMock },
        { provide: AuthService, useValue: authServiceMock },
      ],
    });

    service = TestBed.inject(LuigiExtendedGlobalContextConfigServiceImpl);
    mockResourceService = TestBed.inject(
      ResourceService,
    ) as jest.Mocked<ResourceService>;
    mockEnvConfigService = TestBed.inject(
      EnvConfigService,
    ) as jest.Mocked<EnvConfigService>;
    mockConfigService = TestBed.inject(
      ConfigService,
    ) as jest.Mocked<ConfigService>;
    mockAuthService = TestBed.inject(AuthService) as jest.Mocked<AuthService>;
  });

  it('should return organizationId with the same entityId when resource is successfully read', async () => {
    const mockPortalConfig = {
      portalContext: {
        crdGatewayApiUrl: 'https://api.example.com/graphql',
      },
    } as any;
    const mockEnvConfig = {
      idpName: 'test-org',
    } as any;
    const mockResource = {
      metadata: {
        annotations: {
          'kcp.io/cluster': 'cluster-123',
        },
      },
      spec: {
        organization: {
          originClusterId: 'originClusterId',
        },
      },
    } as any;
    const mockToken = 'mock-token';

    mockConfigService.getPortalConfig.mockResolvedValue(mockPortalConfig);
    mockEnvConfigService.getEnvConfig.mockResolvedValue(mockEnvConfig);
    mockAuthService.getToken.mockReturnValue(mockToken);
    mockResourceService.readAccountInfo.mockReturnValue(of(mockResource));

    const result = await service.createLuigiExtendedGlobalContext();

    expect(result).toEqual({
      organizationId: 'originClusterId/test-org',
      kcpCA: 'dW5kZWZpbmVk',
      organization: 'test-org',
      entityId: 'originClusterId/test-org',
      entityName: 'test-org',
    });

    expect(mockResourceService.readAccountInfo).toHaveBeenCalledWith({
      portalContext: {
        crdGatewayApiUrl: 'https://api.example.com/graphql',
      },
      token: 'mock-token',
      accountId: 'test-org',
    });
  });

  it('should return empty object when cluster annotations not present', async () => {
    const mockPortalConfig = {
      portalContext: {
        crdGatewayApiUrl: 'https://api.example.com/graphql',
      },
    } as any;
    const mockEnvConfig = {
      idpName: 'test-org',
    } as any;
    const mockResource = {
      metadata: {},
    } as any;
    const mockToken = 'mock-token';

    mockConfigService.getPortalConfig.mockResolvedValue(mockPortalConfig);
    mockEnvConfigService.getEnvConfig.mockResolvedValue(mockEnvConfig);
    mockAuthService.getToken.mockReturnValue(mockToken);
    mockResourceService.readAccountInfo.mockReturnValue(of(mockResource));

    const result = await service.createLuigiExtendedGlobalContext();

    expect(result).toEqual({});

    expect(mockResourceService.readAccountInfo).toHaveBeenCalledWith({
      portalContext: {
        crdGatewayApiUrl: 'https://api.example.com/graphql',
      },
      token: 'mock-token',
      accountId: 'test-org',
    });
  });

  it('should return empty object for welcome idp provider', async () => {
    const mockPortalConfig = {
      portalContext: {
        crdGatewayApiUrl: 'https://api.example.com/graphql',
      },
    } as any;
    const mockEnvConfig = {
      idpName: 'welcome',
    } as any;
    const mockResource = {
      metadata: {},
    } as any;
    const mockToken = 'mock-token';

    mockConfigService.getPortalConfig.mockResolvedValue(mockPortalConfig);
    mockEnvConfigService.getEnvConfig.mockResolvedValue(mockEnvConfig);
    mockAuthService.getToken.mockReturnValue(mockToken);
    mockResourceService.readAccountInfo.mockReturnValue(of(mockResource));

    const result = await service.createLuigiExtendedGlobalContext();

    expect(result).toEqual({});
    expect(mockResourceService.readAccountInfo).not.toHaveBeenCalled();
  });

  it('should return empty object when resource read fails', async () => {
    const mockPortalConfig = {
      portalContext: {
        crdGatewayApiUrl: 'https://api.example.com/graphql',
      },
    } as any;
    const mockEnvConfig = {
      idpName: 'test-org',
    } as any;
    const mockToken = 'mock-token';

    const error = new Error('API Error');
    mockConfigService.getPortalConfig.mockResolvedValue(mockPortalConfig);
    mockEnvConfigService.getEnvConfig.mockResolvedValue(mockEnvConfig);
    mockAuthService.getToken.mockReturnValue(mockToken);
    mockResourceService.readAccountInfo.mockReturnValue(
      throwError(() => error),
    );

    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    const result = await service.createLuigiExtendedGlobalContext();

    expect(result).toEqual({});
    expect(consoleSpy).toHaveBeenCalledWith(
      'Failed to read entity test-org from core_platform_mesh_io',
      error,
    );

    consoleSpy.mockRestore();
  });
});
