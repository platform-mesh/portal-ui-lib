import { TestBed } from '@angular/core/testing';
import {
  EnvConfigService
} from '@openmfp/portal-ui-lib';
import { GatewayService } from '@platform-mesh/portal-ui-lib/services/resource';
import { kcpRootOrgsPath } from '../models/constants';
import { PortalLuigiNode } from '../models/luigi-node';
import { CrdGatewayKcpPatchResolver } from './crd-gateway-kcp-patch-resolver.service';

describe('CrdGatewayKcpPatchResolver', () => {
  let resolver: CrdGatewayKcpPatchResolver;
  let envConfigServiceMock: jest.Mocked<EnvConfigService>;
  let gatewayServiceMock: { updateCrdGatewayUrlWithEntityPath: jest.Mock };

  beforeEach(() => {
    gatewayServiceMock = { updateCrdGatewayUrlWithEntityPath: jest.fn() };
    envConfigServiceMock = {
      getEnvConfig: jest.fn().mockResolvedValue({ organization: 'org1' }),
    } as any;

    TestBed.configureTestingModule({
      providers: [
        CrdGatewayKcpPatchResolver,
        { provide: EnvConfigService, useValue: envConfigServiceMock },
        { provide: GatewayService, useValue: gatewayServiceMock },
      ],
    });
    resolver = TestBed.inject(CrdGatewayKcpPatchResolver);
  });

  it('should build kcpPath from entity metadata and organization, skipping non-Account types', async () => {
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

    await resolver.resolveCrdGatewayKcpPath(node);

    expect(
      gatewayServiceMock.updateCrdGatewayUrlWithEntityPath,
    ).toHaveBeenCalledWith(`${kcpRootOrgsPath}:org1:acc1:acc2:acc3`);
  });

  it('should use kcpPath from node context if provided', async () => {
    const node: PortalLuigiNode = {
      context: { kcpPath: 'customPath' },
      parent: undefined,
    } as any;

    await resolver.resolveCrdGatewayKcpPath(node);

    expect(
      gatewayServiceMock.updateCrdGatewayUrlWithEntityPath,
    ).toHaveBeenCalledWith('customPath');
  });

  it('should handle node without entity metadata', async () => {
    const node: PortalLuigiNode = { context: {}, parent: undefined } as any;

    await resolver.resolveCrdGatewayKcpPath(node);

    expect(
      gatewayServiceMock.updateCrdGatewayUrlWithEntityPath,
    ).toHaveBeenCalledWith(`${kcpRootOrgsPath}:org1`);
  });
});
