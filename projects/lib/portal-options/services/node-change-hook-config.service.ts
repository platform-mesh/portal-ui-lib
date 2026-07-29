import { PortalLuigiNode } from '../models/luigi-node';
import { PersistentPanelService } from '../persistent-panel/persistent-panel.service';
import { persistentPanelTarget } from '../persistent-panel/persistent-panel.types';
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
  private persistentPanelService = inject(PersistentPanelService);
  private navigationSequence = 0;

  async nodeChangeHook(
    prevNode: PortalLuigiNode,
    nextNode: PortalLuigiNode,
    currentContext: NodeContext,
  ) {
    const navigationSequence = ++this.navigationSequence;

    if (
      nextNode.initialRoute &&
      nextNode.virtualTree &&
      !(nextNode as any)._virtualTree
    ) {
      this.luigiCoreService.navigation().navigate(nextNode.initialRoute);
    }

    this.accumulatePortalPermissions(prevNode, nextNode, currentContext);
    await this.crdGatewayKcpPatchResolver.resolveCrdGatewayKcpPath(nextNode);
    if (navigationSequence !== this.navigationSequence) {
      return;
    }
    this.persistentPanelService.updateTarget(
      persistentPanelTarget(this.luigiCoreService.getGlobalContext(), {
        ...currentContext,
        ...(nextNode.context ?? {}),
      }),
    );
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

    if (nextNode.context) {
      nextNode.context.portalPermissions = portalPermissions;
    }
  }
}
