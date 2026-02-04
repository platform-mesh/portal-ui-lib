import { AccountPathResolverService } from './account-path-resolver.service';
import { CrdGatewayKcpPatchResolver } from './crd-gateway-kcp-patch-resolver.service';
import { NodeChangeHookConfigServiceImpl } from './node-change-hook-config.service';
import { OrganizationReadyService } from './org-ready.service';
import { TestBed } from '@angular/core/testing';
import { LuigiCoreService } from '@openmfp/portal-ui-lib';
import { MockedObject } from 'vitest';

describe('NodeChangeHookConfigServiceImpl', () => {
  let service: NodeChangeHookConfigServiceImpl;
  let mockLuigiCoreService: any;
  let mockCrdGatewayKcpPatchResolver: MockedObject<CrdGatewayKcpPatchResolver>;
  let mockAccountPathResolverService: MockedObject<AccountPathResolverService>;
  let mockOrganizationReadyService: MockedObject<OrganizationReadyService>;

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

    mockAccountPathResolverService = {
      resolveAccountHierarchy: vi.fn(),
    } as unknown as MockedObject<AccountPathResolverService>;

    mockOrganizationReadyService = {
      checkOrganizationReady: vi.fn(),
    } as unknown as MockedObject<OrganizationReadyService>;

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
    expect(
      mockOrganizationReadyService.checkOrganizationReady,
    ).toHaveBeenCalled();
  });
});
