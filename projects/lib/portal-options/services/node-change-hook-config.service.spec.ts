import { TestBed } from '@angular/core/testing';
import { LuigiCoreService } from '@openmfp/portal-ui-lib';
import { AccountPathResolverService } from './account-path-resolver.service';
import { CrdGatewayKcpPatchResolver } from './crd-gateway-kcp-patch-resolver.service';
import { NodeChangeHookConfigServiceImpl } from './node-change-hook-config.service';
import { OrganizationReadyService } from './org-ready.service';

describe('NodeChangeHookConfigServiceImpl', () => {
  let service: NodeChangeHookConfigServiceImpl;
  let mockLuigiCoreService: any;
  let mockCrdGatewayKcpPatchResolver: jest.Mocked<CrdGatewayKcpPatchResolver>;
  let mockAccountPathResolverService: jest.Mocked<AccountPathResolverService>;
  let mockOrganizationReadyService: jest.Mocked<OrganizationReadyService>;

  beforeEach(() => {
    mockLuigiCoreService = {
      navigation: jest.fn().mockReturnValue({
        navigate: jest.fn(),
      }),
      getGlobalContext: jest.fn().mockReturnValue({ organization: 'org1' }),
    };

    mockCrdGatewayKcpPatchResolver = {
      resolveCrdGatewayKcpPath: jest.fn(),
    } as unknown as jest.Mocked<CrdGatewayKcpPatchResolver>;

    mockAccountPathResolverService = {
      resolveAccountHierarchy: jest.fn(),
    } as unknown as jest.Mocked<AccountPathResolverService>;

    mockOrganizationReadyService = {
      checkOrganizationReady: jest.fn(),
    } as unknown as jest.Mocked<OrganizationReadyService>;

    TestBed.configureTestingModule({
      providers: [
        NodeChangeHookConfigServiceImpl,
        { provide: LuigiCoreService, useValue: mockLuigiCoreService },
        {
          provide: CrdGatewayKcpPatchResolver,
          useValue: mockCrdGatewayKcpPatchResolver,
        },
        {
          provide: AccountPathResolverService,
          useValue: mockAccountPathResolverService,
        },
        {
          provide: OrganizationReadyService,
          useValue: mockOrganizationReadyService,
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
    expect(
      mockCrdGatewayKcpPatchResolver.resolveCrdGatewayKcpPath,
    ).toHaveBeenCalledWith(nextNode);
    expect(
      mockAccountPathResolverService.resolveAccountHierarchy,
    ).toHaveBeenCalledWith(nextNode);
    expect(mockOrganizationReadyService.checkOrganizationReady).toHaveBeenCalled();
  });
});
