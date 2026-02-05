import { PortalNodeContext } from '../models/luigi-context';
import { PortalLuigiNode } from '../models/luigi-node';
import { AccountPathResolverService } from './account-path-resolver.service';
import { CrdGatewayKcpPatchResolver } from './crd-gateway-kcp-patch-resolver.service';
import { NodeContextProcessingServiceImpl } from './node-context-processing.service';
import { TestBed } from '@angular/core/testing';
import { AccountInfo } from '@platform-mesh/portal-ui-lib/models';
import {
  AccountInfoService,
  OrganizationReadyService,
} from '@platform-mesh/portal-ui-lib/services';
import { of, throwError } from 'rxjs';
import { MockedObject } from 'vitest';
import { mock } from 'vitest-mock-extended';

describe('NodeContextProcessingServiceImpl', () => {
  let service: NodeContextProcessingServiceImpl;
  let crdGatewayKcpPatchResolver: MockedObject<CrdGatewayKcpPatchResolver>;
  let accountPathResolver: MockedObject<AccountPathResolverService>;
  let accountInfoService: MockedObject<AccountInfoService>;
  let organizationReadyService: MockedObject<OrganizationReadyService>;

  const mockEntityId = 'entity-123';
  const mockKind = 'Account';
  const mockKcpPath = 'root:orgs:test-org:entity-123';
  const mockAccountPath = '/test-org/entity-123';
  const mockToken = 'test-token';

  let mockEntityNode: PortalLuigiNode;
  let mockContext: PortalNodeContext;

  const mockAccountInfo: AccountInfo = {
    spec: {
      organization: {
        originClusterId: 'cluster-org-1',
        name: 'test-org',
      },
      clusterInfo: {
        ca: 'certificate-data',
      },
      account: {
        originClusterId: 'cluster-acc-1',
      },
    },
  } as AccountInfo;

  beforeEach(() => {
    crdGatewayKcpPatchResolver = mock<CrdGatewayKcpPatchResolver>();
    accountPathResolver = mock<AccountPathResolverService>();
    accountInfoService = mock<AccountInfoService>();
    organizationReadyService = mock<OrganizationReadyService>();

    mockEntityNode = {
      defineEntity: {
        graphqlEntity: {
          kind: mockKind,
        },
      },
      context: {},
    } as PortalLuigiNode;

    mockContext = {
      portalContext: {
        crdGatewayApiUrl: 'https://api.example.com',
      },
      token: mockToken,
    } as PortalNodeContext;

    TestBed.configureTestingModule({
      providers: [
        NodeContextProcessingServiceImpl,
        {
          provide: CrdGatewayKcpPatchResolver,
          useValue: crdGatewayKcpPatchResolver,
        },
        { provide: AccountPathResolverService, useValue: accountPathResolver },
        { provide: AccountInfoService, useValue: accountInfoService },
        {
          provide: OrganizationReadyService,
          useValue: organizationReadyService,
        },
      ],
    });

    service = TestBed.inject(NodeContextProcessingServiceImpl);

    crdGatewayKcpPatchResolver.resolveCrdGatewayKcpPath.mockResolvedValue(
      mockKcpPath,
    );
    accountPathResolver.resolveAccountHierarchy.mockReturnValue(
      mockAccountPath,
    );
    accountInfoService.read.mockReturnValue(of(mockAccountInfo));
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('processNodeContext', () => {
    it('should return early when entityId is missing', async () => {
      await service.processNodeContext('', mockEntityNode, mockContext);

      expect(
        crdGatewayKcpPatchResolver.resolveCrdGatewayKcpPath,
      ).not.toHaveBeenCalled();
      expect(
        accountPathResolver.resolveAccountHierarchy,
      ).not.toHaveBeenCalled();
      expect(accountInfoService.read).not.toHaveBeenCalled();
    });

    it('should return early when entityId is null', async () => {
      await service.processNodeContext(
        null as any,
        mockEntityNode,
        mockContext,
      );

      expect(
        crdGatewayKcpPatchResolver.resolveCrdGatewayKcpPath,
      ).not.toHaveBeenCalled();
    });

    it('should return early when kind is missing', async () => {
      const nodeWithoutKind: PortalLuigiNode = {
        defineEntity: {
          graphqlEntity: {},
        },
        context: {},
      } as any;

      await service.processNodeContext(
        mockEntityId,
        nodeWithoutKind,
        mockContext,
      );

      expect(
        crdGatewayKcpPatchResolver.resolveCrdGatewayKcpPath,
      ).not.toHaveBeenCalled();
    });

    it('should return early when defineEntity is missing', async () => {
      const nodeWithoutDefine: PortalLuigiNode = {
        context: {},
      } as any;

      await service.processNodeContext(
        mockEntityId,
        nodeWithoutDefine,
        mockContext,
      );

      expect(
        crdGatewayKcpPatchResolver.resolveCrdGatewayKcpPath,
      ).not.toHaveBeenCalled();
    });

    it('should call resolveCrdGatewayKcpPath with correct parameters', async () => {
      await service.processNodeContext(
        mockEntityId,
        mockEntityNode,
        mockContext,
      );

      expect(
        crdGatewayKcpPatchResolver.resolveCrdGatewayKcpPath,
      ).toHaveBeenCalledWith(mockEntityNode, mockEntityId, mockKind);
    });

    it('should call resolveAccountHierarchy with correct parameters', async () => {
      await service.processNodeContext(
        mockEntityId,
        mockEntityNode,
        mockContext,
      );

      expect(accountPathResolver.resolveAccountHierarchy).toHaveBeenCalledWith(
        mockEntityNode,
        mockEntityId,
        mockKind,
      );
    });

    it('should update context with kcpPath', async () => {
      await service.processNodeContext(
        mockEntityId,
        mockEntityNode,
        mockContext,
      );

      expect(mockContext.kcpPath).toBe(mockKcpPath);
    });

    it('should update context with entityName', async () => {
      await service.processNodeContext(
        mockEntityId,
        mockEntityNode,
        mockContext,
      );

      expect(mockContext.entityName).toBe(mockEntityId);
    });

    it('should update context with entityKind', async () => {
      await service.processNodeContext(
        mockEntityId,
        mockEntityNode,
        mockContext,
      );

      expect(mockContext.entityKind).toBe(mockKind);
    });

    it('should update context with accountPath', async () => {
      await service.processNodeContext(
        mockEntityId,
        mockEntityNode,
        mockContext,
      );

      expect(mockContext.accountPath).toBe(mockAccountPath);
    });

    it('should update entityNode context with same fields', async () => {
      await service.processNodeContext(
        mockEntityId,
        mockEntityNode,
        mockContext,
      );

      expect(mockEntityNode.context.kcpPath).toBe(mockKcpPath);
      expect(mockEntityNode.context.entityName).toBe(mockEntityId);
      expect(mockEntityNode.context.entityKind).toBe(mockKind);
      expect(mockEntityNode.context.accountPath).toBe(mockAccountPath);
    });

    it('should call accountInfoService.read with correct parameters', async () => {
      await service.processNodeContext(
        mockEntityId,
        mockEntityNode,
        mockContext,
      );

      expect(accountInfoService.read).toHaveBeenCalledWith({
        portalContext: {
          crdGatewayApiUrl: 'https://api.example.com',
        },
        token: mockToken,
        accountId: mockEntityId,
      });
    });

    it('should update context with organizationId from accountInfo', async () => {
      await service.processNodeContext(
        mockEntityId,
        mockEntityNode,
        mockContext,
      );

      expect(mockContext.organizationId).toBe('cluster-org-1/test-org');
    });

    it('should update context with base64 encoded kcpCA', async () => {
      await service.processNodeContext(
        mockEntityId,
        mockEntityNode,
        mockContext,
      );

      const expectedCA = btoa('certificate-data');
      expect(mockContext.kcpCA).toBe(expectedCA);
    });

    it('should update context with entityId from accountInfo', async () => {
      await service.processNodeContext(
        mockEntityId,
        mockEntityNode,
        mockContext,
      );

      expect(mockContext.entityId).toBe(`cluster-acc-1/${mockEntityId}`);
    });

    it('should not update accountInfo fields when read fails', async () => {
      const mockContext = {
        portalContext: {
          crdGatewayApiUrl: 'https://api.example.com',
        },
        token: mockToken,
      } as any as PortalNodeContext;
      accountInfoService.read.mockReturnValue(
        throwError(() => new Error('API error')),
      );

      await service.processNodeContext(
        mockEntityId,
        mockEntityNode,
        mockContext,
      );

      expect(mockContext.organizationId).toBeUndefined();
      expect(mockContext.kcpCA).toBeUndefined();
      expect(mockContext.entityId).toBeUndefined();
    });

    it('should update entityNode context with accountInfo fields', async () => {
      await service.processNodeContext(
        mockEntityId,
        mockEntityNode,
        mockContext,
      );

      expect(mockEntityNode.context.organizationId).toBe(
        'cluster-org-1/test-org',
      );
      expect(mockEntityNode.context.kcpCA).toBe(btoa('certificate-data'));
      expect(mockEntityNode.context.entityId).toBe(
        `cluster-acc-1/${mockEntityId}`,
      );
    });

    it('should call checkOrganizationReady when accountInfo is retrieved', async () => {
      await service.processNodeContext(
        mockEntityId,
        mockEntityNode,
        mockContext,
      );

      expect(
        organizationReadyService.checkOrganizationReady,
      ).toHaveBeenCalled();
    });

    it('should handle accountInfoService error silently', async () => {
      accountInfoService.read.mockReturnValue(
        throwError(() => new Error('API error')),
      );

      await expect(
        service.processNodeContext(mockEntityId, mockEntityNode, mockContext),
      ).resolves.not.toThrow();

      expect(
        organizationReadyService.checkOrganizationReady,
      ).not.toHaveBeenCalled();
    });

    it('should handle special characters in CA certificate', async () => {
      const specialCA = 'cert+with/special=chars';
      const accountInfoWithSpecialCA: AccountInfo = {
        spec: {
          organization: {
            originClusterId: 'cluster-org-1',
          },
          clusterInfo: {
            ca: specialCA,
          },
          account: {
            originClusterId: 'cluster-acc-1',
          },
        },
      } as AccountInfo;

      accountInfoService.read.mockReturnValue(of(accountInfoWithSpecialCA));

      await service.processNodeContext(
        mockEntityId,
        mockEntityNode,
        mockContext,
      );

      expect(mockContext.kcpCA).toBe(btoa(specialCA));
    });

    it('should process all steps in sequence', async () => {
      await service.processNodeContext(
        mockEntityId,
        mockEntityNode,
        mockContext,
      );

      expect(
        crdGatewayKcpPatchResolver.resolveCrdGatewayKcpPath,
      ).toHaveBeenCalled();
      expect(accountPathResolver.resolveAccountHierarchy).toHaveBeenCalled();
      expect(accountInfoService.read).toHaveBeenCalled();
      expect(
        organizationReadyService.checkOrganizationReady,
      ).toHaveBeenCalled();
    });

    it('should handle empty entityNode context', async () => {
      const nodeWithEmptyContext: PortalLuigiNode = {
        defineEntity: {
          graphqlEntity: {
            kind: mockKind,
          },
        },
        context: {},
      } as PortalLuigiNode;

      await service.processNodeContext(
        mockEntityId,
        nodeWithEmptyContext,
        mockContext,
      );

      expect(nodeWithEmptyContext.context.kcpPath).toBe(mockKcpPath);
    });

    it('should preserve existing context fields', async () => {
      const contextWithExistingFields = {
        ...mockContext,
        customField: 'custom-value',
      };

      await service.processNodeContext(
        mockEntityId,
        mockEntityNode,
        contextWithExistingFields,
      );

      expect((contextWithExistingFields as any).customField).toBe(
        'custom-value',
      );
    });

    it('should handle different kind values', async () => {
      const differentKind = 'Organization';
      const nodeWithDifferentKind: PortalLuigiNode = {
        defineEntity: {
          graphqlEntity: {
            kind: differentKind,
          },
        },
        context: {},
      } as PortalLuigiNode;

      await service.processNodeContext(
        mockEntityId,
        nodeWithDifferentKind,
        mockContext,
      );

      expect(mockContext.entityKind).toBe(differentKind);
    });

    it('should call resolveCrdGatewayKcpPath before resolveAccountHierarchy', async () => {
      const callOrder: string[] = [];
      crdGatewayKcpPatchResolver.resolveCrdGatewayKcpPath.mockImplementation(
        async () => {
          callOrder.push('kcpPath');
          return mockKcpPath;
        },
      );
      accountPathResolver.resolveAccountHierarchy.mockImplementation(() => {
        callOrder.push('accountPath');
        return mockAccountPath;
      });

      await service.processNodeContext(
        mockEntityId,
        mockEntityNode,
        mockContext,
      );

      expect(callOrder).toEqual(['kcpPath', 'accountPath']);
    });
  });
});
