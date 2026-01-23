import { Injectable, inject } from '@angular/core';
import {
  LuigiCoreService,
  NodeChangeHookConfigService,
} from '@openmfp/portal-ui-lib';
import { PortalLuigiNode } from '../models/luigi-node';
import { AccountPathResolverService } from './account-path-resolver.service';
import { CrdGatewayKcpPatchResolver } from './crd-gateway-kcp-patch-resolver.service';
import { OrganizationReadyService } from './org-ready.service';

@Injectable({ providedIn: 'root' })
export class NodeChangeHookConfigServiceImpl implements NodeChangeHookConfigService {
  private luigiCoreService = inject(LuigiCoreService);
  private crdGatewayKcpPatchResolver = inject(CrdGatewayKcpPatchResolver);
  private accountPathResolverService = inject(AccountPathResolverService);
  private organizationReadyService = inject(OrganizationReadyService);

  nodeChangeHook(prevNode: PortalLuigiNode, nextNode: PortalLuigiNode) {
    if (
      nextNode.initialRoute &&
      nextNode.virtualTree &&
      !(nextNode as any)._virtualTree
    ) {
      this.luigiCoreService.navigation().navigate(nextNode.initialRoute);
    }

    this.crdGatewayKcpPatchResolver.resolveCrdGatewayKcpPath(nextNode);
    this.accountPathResolverService.resolveAccountHierarchy(nextNode);
    this.organizationReadyService.checkOrganizationReady();
  }
}
