import { PortalLuigiNode } from '../models/luigi-node';
import { calculateAccountHierarchy } from '../utils/account-hierarchy.util';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AccountPathResolverService {
  public resolveAccountHierarchy(
    entityNode: PortalLuigiNode,
    entityId?: string,
    kind?: string,
  ): string {
    if (
      entityNode.context?.accountPath &&
      !entityNode.defineEntity?.contextKey
    ) {
      return entityNode.context.accountPath;
    }

    const accountNames = calculateAccountHierarchy(entityNode, entityId, kind);

    const path = accountNames.join(':');
    if(entityNode.context){
      entityNode.context.accountPath = path;
    }

    return path;
  }
}
