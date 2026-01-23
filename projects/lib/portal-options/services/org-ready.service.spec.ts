import { TestBed } from '@angular/core/testing';
import { AuthService, ConfigService, EnvConfigService } from '@openmfp/portal-ui-lib';
import { ResourceService } from '@platform-mesh/portal-ui-lib/services';
import { of } from 'rxjs';
import { OrganizationReadyService } from './org-ready.service';

async function flushMicrotasks(times = 3) {
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
}

describe('OrganizationReadyService', () => {
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockEnvConfigService: jest.Mocked<EnvConfigService>;
  let mockAuthService: jest.Mocked<AuthService>;
  let mockResourceService: jest.Mocked<ResourceService>;

  beforeEach(() => {
    mockConfigService = {
      getPortalConfig: jest.fn(),
    } as unknown as jest.Mocked<ConfigService>;

    mockEnvConfigService = {
      getEnvConfig: jest.fn(),
    } as unknown as jest.Mocked<EnvConfigService>;

    mockAuthService = {
      getToken: jest.fn(),
    } as unknown as jest.Mocked<AuthService>;

    mockResourceService = {
      readOrganizationReady: jest.fn(),
    } as unknown as jest.Mocked<ResourceService>;

    mockConfigService.getPortalConfig.mockResolvedValue({
      portalContext: { crdGatewayApiUrl: 'http://crd-gateway' },
    } as any);

    mockEnvConfigService.getEnvConfig.mockResolvedValue({
      idpName: 'account-1',
    } as any);

    mockAuthService.getToken.mockReturnValue('token-1');

    TestBed.configureTestingModule({
      providers: [
        OrganizationReadyService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: EnvConfigService, useValue: mockEnvConfigService },
        { provide: AuthService, useValue: mockAuthService },
        { provide: ResourceService, useValue: mockResourceService },
      ],
    });
  });

  it('should call readOrganizationReady with expected context', async () => {
    mockResourceService.readOrganizationReady.mockReturnValueOnce(of(true));

    const service = TestBed.inject(OrganizationReadyService);
    await flushMicrotasks();
    service.checkOrganizationReady();

    expect(mockResourceService.readOrganizationReady).toHaveBeenCalledTimes(1);
    expect(mockResourceService.readOrganizationReady).toHaveBeenCalledWith({
      portalContext: {
        crdGatewayApiUrl: 'http://crd-gateway',
      },
      token: 'token-1',
      accountId: 'account-1',
    });
  });

  it('should not call readOrganizationReady again after it becomes ready', async () => {
    mockResourceService.readOrganizationReady.mockReturnValueOnce(of(true));

    const service = TestBed.inject(OrganizationReadyService);
    await flushMicrotasks();
    service.checkOrganizationReady();
    service.checkOrganizationReady();

    expect(mockResourceService.readOrganizationReady).toHaveBeenCalledTimes(1);
  });

  it('should keep checking until it becomes ready', async () => {
    mockResourceService.readOrganizationReady
      .mockReturnValueOnce(of(false))
      .mockReturnValueOnce(of(true));

    const service = TestBed.inject(OrganizationReadyService);
    await flushMicrotasks();
    service.checkOrganizationReady();
    service.checkOrganizationReady();
    service.checkOrganizationReady();

    expect(mockResourceService.readOrganizationReady).toHaveBeenCalledTimes(2);
  });

  it('should not perform checks when env idpName is welcome', async () => {
    mockEnvConfigService.getEnvConfig.mockResolvedValueOnce({
      idpName: 'welcome',
    } as any);

    const service = TestBed.inject(OrganizationReadyService);

    await flushMicrotasks();
    service.checkOrganizationReady();
    service.checkOrganizationReady();

    expect(mockResourceService.readOrganizationReady).not.toHaveBeenCalled();
  });
});

