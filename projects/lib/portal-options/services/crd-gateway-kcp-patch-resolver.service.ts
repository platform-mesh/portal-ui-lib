import { Injectable, inject } from '@angular/core';
import { EnvConfigService } from '@openmfp/portal-ui-lib';
import { GatewayService } from '@platform-mesh/portal-ui-lib/services';
import { kcpRootOrgsPath } from '../models/constants';
import { PortalLuigiNode } from '../models/luigi-node';

@Injectable({ providedIn: 'root' })
export class CrdGatewayKcpPatchResolver {
  private gatewayService = inject(GatewayService);
  private envConfigService = inject(EnvConfigService);

  public async resolveCrdGatewayKcpPathForNextAccountEntity(
    entityId: string,
    kind: string,
    nextNode: PortalLuigiNode,
  ) {
    if (kind !== 'Account' || !entityId) {
      return;
    }

    let entityKcpPath = `:${entityId}`;
    let node: PortalLuigiNode | undefined = nextNode.parent;

    do {
      const entity = node?.context?.entity;
      if (entity?.metadata?.name && entity['__typename'] === 'Account') {
        entityKcpPath = `:${entity.metadata.name}${entityKcpPath}`;
      }
      node = node?.parent;
    } while (node);

    const org = (await this.envConfigService.getEnvConfig())['organization'];
    const kcpPath =
      nextNode.context?.kcpPath || `${kcpRootOrgsPath}:${org}${entityKcpPath}`;
    this.gatewayService.updateCrdGatewayUrlWithEntityPath(kcpPath);
  }

  public async resolveCrdGatewayKcpPath(nextNode: PortalLuigiNode) {
    let entityKcpPath = '';
    let node: PortalLuigiNode | undefined = nextNode;
    do {
      const entity = node.context?.entity;
      if (entity?.metadata?.name && entity['__typename'] === 'Account') {
        entityKcpPath = `:${entity.metadata.name}${entityKcpPath}`;
      }
      node = node.parent;
    } while (node);

    const org = (await this.envConfigService.getEnvConfig())['organization'];
    const kcpPath =
      nextNode.context?.kcpPath || `${kcpRootOrgsPath}:${org}${entityKcpPath}`;
    this.gatewayService.updateCrdGatewayUrlWithEntityPath(kcpPath);
  }
}
