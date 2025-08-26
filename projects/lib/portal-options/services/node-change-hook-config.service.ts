import { PortalLuigiNode } from '../models/luigi-node';
import { CrdGatewayKcpPatchResolver } from './crd-gateway-kcp-patch-resolver.service';
import { Injectable, inject } from '@angular/core';
import {
  LuigiCoreService,
  NodeChangeHookConfigService,
} from '@openmfp/portal-ui-lib';

@Injectable({ providedIn: 'root' })
export class NodeChangeHookConfigServiceImpl
  implements NodeChangeHookConfigService
{
  private luigiCoreService = inject(LuigiCoreService);
  private crdGatewayKcpPatchResolver = inject(CrdGatewayKcpPatchResolver);

  nodeChangeHook(prevNode: PortalLuigiNode, nextNode: PortalLuigiNode) {
    if (
      nextNode.initialRoute &&
      nextNode.virtualTree &&
      !(nextNode as any)._virtualTree
    ) {
      this.luigiCoreService.navigation().navigate(nextNode.initialRoute);
    }

    this.crdGatewayKcpPatchResolver.resolveCrdGatewayKcpPath(nextNode);
  }
}
