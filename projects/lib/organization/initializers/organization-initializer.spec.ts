import { TestBed } from '@angular/core/testing';
import { ApplicationInitStatus } from '@angular/core';
import { Router } from '@angular/router';
import { EnvConfigService } from '@openmfp/portal-ui-lib';
import { organizationInitializer } from './organization-initializer';

describe('organizationInitializer', () => {
  let envMock: jest.Mocked<EnvConfigService>;
  let routerMock: jest.Mocked<Router>;

  beforeEach(() => {
    envMock = {
      getEnvConfig: jest.fn(),
    } as unknown as jest.Mocked<EnvConfigService>;

    routerMock = {
      navigate: jest.fn(),
    } as unknown as jest.Mocked<Router>;

    TestBed.configureTestingModule({
      providers: [
        organizationInitializer(),
        { provide: EnvConfigService, useValue: envMock },
        { provide: Router, useValue: routerMock },
      ],
    });
  });

  it('should call getEnvConfig and not navigate on success', async () => {
    envMock.getEnvConfig.mockResolvedValueOnce(undefined as any);

    await TestBed.inject(ApplicationInitStatus).donePromise;

    expect(envMock.getEnvConfig).toHaveBeenCalledTimes(1);
    expect(routerMock.navigate).not.toHaveBeenCalled();
  });

  it('should navigate to "welcome" when getEnvConfig throws', async () => {
    envMock.getEnvConfig.mockRejectedValueOnce(new Error('fail'));

    await TestBed.inject(ApplicationInitStatus).donePromise;

    expect(envMock.getEnvConfig).toHaveBeenCalledTimes(1);
    expect(routerMock.navigate).toHaveBeenCalledWith(['welcome']);
  });
});
