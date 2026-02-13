import { CrdGatewayKcpPatchResolver } from './crd-gateway-kcp-patch-resolver.service';
import { NodeChangeHookConfigServiceImpl } from './node-change-hook-config.service';
import { TestBed } from '@angular/core/testing';
import { LuigiCoreService } from '@openmfp/portal-ui-lib';
import { MockedObject } from 'vitest';

describe('NodeChangeHookConfigServiceImpl', () => {
  let service: NodeChangeHookConfigServiceImpl;
  let mockLuigiCoreService: any;
  let mockCrdGatewayKcpPatchResolver: MockedObject<CrdGatewayKcpPatchResolver>;

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

    TestBed.configureTestingModule({
      providers: [
        NodeChangeHookConfigServiceImpl,
        { provide: LuigiCoreService, useValue: mockLuigiCoreService },
        {
          provide: CrdGatewayKcpPatchResolver,
          useValue: mockCrdGatewayKcpPatchResolver,
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
});
