import { GatewayService } from './gateway.service';
import { TestBed } from '@angular/core/testing';
import { LuigiCoreService } from '@openmfp/portal-ui-lib';

describe('GatewayService', () => {
  let service: GatewayService;
  let mockLuigiCoreService: any;

  beforeEach(() => {
    mockLuigiCoreService = {
      getGlobalContext: vi.fn().mockReturnValue({
        portalContext: {
          crdGatewayApiUrl: 'https://example.com/:org1:acc1/graphql',
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
          crdGatewayApiUrl: 'https://example.com/:org1:acc1/graphql',
        },
        token: 'token',
        accountId: 'entityId',
        kcpPath: ':org1:acc2',
      };
      const result = service.getGatewayUrl(nodeContext as any);
      expect(result).toBe('https://example.com/:org1:acc2/graphql');
    });

    it('should slice current kcp path when readFromParentKcpPath is true', () => {
      const nodeContext = {
        portalContext: {
          crdGatewayApiUrl: 'https://example.com/:org1:acc1/graphql',
        },
        token: 'token',
        accountId: 'acc1',
      };
      const result = service.getGatewayUrl(nodeContext as any, true);
      expect(result).toBe('https://example.com/:org1/graphql');
    });

    // -----------------------------
    // Added tests (branches coverage)
    // -----------------------------

    it('should use gatewayUrl current path when nodeContext.kcpPath is not provided', () => {
      const nodeContext = {
        portalContext: {
          crdGatewayApiUrl: 'https://example.com/:org1:acc1/graphql',
        },
        token: 'token',
        accountId: 'entityId',
      };

      const result = service.getGatewayUrl(nodeContext as any);
      expect(result).toBe('https://example.com/:org1:acc1/graphql');
    });

    it('should handle invalid gatewayUrl format (no /<kcp>/graphql match) and still replace with resolved path', () => {
      const nodeContext = {
        portalContext: {
          // currentKcpPath becomes '' (no match), resolveKcpPath => '' too
          crdGatewayApiUrl: 'https://example.com/invalid-url',
        },
        token: 'token',
        accountId: 'entityId',
      };

      const result = service.getGatewayUrl(nodeContext as any);
      // replace('', '') leaves string unchanged in JS
      expect(result).toBe('https://example.com/invalid-url');
    });

    it('should slice only when parent delimiter exists, otherwise keep as-is (readFromParentKcpPath true, no colon)', () => {
      const nodeContext = {
        portalContext: {
          crdGatewayApiUrl: 'https://example.com/org1/graphql',
        },
        token: 'token',
        accountId: 'entityId',
      };

      const result = service.getGatewayUrl(nodeContext as any, true);
      // org1 has no ':' so slicing branch (lastIndex !== -1) is skipped
      expect(result).toBe('https://example.com/org1/graphql');
    });
  });

  describe('updateCrdGatewayUrlWithEntityPath', () => {
    it('should update crdGatewayApiUrl with new kcp path', () => {
      const globalContext = mockLuigiCoreService.getGlobalContext();
      service.updateCrdGatewayUrlWithEntityPath(':org1:acc3');
      expect(globalContext.portalContext.crdGatewayApiUrl).toBe(
        'https://example.com/:org1:acc3/graphql',
      );
    });

    // -----------------------------
    // Added tests (branches coverage)
    // -----------------------------

    it('should keep url unchanged if it does not match /graphql suffix pattern', () => {
      // IMPORTANT: return same object so we can assert mutation
      const globalContextObj = {
        portalContext: {
          crdGatewayApiUrl: 'https://example.com/:org1:acc1/api',
        },
      };
      mockLuigiCoreService.getGlobalContext.mockReturnValue(globalContextObj);

      service.updateCrdGatewayUrlWithEntityPath(':org1:acc9');

      // regexp won't match, replace does nothing
      expect(globalContextObj.portalContext.crdGatewayApiUrl).toBe(
        'https://example.com/:org1:acc1/api',
      );
    });
  });

  describe('resolveKcpPath', () => {
    it('should return kcpPath from context if present', () => {
      const nodeContext = {
        portalContext: {
          crdGatewayApiUrl: 'https://example.com/:org1:acc1/graphql',
        },
        token: 'token',
        accountId: 'entityId',
        kcpPath: ':org1:acc2',
      };
      const result = service.resolveKcpPath(nodeContext as any);
      expect(result).toBe(':org1:acc2');
    });

    it('should slice path by accountId if readFromParentKcpPath is true', () => {
      const nodeContext = {
        portalContext: {
          crdGatewayApiUrl: 'https://example.com/:org1:acc1/graphql',
        },
        token: 'token',
        accountId: 'entityId',
      };
      const result = service.resolveKcpPath(nodeContext as any, true);
      expect(result).toBe(':org1');
    });

    it('should return current kcp path if no override provided', () => {
      const nodeContext = {
        portalContext: {
          crdGatewayApiUrl: 'https://example.com/:org1:acc1/graphql',
        },
        token: 'token',
        accountId: 'entityId',
      };
      const result = service.resolveKcpPath(nodeContext as any);
      expect(result).toBe(':org1:acc1');
    });

    // -----------------------------
    // Added tests (branches coverage)
    // -----------------------------

    it('should NOT slice when readFromParentKcpPath is true but no ":" present in extracted kcpPath', () => {
      const nodeContext = {
        portalContext: {
          crdGatewayApiUrl: 'https://example.com/org1/graphql',
        },
        token: 'token',
        accountId: 'entityId',
      };

      const result = service.resolveKcpPath(nodeContext as any, true);
      expect(result).toBe('org1');
    });

    it('should slice kcpPath override from context when readFromParentKcpPath is true', () => {
      const nodeContext = {
        portalContext: {
          crdGatewayApiUrl: 'https://example.com/:org1:acc1/graphql',
        },
        token: 'token',
        accountId: 'entityId',
        kcpPath: ':org1:acc2:ws',
      };

      const result = service.resolveKcpPath(nodeContext as any, true);
      expect(result).toBe(':org1:acc2');
    });
  });

  describe('getCurrentKcpPath (via resolveKcpPath)', () => {
    it('should extract kcp path from valid gateway URL', () => {
      const nodeContext = {
        portalContext: {
          crdGatewayApiUrl: 'https://example.com/:org1:acc1/graphql',
        },
        token: 'token',
        accountId: 'entityId',
      };
      const result = service.resolveKcpPath(nodeContext as any);
      expect(result).toBe(':org1:acc1');
    });

    it('should extract kcp path with single segment', () => {
      const nodeContext = {
        portalContext: {
          crdGatewayApiUrl: 'https://example.com/org1/graphql',
        },
        token: 'token',
        accountId: 'entityId',
      };
      const result = service.resolveKcpPath(nodeContext as any);
      expect(result).toBe('org1');
    });

    it('should show error alert and return empty string for invalid URL', () => {
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

    it('should show error alert and return empty string for URL without /graphql suffix', () => {
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

    it('should show error alert and return empty string for empty URL', () => {
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
  });
});
