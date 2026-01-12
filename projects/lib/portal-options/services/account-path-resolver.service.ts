import { PortalLuigiNode } from '../models/luigi-node';
import { calculateAccountHierarchy } from '../utils/account-hierarchy.util';
import { Injectable, inject } from '@angular/core';
import { LuigiCoreService } from '@openmfp/portal-ui-lib';

@Injectable({ providedIn: 'root' })
export class AccountPathResolverService {
  private luigiCoreService = inject(LuigiCoreService);
  private lastProccesedEntityId: string | undefined;
  public resolveAccountHierarchy(
    entityNode: PortalLuigiNode,
    entityId?: string,
    kind?: string,
  ): string {
    if (entityNode.context?.accountPath) {
      if (this.lastProccesedEntityId === entityId) {
        return entityNode.context.accountPath;
      }
    }

    const accountNames = calculateAccountHierarchy(entityNode, entityId, kind);

    const path = accountNames.join(':');
    entityNode.context.accountPath = path;
    this.lastProccesedEntityId = entityId;
    return path;
  }
}
