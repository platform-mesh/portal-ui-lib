import { kcpRootOrgsPath } from '../models/constants';
import { LuigiExtendedGlobalContextConfigServiceImpl } from './luigi-extended-global-context-config.service';
import { TestBed } from '@angular/core/testing';
import { EnvConfigService } from '@openmfp/portal-ui-lib';
import { mock } from 'jest-mock-extended';

describe('LuigiExtendedGlobalContextConfigServiceImpl', () => {
  let service: LuigiExtendedGlobalContextConfigServiceImpl;
  let envConfigService: jest.Mocked<EnvConfigService>;

  beforeEach(() => {
    envConfigService = mock<EnvConfigService>();

    TestBed.configureTestingModule({
      providers: [
        LuigiExtendedGlobalContextConfigServiceImpl,
        { provide: EnvConfigService, useValue: envConfigService },
      ],
    });

    service = TestBed.inject(LuigiExtendedGlobalContextConfigServiceImpl);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createLuigiExtendedGlobalContext', () => {
    it('should return empty object when idpName is welcome', async () => {
      envConfigService.getEnvConfig.mockResolvedValue({
        idpName: 'welcome',
      } as any);

      const result = await service.createLuigiExtendedGlobalContext();

      expect(result).toEqual({});
    });

    it('should return context with organization when idpName is not welcome', async () => {
      envConfigService.getEnvConfig.mockResolvedValue({
        idpName: 'test-org',
      } as any);

      const result = await service.createLuigiExtendedGlobalContext();

      expect(result).toEqual({
        organization: 'test-org',
        kcpPath: `${kcpRootOrgsPath}:test-org`,
        entityName: 'test-org',
      });
    });

    it('should call envConfigService.getEnvConfig', async () => {
      envConfigService.getEnvConfig.mockResolvedValue({
        idpName: 'test-org',
      } as any);

      await service.createLuigiExtendedGlobalContext();

      expect(envConfigService.getEnvConfig).toHaveBeenCalled();
    });

    it('should call envConfigService.getEnvConfig only once', async () => {
      envConfigService.getEnvConfig.mockResolvedValue({
        idpName: 'test-org',
      } as any);

      await service.createLuigiExtendedGlobalContext();

      expect(envConfigService.getEnvConfig).toHaveBeenCalledTimes(1);
    });

    it('should construct kcpPath with kcpRootOrgsPath constant', async () => {
      envConfigService.getEnvConfig.mockResolvedValue({
        idpName: 'my-organization',
      } as any);

      const result = await service.createLuigiExtendedGlobalContext();

      expect(result.kcpPath).toBe(`${kcpRootOrgsPath}:my-organization`);
    });

    it('should set organization to idpName value', async () => {
      envConfigService.getEnvConfig.mockResolvedValue({
        idpName: 'acme-corp',
      } as any);

      const result = await service.createLuigiExtendedGlobalContext();

      expect(result.organization).toBe('acme-corp');
    });

    it('should set entityName to idpName value', async () => {
      envConfigService.getEnvConfig.mockResolvedValue({
        idpName: 'enterprise-inc',
      } as any);

      const result = await service.createLuigiExtendedGlobalContext();

      expect(result.entityName).toBe('enterprise-inc');
    });

    it('should handle idpName with special characters', async () => {
      envConfigService.getEnvConfig.mockResolvedValue({
        idpName: 'org-name_123',
      } as any);

      const result = await service.createLuigiExtendedGlobalContext();

      expect(result).toEqual({
        organization: 'org-name_123',
        kcpPath: `${kcpRootOrgsPath}:org-name_123`,
        entityName: 'org-name_123',
      });
    });

    it('should handle idpName with hyphens', async () => {
      envConfigService.getEnvConfig.mockResolvedValue({
        idpName: 'my-test-org',
      } as any);

      const result = await service.createLuigiExtendedGlobalContext();

      expect(result.organization).toBe('my-test-org');
      expect(result.kcpPath).toBe(`${kcpRootOrgsPath}:my-test-org`);
      expect(result.entityName).toBe('my-test-org');
    });

    it('should handle case-sensitive idpName', async () => {
      envConfigService.getEnvConfig.mockResolvedValue({
        idpName: 'TestOrg',
      } as any);

      const result = await service.createLuigiExtendedGlobalContext();

      expect(result.organization).toBe('TestOrg');
    });

    it('should handle welcome with different casing', async () => {
      envConfigService.getEnvConfig.mockResolvedValue({
        idpName: 'welcome',
      } as any);

      const result = await service.createLuigiExtendedGlobalContext();

      expect(result).toEqual({});
    });

    it('should not return empty object for Welcome with capital W', async () => {
      envConfigService.getEnvConfig.mockResolvedValue({
        idpName: 'Welcome',
      } as any);

      const result = await service.createLuigiExtendedGlobalContext();

      expect(result).not.toEqual({});
      expect(result.organization).toBe('Welcome');
    });

    it('should handle numeric idpName', async () => {
      envConfigService.getEnvConfig.mockResolvedValue({
        idpName: '12345',
      } as any);

      const result = await service.createLuigiExtendedGlobalContext();

      expect(result.organization).toBe('12345');
      expect(result.kcpPath).toBe(`${kcpRootOrgsPath}:12345`);
    });

    it('should return object with all three properties for non-welcome idp', async () => {
      envConfigService.getEnvConfig.mockResolvedValue({
        idpName: 'test-org',
      } as any);

      const result = await service.createLuigiExtendedGlobalContext();

      expect(Object.keys(result)).toEqual([
        'organization',
        'kcpPath',
        'entityName',
      ]);
    });

    it('should return object with no properties for welcome idp', async () => {
      envConfigService.getEnvConfig.mockResolvedValue({
        idpName: 'welcome',
      } as any);

      const result = await service.createLuigiExtendedGlobalContext();

      expect(Object.keys(result)).toHaveLength(0);
    });

    it('should propagate error when envConfigService throws', async () => {
      const error = new Error('Config service error');
      envConfigService.getEnvConfig.mockRejectedValue(error);

      await expect(service.createLuigiExtendedGlobalContext()).rejects.toThrow(
        'Config service error',
      );
    });

    it('should handle envConfig with additional properties', async () => {
      envConfigService.getEnvConfig.mockResolvedValue({
        idpName: 'test-org',
        oauthServerUrl: 'https://auth.example.com',
        clientId: 'client123',
      } as any);

      const result = await service.createLuigiExtendedGlobalContext();

      expect(result.organization).toBe('test-org');
    });

    it('should handle empty string idpName', async () => {
      envConfigService.getEnvConfig.mockResolvedValue({
        idpName: '',
      } as any);

      const result = await service.createLuigiExtendedGlobalContext();

      expect(result).toEqual({
        organization: '',
        kcpPath: `${kcpRootOrgsPath}:`,
        entityName: '',
      });
    });

    it('should use same idpName for all three context properties', async () => {
      const idpName = 'consistent-org';
      envConfigService.getEnvConfig.mockResolvedValue({
        idpName,
      } as any);

      const result = await service.createLuigiExtendedGlobalContext();

      expect(result.organization).toBe(idpName);
      expect(result.entityName).toBe(idpName);
      expect(result.kcpPath).toContain(idpName);
    });
  });
});
