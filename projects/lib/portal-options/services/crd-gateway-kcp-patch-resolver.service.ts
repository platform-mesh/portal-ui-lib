import { kcpRootOrgsPath } from '../models/constants';
import { PortalLuigiNode } from '../models/luigi-node';
import { Injectable, inject } from '@angular/core';
import { EnvConfigService } from '@openmfp/portal-ui-lib';
import { GatewayService } from '@platform-mesh/portal-ui-lib/services';

@Injectable({ providedIn: 'root' })
export class CrdGatewayKcpPatchResolver {
  private gatewayService = inject(GatewayService);
  private envConfigService = inject(EnvConfigService);

  public async resolveCrdGatewayKcpPath(
    nextNode: PortalLuigiNode,
    entityId?: string,
    kind?: string,
  ) {
    if (nextNode.context.kcpPath) {
      this.gatewayService.updateCrdGatewayUrlWithEntityPath(
        nextNode.context.kcpPath,
      );
      return;
    }

    let entityKcpPath = kind !== 'Account' || !entityId ? '' : `:${entityId}`;
    let node: PortalLuigiNode | undefined = nextNode;
    do {
      const entity = node?.context?.entity;
      if (entity?.metadata?.name && entity['__typename'] === 'Account') {
        entityKcpPath = `:${entity.metadata.name}${entityKcpPath}`;
      }
      node = node?.parent;
    } while (node);

    const org = (await this.envConfigService.getEnvConfig()).idpName;
    const kcpPath = `${kcpRootOrgsPath}:${org}${entityKcpPath}`;
    this.gatewayService.updateCrdGatewayUrlWithEntityPath(kcpPath);

    if (!nextNode.context.kcpPath) {
      nextNode.context.kcpPath = kcpPath;
    }
  }
}
