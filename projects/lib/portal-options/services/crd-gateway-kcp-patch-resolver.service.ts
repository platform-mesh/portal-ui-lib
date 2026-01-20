import { kcpRootOrgsPath } from '../models/constants';
import { PortalLuigiNode } from '../models/luigi-node';
import { calculateAccountHierarchy } from '../utils/account-hierarchy.util';
import { Injectable, inject } from '@angular/core';
import { EnvConfigService } from '@openmfp/portal-ui-lib';
import { GatewayService } from '@platform-mesh/portal-ui-lib/services';

@Injectable({ providedIn: 'root' })
export class CrdGatewayKcpPatchResolver {
  private gatewayService = inject(GatewayService);
  private envConfigService = inject(EnvConfigService);
  private lastProccesedEntityId: string | undefined;

  public async resolveCrdGatewayKcpPath(
    nextNode: PortalLuigiNode,
    entityId?: string,
    kind?: string,
  ) {
    if (nextNode.context?.kcpPath) {
      if (this.lastProccesedEntityId === entityId) {
        this.gatewayService.updateCrdGatewayUrlWithEntityPath(
          nextNode.context.kcpPath,
        );
        return nextNode.context.kcpPath;
      }
    }

    const accountNames = calculateAccountHierarchy(nextNode, entityId, kind);

    const entityKcpPath =
      accountNames.length > 0 ? `:${accountNames.join(':')}` : '';

    const org = (await this.envConfigService.getEnvConfig()).idpName;
    const kcpPath = `${kcpRootOrgsPath}:${org}${entityKcpPath}`;
    this.gatewayService.updateCrdGatewayUrlWithEntityPath(kcpPath);

    if (nextNode.context && !nextNode.context.kcpPath) {
      nextNode.context.kcpPath = kcpPath;
    }
    this.lastProccesedEntityId = entityId;
    return kcpPath;
  }
}
