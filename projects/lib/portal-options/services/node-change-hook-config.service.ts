import { PortalLuigiNode } from '../models/luigi-node';
import { CrdGatewayKcpPatchResolver } from './crd-gateway-kcp-patch-resolver.service';
import { Injectable, inject } from '@angular/core';
import {
  LuigiCoreService,
  NodeChangeHookConfigService,
  NodeContext,
} from '@openmfp/portal-ui-lib';

@Injectable({ providedIn: 'root' })
export class NodeChangeHookConfigServiceImpl implements NodeChangeHookConfigService {
  private luigiCoreService = inject(LuigiCoreService);
  private crdGatewayKcpPatchResolver = inject(CrdGatewayKcpPatchResolver);

  async nodeChangeHook(
    prevNode: PortalLuigiNode,
    nextNode: PortalLuigiNode,
    currentContext: NodeContext,
  ) {
    if (
      nextNode.initialRoute &&
      nextNode.virtualTree &&
      !(nextNode as any)._virtualTree
    ) {
      this.luigiCoreService.navigation().navigate(nextNode.initialRoute);
    }

    this.accumulatePortalPermissions(prevNode, nextNode, currentContext);
    await this.crdGatewayKcpPatchResolver.resolveCrdGatewayKcpPath(nextNode);
  }

  private accumulatePortalPermissions(
    prevNode: PortalLuigiNode,
    nextNode: PortalLuigiNode,
    currentContext: NodeContext,
  ) {
    const portalPermissions =
      prevNode?.context?.portalPermissions ??
      currentContext?.portalPermissions ??
      {};

    nextNode.context?.nodesPermissions?.forEach((permission) => {
      portalPermissions[permission.resource] = permission.actions;
    });

    currentContext.portalPermissions = portalPermissions;
    nextNode.context.portalPermissions = portalPermissions;
  }
}
