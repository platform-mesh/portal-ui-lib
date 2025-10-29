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
    const kcpPathRegexp = /\/([^\/]+)\/graphql$/;
    const currentKcpPath = gatewayUrl?.match(kcpPathRegexp)[1];
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
    const gatewayUrl = nodeContext.portalContext.crdGatewayApiUrl;

    let kcpPath = gatewayUrl?.match(/\/([^\/]+)\/graphql$/)[1];
    if (nodeContext.kcpPath) {
      kcpPath = nodeContext.kcpPath;
    }

    if (readFromParentKcpPath) {
      const lastIndex = kcpPath.lastIndexOf(':');
      if (lastIndex !== -1) {
        kcpPath = kcpPath.slice(0, lastIndex);
      }
    }

    return kcpPath;
  }
}
