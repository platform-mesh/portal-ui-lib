import { kcpRootOrgsPath } from '../models/constants';
import { PortalLuigiNode } from '../models/luigi-node';
import {
  collectAccountNamesFromHierarchy,
  getInitialAccountId,
} from '../utils/account-hierarchy.util';
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
    if (nextNode.context?.kcpPath) {
      this.gatewayService.updateCrdGatewayUrlWithEntityPath(
        nextNode.context.kcpPath,
      );
      return nextNode.context.kcpPath;
    }

    const accountNames = collectAccountNamesFromHierarchy(nextNode);
    const initialId = getInitialAccountId(entityId, kind);

    if (initialId) {
      accountNames.push(initialId);
    }

    const entityKcpPath =
      accountNames.length > 0 ? `:${accountNames.join(':')}` : '';

    const org = (await this.envConfigService.getEnvConfig()).idpName;
    const kcpPath = `${kcpRootOrgsPath}:${org}${entityKcpPath}`;
    this.gatewayService.updateCrdGatewayUrlWithEntityPath(kcpPath);

    if (nextNode.context && !nextNode.context.kcpPath) {
      nextNode.context.kcpPath = kcpPath;
    }
    return kcpPath;
  }
}
