import { ResourceNodeContext } from './resource-node-context';
import { Injectable, inject } from '@angular/core';
import { LuigiCoreService } from '@openmfp/portal-ui-lib';


@Injectable({ providedIn: 'root' })
export class GatewayService {
  private luigiCoreService = inject(LuigiCoreService);

  public getGatewayUrl(
    nodeContext: ResourceNodeContext,
    readFromParentKcpPath = false,
  ) {
    const gatewayUrl = nodeContext.portalContext.crdGatewayApiUrl;
    const currentKcpPath = this.getCurrentKcpPath(gatewayUrl);

    return gatewayUrl?.replace(
      currentKcpPath,
      this.resolveKcpPath(nodeContext, readFromParentKcpPath),
    );
  }

  public updateCrdGatewayUrlWithEntityPath(kcpPath: string) {
    const gatewayUrl =
      this.luigiCoreService.getGlobalContext().portalContext.crdGatewayApiUrl;
    const kcpPathRegexp = /(.*\/)[^/]+(?=\/graphql$)/;
    this.luigiCoreService.getGlobalContext().portalContext.crdGatewayApiUrl =
      gatewayUrl.replace(kcpPathRegexp, `$1${kcpPath}`);
  }

  public resolveKcpPath(
    nodeContext: ResourceNodeContext,
    readFromParentKcpPath = false,
  ) {
    if (nodeContext.kcpPath) {
      return nodeContext.kcpPath;
    }

    const gatewayUrl = nodeContext.portalContext.crdGatewayApiUrl;
    const currentKcpPath = this.getCurrentKcpPath(gatewayUrl);
    const lastIndex = currentKcpPath.lastIndexOf(':');

    if (readFromParentKcpPath && lastIndex !== -1) {
      return currentKcpPath.slice(0, lastIndex);
    }

    return currentKcpPath;
  }

  private getCurrentKcpPath(gatewayUrl: string): string {
    const kcpPathRegexp = /\/([^\/]+)\/graphql$/;
    const currentKcpPath = gatewayUrl.match(kcpPathRegexp)?.[1];

    if (!currentKcpPath) {
      this.luigiCoreService.showAlert({
        text: 'Could not get current KCP path from gateway URL',
        type: 'error',
      });

      return '';
    }

    return currentKcpPath;
  }
}
