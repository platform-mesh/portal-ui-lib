import { LuigiExtendedGlobalContextConfigServiceImpl } from './luigi-extended-global-context-config.service';
import { TestBed } from '@angular/core/testing';
import {
  AuthService,
  ConfigService,
  EnvConfigService,
} from '@openmfp/portal-ui-lib';
import { AccountInfoService } from '@platform-mesh/portal-ui-lib/services';
import { mock } from 'jest-mock-extended';
import { of, throwError } from 'rxjs';

describe('LuigiExtendedGlobalContextConfigServiceImpl', () => {
  let service: LuigiExtendedGlobalContextConfigServiceImpl;
  let mockAccountInfoService: jest.Mocked<AccountInfoService>;
  let mockEnvConfigService: jest.Mocked<EnvConfigService>;
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockAuthService: jest.Mocked<AuthService>;

  beforeEach(() => {
    mockAccountInfoService = mock();
    mockEnvConfigService = mock();
    mockConfigService = mock();
    mockAuthService = mock();

    TestBed.configureTestingModule({
      providers: [
        LuigiExtendedGlobalContextConfigServiceImpl,
        { provide: AccountInfoService, useValue: mockAccountInfoService },
        { provide: EnvConfigService, useValue: mockEnvConfigService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: AuthService, useValue: mockAuthService },
      ],
    });

    service = TestBed.inject(LuigiExtendedGlobalContextConfigServiceImpl);
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
    mockAccountInfoService.read.mockReturnValue(of(mockResource));

    const result = await service.createLuigiExtendedGlobalContext();

    expect(result).toEqual({
      organizationId: 'originClusterId/test-org',
      kcpCA: 'dW5kZWZpbmVk',
      kcpPath: 'root:orgs:test-org',
      organization: 'test-org',
      entityId: 'originClusterId/test-org',
      entityName: 'test-org',
    });

    expect(mockAccountInfoService.read).toHaveBeenCalledWith({
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
    mockAccountInfoService.read.mockReturnValue(of(mockResource));

    const result = await service.createLuigiExtendedGlobalContext();

    expect(result).toEqual({});

    expect(mockAccountInfoService.read).toHaveBeenCalledWith({
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
    mockAccountInfoService.read.mockReturnValue(of(mockResource));

    const result = await service.createLuigiExtendedGlobalContext();

    expect(result).toEqual({});
    expect(mockAccountInfoService.read).not.toHaveBeenCalled();
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
    mockAccountInfoService.read.mockReturnValue(throwError(() => error));

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
