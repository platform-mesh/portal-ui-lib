import { GatewayService } from './gateway.service';
import { TestBed } from '@angular/core/testing';
import { LuigiCoreService } from '@openmfp/portal-ui-lib';
import { kcpRootOrgsPath } from '@platform-mesh/portal-ui-lib/models';

describe('GatewayService', () => {
  let service: GatewayService;
  let mockLuigiCoreService: any;

  beforeEach(() => {
    mockLuigiCoreService = {
      getGlobalContext: vi.fn().mockReturnValue({
        portalContext: {
          crdGatewayApiUrl: `https://example.com/${kcpRootOrgsPath}:org1:acc1/graphql`,
        },
      }),
      showAlert: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        GatewayService,
        { provide: LuigiCoreService, useValue: mockLuigiCoreService },
      ],
    });

    service = TestBed.inject(GatewayService);
  });

  describe('getGatewayUrl', () => {
    it('should replace current kcp path with new one', () => {
      const nodeContext = {
        portalContext: {
          crdGatewayApiUrl: `https://example.com/${kcpRootOrgsPath}:org1:acc1/graphql`,
        },
        token: 'token',
        accountId: 'entityId',
        kcpPath: `${kcpRootOrgsPath}:org1:acc2`,
      };
      const result = service.getGatewayUrl(nodeContext as any);
      expect(result).toBe(
        `https://example.com/${kcpRootOrgsPath}:org1:acc2/graphql`,
      );
    });

    it('should slice current kcp path when readFromParentKcpPath is true', () => {
      const nodeContext = {
        portalContext: {
          crdGatewayApiUrl: `https://example.com/${kcpRootOrgsPath}:org1:acc1/graphql`,
        },
        token: 'token',
        accountId: 'acc1',
      };
      const result = service.getGatewayUrl(nodeContext as any, true);
      expect(result).toBe(
        `https://example.com/${kcpRootOrgsPath}:org1/graphql`,
      );
    });

    it('should use gatewayUrl current path when nodeContext.kcpPath is not provided', () => {
      const nodeContext = {
        portalContext: {
          crdGatewayApiUrl: `https://example.com/${kcpRootOrgsPath}:org1:acc1/graphql`,
        },
        token: 'token',
        accountId: 'entityId',
      };

      const result = service.getGatewayUrl(nodeContext as any);
      expect(result).toBe(
        `https://example.com/${kcpRootOrgsPath}:org1:acc1/graphql`,
      );
    });

    it('should handle url without kcpRootOrgsPath and still replace with resolved path', () => {
      const nodeContext = {
        portalContext: {
          crdGatewayApiUrl: 'https://example.com/invalid-url',
        },
        token: 'token',
        accountId: 'entityId',
      };

      const result = service.getGatewayUrl(nodeContext as any);
      // extractKcpPath returns '', replace('', '') leaves string unchanged
      expect(result).toBe('https://example.com/invalid-url');
    });

    it('should slice only when parent delimiter exists, otherwise keep as-is (readFromParentKcpPath true, no colon in extracted path)', () => {
      const nodeContext = {
        portalContext: {
          crdGatewayApiUrl: 'https://example.com/org1/graphql',
        },
        token: 'token',
        accountId: 'entityId',
      };

      const result = service.getGatewayUrl(nodeContext as any, true);
      // no kcpRootOrgsPath match → extractKcpPath returns '' → resolveKcpPath returns ''
      expect(result).toBe('https://example.com/org1/graphql');
    });

    it('should replace kcp path when url has additional path suffix after kcp segment', () => {
      const nodeContext = {
        portalContext: {
          crdGatewayApiUrl: `https://example.com/${kcpRootOrgsPath}:org1:acc1/abcdf/dfer/klo`,
        },
        token: 'token',
        accountId: 'entityId',
        kcpPath: `${kcpRootOrgsPath}:org1:acc2`,
      };
      const result = service.getGatewayUrl(nodeContext as any);
      expect(result).toBe(
        `https://example.com/${kcpRootOrgsPath}:org1:acc2/abcdf/dfer/klo`,
      );
    });

    it('should slice kcp path when url has additional path suffix and readFromParentKcpPath is true', () => {
      const nodeContext = {
        portalContext: {
          crdGatewayApiUrl: `https://example.com/${kcpRootOrgsPath}:org1:acc1/abcdf/dfer/klo`,
        },
        token: 'token',
        accountId: 'acc1',
      };
      const result = service.getGatewayUrl(nodeContext as any, true);
      expect(result).toBe(
        `https://example.com/${kcpRootOrgsPath}:org1/abcdf/dfer/klo`,
      );
    });
  });

  describe('updateCrdGatewayUrlWithEntityPath', () => {
    it('should update crdGatewayApiUrl with new kcp path', () => {
      const globalContext = mockLuigiCoreService.getGlobalContext();
      service.updateCrdGatewayUrlWithEntityPath(`${kcpRootOrgsPath}:org1:acc3`);
      expect(globalContext.portalContext.crdGatewayApiUrl).toBe(
        `https://example.com/${kcpRootOrgsPath}:org1:acc3/graphql`,
      );
    });

    it('should replace kcpRootOrgsPath segment with new path in deeper url', () => {
      const globalContextObj = {
        portalContext: {
          crdGatewayApiUrl: `https://api.example.com/clusters/${kcpRootOrgsPath}:org1:acc1/graphql`,
        },
      };
      mockLuigiCoreService.getGlobalContext.mockReturnValue(globalContextObj);

      service.updateCrdGatewayUrlWithEntityPath(`${kcpRootOrgsPath}:org1:acc9`);

      expect(globalContextObj.portalContext.crdGatewayApiUrl).toBe(
        `https://api.example.com/clusters/${kcpRootOrgsPath}:org1:acc9/graphql`,
      );
    });

    it('should replace kcp path when url has additional path suffix after kcp segment', () => {
      const globalContextObj = {
        portalContext: {
          crdGatewayApiUrl: `https://example.com/${kcpRootOrgsPath}:org1:acc1/abcdf/dfer/klo`,
        },
      };
      mockLuigiCoreService.getGlobalContext.mockReturnValue(globalContextObj);

      service.updateCrdGatewayUrlWithEntityPath(`${kcpRootOrgsPath}:org1:acc9`);

      expect(globalContextObj.portalContext.crdGatewayApiUrl).toBe(
        `https://example.com/${kcpRootOrgsPath}:org1:acc9/abcdf/dfer/klo`,
      );
    });
  });

  describe('resolveKcpPath', () => {
    it('should return kcpPath from context if present', () => {
      const nodeContext = {
        portalContext: {
          crdGatewayApiUrl: `https://example.com/${kcpRootOrgsPath}:org1:acc1/graphql`,
        },
        token: 'token',
        accountId: 'entityId',
        kcpPath: `${kcpRootOrgsPath}:org1:acc2`,
      };
      const result = service.resolveKcpPath(nodeContext as any);
      expect(result).toBe(`${kcpRootOrgsPath}:org1:acc2`);
    });

    it('should slice path when readFromParentKcpPath is true', () => {
      const nodeContext = {
        portalContext: {
          crdGatewayApiUrl: `https://example.com/${kcpRootOrgsPath}:org1:acc1/graphql`,
        },
        token: 'token',
        accountId: 'entityId',
      };
      const result = service.resolveKcpPath(nodeContext as any, true);
      expect(result).toBe(`${kcpRootOrgsPath}:org1`);
    });

    it('should return current kcp path if no override provided', () => {
      const nodeContext = {
        portalContext: {
          crdGatewayApiUrl: `https://example.com/${kcpRootOrgsPath}:org1:acc1/graphql`,
        },
        token: 'token',
        accountId: 'entityId',
      };
      const result = service.resolveKcpPath(nodeContext as any);
      expect(result).toBe(`${kcpRootOrgsPath}:org1:acc1`);
    });

    it('should NOT slice when readFromParentKcpPath is true but no ":" after kcpRootOrgsPath', () => {
      const nodeContext = {
        portalContext: {
          crdGatewayApiUrl: `https://example.com/${kcpRootOrgsPath}/graphql`,
        },
        token: 'token',
        accountId: 'entityId',
      };

      const result = service.resolveKcpPath(nodeContext as any, true);
      // kcpRootOrgsPath itself contains ':' so lastIndex points to last ':' in 'root:orgs'
      expect(result).toBe('root');
    });

    it('should slice kcpPath override from context when readFromParentKcpPath is true', () => {
      const nodeContext = {
        portalContext: {
          crdGatewayApiUrl: `https://example.com/${kcpRootOrgsPath}:org1:acc1/graphql`,
        },
        token: 'token',
        accountId: 'entityId',
        kcpPath: `${kcpRootOrgsPath}:org1:acc2:ws`,
      };

      const result = service.resolveKcpPath(nodeContext as any, true);
      expect(result).toBe(`${kcpRootOrgsPath}:org1:acc2`);
    });

    it('should return empty string when url has no kcpRootOrgsPath segment', () => {
      const nodeContext = {
        portalContext: {
          crdGatewayApiUrl: 'https://example.com/invalid-url',
        },
        token: 'token',
        accountId: 'entityId',
      };

      const result = service.resolveKcpPath(nodeContext as any);
      expect(result).toBe('');
    });

    it('should return empty string for URL without /graphql suffix and no kcpRootOrgsPath', () => {
      const nodeContext = {
        portalContext: {
          crdGatewayApiUrl: 'https://example.com/:org1:acc1/api',
        },
        token: 'token',
        accountId: 'entityId',
      };

      const result = service.resolveKcpPath(nodeContext as any);
      expect(result).toBe('');
    });

    it('should return empty string for empty URL', () => {
      const nodeContext = {
        portalContext: {
          crdGatewayApiUrl: '',
        },
        token: 'token',
        accountId: 'entityId',
      };

      const result = service.resolveKcpPath(nodeContext as any);
      expect(result).toBe('');
    });

    it('should extract kcp path from url with additional path suffix after kcp segment', () => {
      const nodeContext = {
        portalContext: {
          crdGatewayApiUrl: `https://example.com/${kcpRootOrgsPath}:org1:acc1/abcdf/dfer/klo`,
        },
        token: 'token',
        accountId: 'entityId',
      };
      const result = service.resolveKcpPath(nodeContext as any);
      expect(result).toBe(`${kcpRootOrgsPath}:org1:acc1`);
    });

    it('should slice kcp path from url with additional path suffix when readFromParentKcpPath is true', () => {
      const nodeContext = {
        portalContext: {
          crdGatewayApiUrl: `https://example.com/${kcpRootOrgsPath}:org1:acc1/abcdf/dfer/klo`,
        },
        token: 'token',
        accountId: 'entityId',
      };
      const result = service.resolveKcpPath(nodeContext as any, true);
      expect(result).toBe(`${kcpRootOrgsPath}:org1`);
    });
  });
});
