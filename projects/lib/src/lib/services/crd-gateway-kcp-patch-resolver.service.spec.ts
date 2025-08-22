import { kcpRootOrgsPath } from '../models/constants';
import { PortalLuigiNode } from '../models/luigi-node';
import { CrdGatewayKcpPatchResolver } from './crd-gateway-kcp-patch-resolver.service';
import { TestBed } from '@angular/core/testing';
import { GatewayService, LuigiCoreService } from '@openmfp/portal-ui-lib';

describe('CrdGatewayKcpPatchResolver', () => {
  let resolver: CrdGatewayKcpPatchResolver;
  let gatewayServiceMock: { updateCrdGatewayUrlWithEntityPath: jest.Mock };
  let luigiCoreServiceMock: { getGlobalContext: jest.Mock };

  beforeEach(() => {
    gatewayServiceMock = { updateCrdGatewayUrlWithEntityPath: jest.fn() };
    luigiCoreServiceMock = {
      getGlobalContext: jest.fn().mockReturnValue({ organization: 'org1' }),
    };

    TestBed.configureTestingModule({
      providers: [
        CrdGatewayKcpPatchResolver,
        { provide: GatewayService, useValue: gatewayServiceMock },
        { provide: LuigiCoreService, useValue: luigiCoreServiceMock },
      ],
    });
    resolver = TestBed.inject(CrdGatewayKcpPatchResolver);
  });

  it('should build kcpPath from entity metadata and organization, skipping non-Account types', () => {
    const node: PortalLuigiNode = {
      context: {
        entity: { metadata: { name: 'acc3' }, __typename: 'Account' },
      },
      parent: {
        context: {
          entity: { metadata: { name: 'proj1' }, __typename: 'Project' },
        },
        parent: {
          context: {
            entity: { metadata: { name: 'acc2' }, __typename: 'Account' },
          },
          parent: {
            context: {
              entity: { metadata: { name: 'team1' }, __typename: 'Team' },
            },
            parent: {
              context: {
                entity: { metadata: { name: 'acc1' }, __typename: 'Account' },
              },
              parent: undefined,
            },
          },
        },
      },
    } as any;

    resolver.resolveCrdGatewayKcpPath(node);

    expect(
      gatewayServiceMock.updateCrdGatewayUrlWithEntityPath,
    ).toHaveBeenCalledWith(`${kcpRootOrgsPath}:org1:acc1:acc2:acc3`);
  });

  it('should use kcpPath from node context if provided', () => {
    const node: PortalLuigiNode = {
      context: { kcpPath: 'customPath' },
      parent: undefined,
    } as any;

    resolver.resolveCrdGatewayKcpPath(node);

    expect(
      gatewayServiceMock.updateCrdGatewayUrlWithEntityPath,
    ).toHaveBeenCalledWith('customPath');
  });

  it('should handle node without entity metadata', () => {
    const node: PortalLuigiNode = { context: {}, parent: undefined } as any;

    resolver.resolveCrdGatewayKcpPath(node);

    expect(
      gatewayServiceMock.updateCrdGatewayUrlWithEntityPath,
    ).toHaveBeenCalledWith(`${kcpRootOrgsPath}:org1`);
  });
});
