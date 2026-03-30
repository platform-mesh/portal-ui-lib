import { ResourceNodeContext } from './resource-node-context';
import { Injectable, inject } from '@angular/core';
import { LuigiCoreService } from '@openmfp/portal-ui-lib';
import { kcpRootOrgsPath } from '@platform-mesh/portal-ui-lib/models';

@Injectable({ providedIn: 'root' })
export class GatewayService {
  private luigiCoreService = inject(LuigiCoreService);

  public getGatewayUrl(
    nodeContext: ResourceNodeContext,
    readFromParentKcpPath = false,
  ) {
    const gatewayUrl = nodeContext.portalContext.crdGatewayApiUrl;
    const currentKcpPath = this.extractKcpPath(gatewayUrl);
    return gatewayUrl?.replace(
      currentKcpPath,
      this.resolveKcpPath(nodeContext, readFromParentKcpPath),
    );
  }

  public updateCrdGatewayUrlWithEntityPath(kcpPath: string) {
    const gatewayUrl =
      this.luigiCoreService.getGlobalContext().portalContext.crdGatewayApiUrl;
    const currentKcpPath = this.extractKcpPath(gatewayUrl);
    this.luigiCoreService.getGlobalContext().portalContext.crdGatewayApiUrl =
      gatewayUrl.replace(currentKcpPath, kcpPath);
  }

  public resolveKcpPath(
    nodeContext: ResourceNodeContext,
    readFromParentKcpPath = false,
  ): string {
    const gatewayUrl = nodeContext.portalContext.crdGatewayApiUrl;

    let kcpPath = this.extractKcpPath(gatewayUrl);
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

  private extractKcpPath(gatewayUrl: string): string {
    return gatewayUrl.match(new RegExp(`(${kcpRootOrgsPath}[^/]*)`))?.[1] || '';
  }
}
