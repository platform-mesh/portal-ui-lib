import { GatewayService } from './gateway.service';
import { TestBed } from '@angular/core/testing';
import { LuigiCoreService } from '@openmfp/portal-ui-lib';

describe('GatewayService', () => {
  let service: GatewayService;
  let mockLuigiCoreService: any;

  beforeEach(() => {
    mockLuigiCoreService = {
      getGlobalContext: jest.fn().mockReturnValue({
        portalContext: {
          crdGatewayApiUrl: 'https://example.com/:org1:acc1/graphql',
        },
      }),
      showAlert: jest.fn(),
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
      const result = service.getGatewayUrl(nodeContext);
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
  });

  describe('updateCrdGatewayUrlWithEntityPath', () => {
    it('should update crdGatewayApiUrl with new kcp path', () => {
      const globalContext = mockLuigiCoreService.getGlobalContext();
      service.updateCrdGatewayUrlWithEntityPath(':org1:acc3');
      expect(globalContext.portalContext.crdGatewayApiUrl).toBe(
        'https://example.com/:org1:acc3/graphql',
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
      const result = service.resolveKcpPath(nodeContext);
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
      const result = service.resolveKcpPath(nodeContext, true);
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
      const result = service.resolveKcpPath(nodeContext);
      expect(result).toBe(':org1:acc1');
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
      const result = service.resolveKcpPath(nodeContext);
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
      const result = service.resolveKcpPath(nodeContext);
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

      const result = service.resolveKcpPath(nodeContext);

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

      const result = service.resolveKcpPath(nodeContext);

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

      const result = service.resolveKcpPath(nodeContext);

      expect(result).toBe('');
    });
  });
});
