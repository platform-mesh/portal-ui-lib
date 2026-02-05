import { OrganizationReadyService } from './org-ready.service';
import { TestBed } from '@angular/core/testing';
import {
  AuthService,
  ConfigService,
  EnvConfigService,
  LuigiCoreService,
} from '@openmfp/portal-ui-lib';
import { LogicalClusterService } from '@platform-mesh/portal-ui-lib/services';
import { mock } from 'jest-mock-extended';
import { of, throwError } from 'rxjs';

async function flushMicrotasks(times = 3) {
  for (let i = 0; i < times; i++) {
    await Promise.resolve();
  }
}

describe('OrganizationReadyService', () => {
  let mockConfigService: jest.Mocked<ConfigService>;
  let mockEnvConfigService: jest.Mocked<EnvConfigService>;
  let mockAuthService: jest.Mocked<AuthService>;
  let mockLogicalClusterService: jest.Mocked<LogicalClusterService>;
  let mockLuigiCoreService: jest.Mocked<LuigiCoreService>;

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

  afterEach(() => {
    jest.clearAllMocks();
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
    const navigateMock = jest.fn();
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

  it('should handle error in logicalClusterService.read and continue checking', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const error = new Error('API error');

    mockLogicalClusterService.read
      .mockReturnValueOnce(throwError(() => error))
      .mockReturnValueOnce(
        of({
          status: {
            phase: 'Ready',
          },
        }),
      );

    const service = TestBed.inject(OrganizationReadyService);
    await flushMicrotasks();
    service.checkOrganizationReady();
    await flushMicrotasks();
    service.checkOrganizationReady();
    await flushMicrotasks();

    expect(consoleSpy).toHaveBeenCalledWith('Org check failed', error);
    expect(mockLogicalClusterService.read).toHaveBeenCalledTimes(2);

    consoleSpy.mockRestore();
  });

  it('should log error but not break check stream on read failure', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const error = new Error('Network timeout');

    mockLogicalClusterService.read.mockReturnValueOnce(throwError(() => error));

    const service = TestBed.inject(OrganizationReadyService);
    await flushMicrotasks();
    service.checkOrganizationReady();
    await flushMicrotasks();

    expect(consoleSpy).toHaveBeenCalledWith('Org check failed', error);
    expect(mockLogicalClusterService.read).toHaveBeenCalledTimes(1);

    consoleSpy.mockRestore();
  });

  it('should allow subsequent checks after error', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    mockLogicalClusterService.read
      .mockReturnValueOnce(throwError(() => new Error('First error')))
      .mockReturnValueOnce(throwError(() => new Error('Second error')))
      .mockReturnValueOnce(
        of({
          status: {
            phase: 'Ready',
          },
        }),
      );

    const service = TestBed.inject(OrganizationReadyService);
    await flushMicrotasks();

    service.checkOrganizationReady();
    await flushMicrotasks();

    service.checkOrganizationReady();
    await flushMicrotasks();

    service.checkOrganizationReady();
    await flushMicrotasks();

    expect(consoleSpy).toHaveBeenCalledTimes(2);
    expect(mockLogicalClusterService.read).toHaveBeenCalledTimes(3);

    consoleSpy.mockRestore();
  });

  it('should not navigate to error page when read fails', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const navigateMock = jest.fn();
    mockLuigiCoreService.navigation.mockReturnValue({
      navigate: navigateMock,
    } as any);

    mockLogicalClusterService.read.mockReturnValueOnce(
      throwError(() => new Error('API error')),
    );

    const service = TestBed.inject(OrganizationReadyService);
    await flushMicrotasks();
    service.checkOrganizationReady();
    await flushMicrotasks();

    expect(navigateMock).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it('should handle different error types', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
    const httpError = { status: 500, message: 'Internal Server Error' };

    mockLogicalClusterService.read.mockReturnValueOnce(
      throwError(() => httpError),
    );

    const service = TestBed.inject(OrganizationReadyService);
    await flushMicrotasks();
    service.checkOrganizationReady();
    await flushMicrotasks();

    expect(consoleSpy).toHaveBeenCalledWith('Org check failed', httpError);

    consoleSpy.mockRestore();
  });

  it('should continue checking after multiple consecutive errors', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    mockLogicalClusterService.read
      .mockReturnValueOnce(throwError(() => new Error('Error 1')))
      .mockReturnValueOnce(throwError(() => new Error('Error 2')))
      .mockReturnValueOnce(throwError(() => new Error('Error 3')))
      .mockReturnValueOnce(
        of({
          status: {
            phase: 'Ready',
          },
        }),
      );

    const service = TestBed.inject(OrganizationReadyService);
    await flushMicrotasks();

    for (let i = 0; i < 4; i++) {
      service.checkOrganizationReady();
      await flushMicrotasks();
    }

    expect(consoleSpy).toHaveBeenCalledTimes(3);
    expect(mockLogicalClusterService.read).toHaveBeenCalledTimes(4);

    consoleSpy.mockRestore();
  });
});
