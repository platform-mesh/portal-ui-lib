import { kcpRootOrgsPath } from '../models/constants';
import { PortalLuigiNode } from '../models/luigi-node';
import {
  calculateAccountHierarchy,
  getInitialAccountId,
} from '../utils/account-hierarchy.util';
import { Injectable, inject } from '@angular/core';
import { EnvConfigService } from '@openmfp/portal-ui-lib';
import { GatewayService } from '@platform-mesh/portal-ui-lib/services';

export interface KcpData {
  kcpPath: string;
  accountPath: string | undefined;
}

@Injectable({ providedIn: 'root' })
export class CrdGatewayKcpPatchResolver {
  private gatewayService = inject(GatewayService);
  private envConfigService = inject(EnvConfigService);

  public async resolveCrdGatewayKcpPath(
    nextNode: PortalLuigiNode,
    entityId?: string,
    kind?: string,
  ): Promise<KcpData> {
    if (nextNode.context?.kcpPath && !getInitialAccountId(entityId, kind)) {
      this.gatewayService.updateCrdGatewayUrlWithEntityPath(
        nextNode.context.kcpPath,
      );
      return {
        kcpPath: nextNode.context.kcpPath,
        accountPath: nextNode.context.accountPath,
      };
    }

    const accountNames = calculateAccountHierarchy(nextNode, entityId, kind);

    const accountPath =
      accountNames.length > 0 ? `${accountNames.join(':')}` : '';

    const org = (await this.envConfigService.getEnvConfig()).idpName;
    const kcpPath = `${kcpRootOrgsPath}:${org}${accountPath ? ':' + accountPath : ''}`;
    this.gatewayService.updateCrdGatewayUrlWithEntityPath(kcpPath);

    if (nextNode.context) {
      nextNode.context.kcpPath = kcpPath;
      nextNode.context.accountPath = accountPath;
    }
    return { kcpPath, accountPath };
  }
}
