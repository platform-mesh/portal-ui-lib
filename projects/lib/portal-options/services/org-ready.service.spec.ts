import { OrganizationReadyService } from './org-ready.service';
import { TestBed } from '@angular/core/testing';
import {
  AuthService,
  ConfigService,
  EnvConfigService,
  LuigiCoreService,
} from '@openmfp/portal-ui-lib';
import { LogicalClusterService } from '@platform-mesh/portal-ui-lib/services';
import { of } from 'rxjs';
import { MockedObject } from 'vitest';
import { mock } from 'vitest-mock-extended';

async function flushMicrotasks(times = 3) {
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
}

describe('OrganizationReadyService', () => {
  let mockConfigService: MockedObject<ConfigService>;
  let mockEnvConfigService: MockedObject<EnvConfigService>;
  let mockAuthService: MockedObject<AuthService>;
  let mockLogicalClusterService: MockedObject<LogicalClusterService>;
  let mockLuigiCoreService: MockedObject<LuigiCoreService>;

  beforeEach(() => {
    mockConfigService = mock();
    mockEnvConfigService = mock();
    mockAuthService = mock();
    mockLogicalClusterService = mock();
    mockLuigiCoreService = mock();

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
        { provide: LogicalClusterService, useValue: mockLogicalClusterService },
        { provide: LuigiCoreService, useValue: mockLuigiCoreService },
      ],
    });
  });

  it('should call readOrganizationReady with expected context', async () => {
    mockLogicalClusterService.read.mockReturnValueOnce(
      of({
        status: {
          phase: 'Ready',
        },
      }),
    );

    const service = TestBed.inject(OrganizationReadyService);
    await flushMicrotasks();
    service.checkOrganizationReady();

    expect(mockLogicalClusterService.read).toHaveBeenCalledTimes(1);
    expect(mockLogicalClusterService.read).toHaveBeenCalledWith({
      portalContext: {
        crdGatewayApiUrl: 'http://crd-gateway',
      },
      token: 'token-1',
      accountId: 'account-1',
    });
  });

  it('should not call readOrganizationReady again after it becomes ready', async () => {
    mockLogicalClusterService.read.mockReturnValueOnce(
      of({
        status: {
          phase: 'Ready',
        },
      }),
    );

    const service = TestBed.inject(OrganizationReadyService);
    await flushMicrotasks();
    service.checkOrganizationReady();
    service.checkOrganizationReady();

    expect(mockLogicalClusterService.read).toHaveBeenCalledTimes(1);
  });

  it('should keep checking until it becomes ready', async () => {
    mockLogicalClusterService.read
      .mockReturnValueOnce(
        of({
          status: {
            phase: 'Initializing',
          },
        }),
      )
      .mockReturnValueOnce(
        of({
          status: {
            phase: 'Ready',
          },
        }),
      );
    const navigateMock = vi.fn();
    mockLuigiCoreService.navigation.mockReturnValue({
      navigate: navigateMock,
    } as any);

    const service = TestBed.inject(OrganizationReadyService);
    await flushMicrotasks();
    service.checkOrganizationReady();
    service.checkOrganizationReady();
    service.checkOrganizationReady();

    expect(navigateMock).toHaveBeenCalledWith('/error/503');
    expect(mockLogicalClusterService.read).toHaveBeenCalledTimes(2);
  });

  it('should not perform checks when env idpName is welcome', async () => {
    mockEnvConfigService.getEnvConfig.mockResolvedValueOnce({
      idpName: 'welcome',
    } as any);

    const service = TestBed.inject(OrganizationReadyService);

    await flushMicrotasks();
    service.checkOrganizationReady();
    service.checkOrganizationReady();

    expect(mockLogicalClusterService.read).not.toHaveBeenCalled();
  });
});
