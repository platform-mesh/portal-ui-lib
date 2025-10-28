import { PortalNodeContext } from '../models/luigi-context';
import { PortalLuigiNode } from '../models/luigi-node';
import { CrdGatewayKcpPatchResolver } from './crd-gateway-kcp-patch-resolver.service';
import { NodeContextProcessingServiceImpl } from './node-context-processing.service';
import { TestBed } from '@angular/core/testing';
import { Resource } from '@platform-mesh/portal-ui-lib/models';
import { ResourceService } from '@platform-mesh/portal-ui-lib/services';
import { of, throwError } from 'rxjs';

describe('NodeContextProcessingServiceImpl', () => {
  let service: NodeContextProcessingServiceImpl;
  let mockResourceService: jest.Mocked<ResourceService>;
  let mockCrdGatewayKcpPatchResolver: jest.Mocked<CrdGatewayKcpPatchResolver>;

  beforeEach(() => {
    mockResourceService = {
      read: jest.fn(),
    } as unknown as jest.Mocked<ResourceService>;

    mockCrdGatewayKcpPatchResolver = {
      resolveCrdGatewayKcpPathForNextAccountEntity: jest.fn(),
    } as unknown as jest.Mocked<CrdGatewayKcpPatchResolver>;

    TestBed.configureTestingModule({
      providers: [
        NodeContextProcessingServiceImpl,
        { provide: ResourceService, useValue: mockResourceService },
        {
          provide: CrdGatewayKcpPatchResolver,
          useValue: mockCrdGatewayKcpPatchResolver,
        },
      ],
    });

    service = TestBed.inject(NodeContextProcessingServiceImpl);
  });

  describe('processNodeContext', () => {
    it('should call resolveCrdGatewayKcpPath and readAndStoreEntityInNodeContext', async () => {
      const entityId = 'test-entity';
      const entityNode: PortalLuigiNode = {
        defineEntity: {
          graphqlEntity: {
            group: 'test.group',
            kind: 'TestKind',
            query: '{ id name }',
          },
        },
        context: {},
      } as any;
      const ctx: PortalNodeContext = {
        portalContext: { crdGatewayApiUrl: 'http://test.com' },
        token: 'test-token',
      } as any;

      const mockEntity: Resource = {
        metadata: {
          name: 'test',
          annotations: { 'kcp.io/cluster': 'cluster1' },
        },
      } as any;

      mockResourceService.read.mockReturnValue(of(mockEntity));

      await service.processNodeContext(entityId, entityNode, ctx);

      expect(
        mockCrdGatewayKcpPatchResolver.resolveCrdGatewayKcpPathForNextAccountEntity,
      ).toHaveBeenCalledWith(entityId, 'TestKind', entityNode);
      expect(mockResourceService.read).toHaveBeenCalled();
    });
  });

  describe('readAndStoreEntityInNodeContext', () => {
    it('should return early if entityId is missing', async () => {
      const entityNode: PortalLuigiNode = {
        defineEntity: {
          graphqlEntity: {
            group: 'test.group',
            kind: 'TestKind',
            query: '{ id }',
          },
        },
        context: {},
      } as any;
      const ctx: PortalNodeContext = {} as any;

      await service.processNodeContext('', entityNode, ctx);

      expect(mockResourceService.read).not.toHaveBeenCalled();
    });

    it('should return early if group is missing', async () => {
      const entityNode: PortalLuigiNode = {
        defineEntity: {
          graphqlEntity: {
            group: '',
            kind: 'TestKind',
            query: '{ id }',
          },
        },
        context: {},
      } as any;
      const ctx: PortalNodeContext = {} as any;

      await service.processNodeContext('test-id', entityNode, ctx);

      expect(mockResourceService.read).not.toHaveBeenCalled();
    });

    it('should return early if kind is missing', async () => {
      const entityNode: PortalLuigiNode = {
        defineEntity: {
          graphqlEntity: {
            group: 'test.group',
            kind: '',
            query: '{ id }',
          },
        },
        context: {},
      } as any;
      const ctx: PortalNodeContext = {} as any;

      await service.processNodeContext('test-id', entityNode, ctx);

      expect(mockResourceService.read).not.toHaveBeenCalled();
    });

    it('should return early if queryPart is missing', async () => {
      const entityNode: PortalLuigiNode = {
        defineEntity: {
          graphqlEntity: {
            group: 'test.group',
            kind: 'TestKind',
            query: '',
          },
        },
        context: {},
      } as any;
      const ctx: PortalNodeContext = {} as any;

      await service.processNodeContext('test-id', entityNode, ctx);

      expect(mockResourceService.read).not.toHaveBeenCalled();
    });

    it('should return early if defineEntity is missing', async () => {
      const entityNode: PortalLuigiNode = {
        context: {},
      } as any;
      const ctx: PortalNodeContext = {} as any;

      await service.processNodeContext('test-id', entityNode, ctx);

      expect(mockResourceService.read).not.toHaveBeenCalled();
    });

    it('should build query without namespace for non-namespaced resources', async () => {
      const entityId = 'test-entity';
      const entityNode: PortalLuigiNode = {
        defineEntity: {
          graphqlEntity: {
            group: 'test.group',
            kind: 'TestKind',
            query: '{ id name }',
          },
        },
        context: {},
      } as any;
      const ctx: PortalNodeContext = {
        portalContext: { crdGatewayApiUrl: 'http://test.com' },
        token: 'test-token',
        resourceDefinition: { scope: 'Cluster' },
      } as any;

      const mockEntity: Resource = {
        metadata: {
          name: 'test',
          annotations: { 'kcp.io/cluster': 'cluster1' },
        },
      } as any;

      mockResourceService.read.mockReturnValue(of(mockEntity));

      await service.processNodeContext(entityId, entityNode, ctx);

      expect(mockResourceService.read).toHaveBeenCalledWith(
        entityId,
        'test_group',
        'TestKind',
        'query ($name: String!) { test_group { TestKind(name: $name) { id name } }}',
        {
          resourceDefinition: ctx.resourceDefinition,
          portalContext: {
            crdGatewayApiUrl: ctx.portalContext.crdGatewayApiUrl,
          },
          token: ctx.token,
          namespaceId: undefined,
        },
        false,
      );
    });

    it('should build query with namespace for namespaced resources', async () => {
      const entityId = 'test-entity';
      const entityNode: PortalLuigiNode = {
        defineEntity: {
          graphqlEntity: {
            group: 'test.group',
            kind: 'TestKind',
            query: '{ id name }',
          },
        },
        context: {},
      } as any;
      const ctx: PortalNodeContext = {
        portalContext: { crdGatewayApiUrl: 'http://test.com' },
        token: 'test-token',
        resourceDefinition: { scope: 'Namespaced' },
        namespaceId: 'test-namespace',
      } as any;

      const mockEntity: Resource = {
        metadata: {
          name: 'test',
          annotations: { 'kcp.io/cluster': 'cluster1' },
        },
      } as any;

      mockResourceService.read.mockReturnValue(of(mockEntity));

      await service.processNodeContext(entityId, entityNode, ctx);

      expect(mockResourceService.read).toHaveBeenCalledWith(
        entityId,
        'test_group',
        'TestKind',
        'query ($name: String!, $namespace: String!) { test_group { TestKind(name: $name, namespace: $namespace) { id name } }}',
        {
          resourceDefinition: ctx.resourceDefinition,
          portalContext: {
            crdGatewayApiUrl: ctx.portalContext.crdGatewayApiUrl,
          },
          token: ctx.token,
          namespaceId: 'test-namespace',
        },
        false,
      );
    });

    it('should handle account kind with special flag', async () => {
      const entityId = 'test-account';
      const entityNode: PortalLuigiNode = {
        defineEntity: {
          graphqlEntity: {
            group: 'test.group',
            kind: 'Account',
            query: '{ id name }',
          },
        },
        context: {},
      } as any;
      const ctx: PortalNodeContext = {
        portalContext: { crdGatewayApiUrl: 'http://test.com' },
        token: 'test-token',
      } as any;

      const mockEntity: Resource = {
        metadata: {
          name: 'test',
          annotations: { 'kcp.io/cluster': 'cluster1' },
        },
      } as any;

      mockResourceService.read.mockReturnValue(of(mockEntity));

      await service.processNodeContext(entityId, entityNode, ctx);

      expect(mockResourceService.read).toHaveBeenCalledWith(
        entityId,
        'test_group',
        'Account',
        'query ($name: String!) { test_group { Account(name: $name) { id name } }}',
        {
          resourceDefinition: undefined,
          portalContext: {
            crdGatewayApiUrl: ctx.portalContext.crdGatewayApiUrl,
          },
          token: ctx.token,
          namespaceId: undefined,
        },
        true,
      );
    });

    it('should update context and node when entity is successfully read', async () => {
      const entityId = 'test-entity';
      const entityNode: PortalLuigiNode = {
        defineEntity: {
          graphqlEntity: {
            group: 'test.group',
            kind: 'TestKind',
            query: '{ id name }',
          },
        },
        context: {},
      } as any;
      const ctx: PortalNodeContext = {
        portalContext: { crdGatewayApiUrl: 'http://test.com' },
        token: 'test-token',
      } as any;

      const mockEntity: Resource = {
        metadata: {
          name: 'test',
          annotations: { 'kcp.io/cluster': 'cluster1' },
        },
        spec: { field: 'value' },
      } as any;

      mockResourceService.read.mockReturnValue(of(mockEntity));

      await service.processNodeContext(entityId, entityNode, ctx);

      expect(ctx.entity).toBe(mockEntity);
      expect(ctx.entityId).toBe('cluster1/test-entity');
      expect(entityNode.context.entity).toBe(mockEntity);
      expect(entityNode.context.entityId).toBe('cluster1/test-entity');
    });

    it('should handle entity without kcp.io/cluster annotation', async () => {
      const entityId = 'test-entity';
      const entityNode: PortalLuigiNode = {
        defineEntity: {
          graphqlEntity: {
            group: 'test.group',
            kind: 'TestKind',
            query: '{ id name }',
          },
        },
        context: {},
      } as any;
      const ctx: PortalNodeContext = {
        portalContext: { crdGatewayApiUrl: 'http://test.com' },
        token: 'test-token',
      } as any;

      const mockEntity: Resource = {
        metadata: { name: 'test' },
        spec: { field: 'value' },
      } as any;

      mockResourceService.read.mockReturnValue(of(mockEntity));

      await service.processNodeContext(entityId, entityNode, ctx);

      expect(ctx.entity).toBe(mockEntity);
      expect(ctx.entityId).toBe('undefined/test-entity');
      expect(entityNode.context.entity).toBe(mockEntity);
      expect(entityNode.context.entityId).toBe('undefined/test-entity');
    });

    it('should log error and not update context when read fails', async () => {
      const entityId = 'test-entity';
      const entityNode: PortalLuigiNode = {
        defineEntity: {
          graphqlEntity: {
            group: 'test.group',
            kind: 'TestKind',
            query: '{ id name }',
          },
        },
        context: {},
      } as any;
      const ctx: PortalNodeContext = {
        portalContext: { crdGatewayApiUrl: 'http://test.com' },
        token: 'test-token',
      } as any;

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      mockResourceService.read.mockReturnValue(
        throwError(() => new Error('Network error')),
      );

      await service.processNodeContext(entityId, entityNode, ctx);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Not able to read entity test-entity from test_group',
      );
      expect(ctx.entity).toBeUndefined();
      expect(entityNode.context.entity).toBeUndefined();

      consoleErrorSpy.mockRestore();
    });

    it('should handle dots and hyphens in group name', async () => {
      const entityId = 'test-entity';
      const entityNode: PortalLuigiNode = {
        defineEntity: {
          graphqlEntity: {
            group: 'test-group.with-dots',
            kind: 'TestKind',
            query: '{ id }',
          },
        },
        context: {},
      } as any;
      const ctx: PortalNodeContext = {
        portalContext: { crdGatewayApiUrl: 'http://test.com' },
        token: 'test-token',
      } as any;

      const mockEntity: Resource = {
        metadata: {
          name: 'test',
          annotations: { 'kcp.io/cluster': 'cluster1' },
        },
      } as any;

      mockResourceService.read.mockReturnValue(of(mockEntity));

      await service.processNodeContext(entityId, entityNode, ctx);

      expect(mockResourceService.read).toHaveBeenCalledWith(
        entityId,
        'test_group_with_dots',
        'TestKind',
        'query ($name: String!) { test_group_with_dots { TestKind(name: $name) { id } }}',
        expect.any(Object),
        false,
      );
    });
  });
});