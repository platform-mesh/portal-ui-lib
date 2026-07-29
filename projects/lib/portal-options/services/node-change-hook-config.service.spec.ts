import { PersistentPanelService } from '../persistent-panel/persistent-panel.service';
import { CrdGatewayKcpPatchResolver } from './crd-gateway-kcp-patch-resolver.service';
import { NodeChangeHookConfigServiceImpl } from './node-change-hook-config.service';
import { TestBed } from '@angular/core/testing';
import { LuigiCoreService } from '@openmfp/portal-ui-lib';
import { MockedObject } from 'vitest';

describe('NodeChangeHookConfigServiceImpl', () => {
  let service: NodeChangeHookConfigServiceImpl;
  let mockLuigiCoreService: any;
  let mockCrdGatewayKcpPatchResolver: MockedObject<CrdGatewayKcpPatchResolver>;
  let mockPersistentPanelService: Pick<
    PersistentPanelService,
    'currentTarget' | 'updateTarget'
  >;

  beforeEach(() => {
    mockLuigiCoreService = {
      navigation: vi.fn().mockReturnValue({
        navigate: vi.fn(),
      }),
      getGlobalContext: vi.fn().mockReturnValue({ organization: 'org1' }),
    };

    mockCrdGatewayKcpPatchResolver = {
      resolveCrdGatewayKcpPath: vi.fn(),
    } as unknown as MockedObject<CrdGatewayKcpPatchResolver>;
    mockPersistentPanelService = {
      currentTarget: vi.fn().mockReturnValue({}),
      updateTarget: vi.fn(),
    };

    TestBed.configureTestingModule({
      providers: [
        NodeChangeHookConfigServiceImpl,
        { provide: LuigiCoreService, useValue: mockLuigiCoreService },
        {
          provide: CrdGatewayKcpPatchResolver,
          useValue: mockCrdGatewayKcpPatchResolver,
        },
        {
          provide: PersistentPanelService,
          useValue: mockPersistentPanelService,
        },
      ],
    });

    service = TestBed.inject(NodeChangeHookConfigServiceImpl);
  });

  it('should navigate when initialRoute and virtualTree exist and _virtualTree does not exist', async () => {
    const prevNode = {} as any;
    const nextNode = {
      initialRoute: '/some/path',
      virtualTree: true,
      context: {},
    } as any;

    await service.nodeChangeHook(prevNode, nextNode, {} as any);

    expect(mockLuigiCoreService.navigation().navigate).toHaveBeenCalledWith(
      '/some/path',
    );
    expect(
      mockCrdGatewayKcpPatchResolver.resolveCrdGatewayKcpPath,
    ).toHaveBeenCalledWith(nextNode);
  });

  describe('persistent provider panel context', () => {
    it('clears stale account scope when navigation returns to the organization', async () => {
      mockPersistentPanelService.currentTarget = vi.fn().mockReturnValue({
        organization: 'showroom',
        account: 'ig-1',
        workspacePath: 'root:orgs:showroom:ig-1',
      });

      await service.nodeChangeHook(
        { context: { accountId: 'ig-1' } } as any,
        { context: { organization: 'showroom' } } as any,
        { organization: 'showroom' } as any,
      );

      expect(mockPersistentPanelService.updateTarget).toHaveBeenCalledWith({
        organization: 'showroom',
      });
    });

    it('publishes the effective account, namespace, and resource scope', async () => {
      await service.nodeChangeHook(
        {} as any,
        { context: { navigationContext: 'resource-details' } } as any,
        {
          organization: 'showroom',
          accountId: 'ig-1',
          kcpPath: 'root:orgs:showroom:ig-1',
          namespaceId: 'apps',
          entityKind: 'Database',
          entityName: 'sample',
        } as any,
      );

      expect(mockPersistentPanelService.updateTarget).toHaveBeenCalledWith({
        organization: 'showroom',
        account: 'ig-1',
        workspacePath: 'root:orgs:showroom:ig-1',
        namespace: 'apps',
        resource: { kind: 'Database', name: 'sample' },
      });
    });

    it('ignores a stale target from an earlier navigation that resolves last', async () => {
      let resolveFirstNavigation!: () => void;
      const firstNavigation = new Promise<void>((resolve) => {
        resolveFirstNavigation = resolve;
      });
      mockCrdGatewayKcpPatchResolver.resolveCrdGatewayKcpPath
        .mockReturnValueOnce(firstNavigation as any)
        .mockResolvedValueOnce({} as any);

      const staleUpdate = service.nodeChangeHook(
        {} as any,
        { context: { accountId: 'account-a' } } as any,
        { organization: 'showroom' } as any,
      );
      await service.nodeChangeHook(
        {} as any,
        { context: { accountId: 'account-b' } } as any,
        { organization: 'showroom' } as any,
      );
      resolveFirstNavigation();
      await staleUpdate;

      expect(mockPersistentPanelService.updateTarget).toHaveBeenCalledTimes(1);
      expect(mockPersistentPanelService.updateTarget).toHaveBeenCalledWith({
        organization: 'showroom',
        account: 'account-b',
        workspacePath: 'root:orgs:showroom:account-b',
      });
    });
  });

  describe('accumulatePortalPermissions', () => {
    it('uses prevNode.context.portalPermissions as base when it exists', async () => {
      const prevNode = {
        context: { portalPermissions: { pods: ['get'] } },
      } as any;
      const nextNode = { context: {} } as any;
      const currentContext = {} as any;

      await service.nodeChangeHook(prevNode, nextNode, currentContext);

      expect(currentContext.portalPermissions).toEqual({ pods: ['get'] });
    });

    it('falls back to currentContext.portalPermissions when prevNode has no portalPermissions', async () => {
      const prevNode = { context: {} } as any;
      const nextNode = { context: {} } as any;
      const currentContext = {
        portalPermissions: { namespaces: ['list'] },
      } as any;

      await service.nodeChangeHook(prevNode, nextNode, currentContext);

      expect(currentContext.portalPermissions).toEqual({
        namespaces: ['list'],
      });
    });

    it('falls back to empty object when both prevNode and currentContext have no portalPermissions', async () => {
      const prevNode = { context: {} } as any;
      const nextNode = { context: {} } as any;
      const currentContext = {} as any;

      await service.nodeChangeHook(prevNode, nextNode, currentContext);

      expect(currentContext.portalPermissions).toEqual({});
    });

    it('merges nextNode.context.nodesPermissions into portalPermissions', async () => {
      const prevNode = {} as any;
      const nextNode = {
        context: {
          nodesPermissions: [
            { resource: 'pods', actions: ['get', 'list'] },
            { resource: 'services', actions: ['get'] },
          ],
        },
      } as any;
      const currentContext = {} as any;

      await service.nodeChangeHook(prevNode, nextNode, currentContext);

      expect(currentContext.portalPermissions).toEqual({
        pods: ['get', 'list'],
        services: ['get'],
      });
    });

    it('leaves portalPermissions as empty object when nextNode.context.nodesPermissions is absent', async () => {
      const prevNode = {} as any;
      const nextNode = { context: {} } as any;
      const currentContext = {} as any;

      await service.nodeChangeHook(prevNode, nextNode, currentContext);

      expect(currentContext.portalPermissions).toEqual({});
    });

    it('sets currentContext.portalPermissions with the merged result', async () => {
      const prevNode = {
        context: { portalPermissions: { secrets: ['get'] } },
      } as any;
      const nextNode = {
        context: {
          nodesPermissions: [{ resource: 'pods', actions: ['list'] }],
        },
      } as any;
      const currentContext = {} as any;

      await service.nodeChangeHook(prevNode, nextNode, currentContext);

      expect(currentContext.portalPermissions).toEqual({
        secrets: ['get'],
        pods: ['list'],
      });
    });

    it('sets nextNode.context.portalPermissions to the same object as currentContext.portalPermissions', async () => {
      const prevNode = {} as any;
      const nextNode = {
        context: {
          nodesPermissions: [{ resource: 'pods', actions: ['get'] }],
        },
      } as any;
      const currentContext = {} as any;

      await service.nodeChangeHook(prevNode, nextNode, currentContext);

      expect(nextNode.context.portalPermissions).toBe(
        currentContext.portalPermissions,
      );
    });

    it('overrides an existing resource entry with new actions from nodesPermissions', async () => {
      const prevNode = {
        context: { portalPermissions: { pods: ['get'] } },
      } as any;
      const nextNode = {
        context: {
          nodesPermissions: [
            { resource: 'pods', actions: ['get', 'list', 'create'] },
          ],
        },
      } as any;
      const currentContext = {} as any;

      await service.nodeChangeHook(prevNode, nextNode, currentContext);

      expect(currentContext.portalPermissions).toEqual({
        pods: ['get', 'list', 'create'],
      });
    });
  });
});
