import { TestBed } from '@angular/core/testing';
import { LuigiCoreService } from '@openmfp/portal-ui-lib';
import { CrdGatewayKcpPatchResolver } from './crd-gateway-kcp-patch-resolver.service';
import { NodeChangeHookConfigServiceImpl } from './node-change-hook-config.service';

describe('NodeChangeHookConfigServiceImpl', () => {
  let service: NodeChangeHookConfigServiceImpl;
  let mockLuigiCoreService: any;

  beforeEach(() => {
    mockLuigiCoreService = {
      navigation: jest.fn().mockReturnValue({
        navigate: jest.fn(),
      }),
      getGlobalContext: jest.fn().mockReturnValue({ organization: 'org1' }),
    };

    TestBed.configureTestingModule({
      providers: [
        NodeChangeHookConfigServiceImpl,
        { provide: LuigiCoreService, useValue: mockLuigiCoreService },
        {
          provide: CrdGatewayKcpPatchResolver,
          useValue: { resolveCrdGatewayKcpPath: jest.fn() },
        },
      ],
    });

    service = TestBed.inject(NodeChangeHookConfigServiceImpl);
  });

  it('should navigate when initialRoute and virtualTree exist and _virtualTree does not exist', () => {
    const prevNode = {} as any;
    const nextNode = {
      initialRoute: '/some/path',
      virtualTree: true,
      context: {},
    } as any;

    service.nodeChangeHook(prevNode, nextNode);

    expect(mockLuigiCoreService.navigation().navigate).toHaveBeenCalledWith(
      '/some/path',
    );
  });
});
