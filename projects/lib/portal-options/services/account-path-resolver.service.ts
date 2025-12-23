import { PortalLuigiNode } from '../models/luigi-node';
import {
  collectAccountNamesFromHierarchy,
  getInitialAccountId,
} from '../utils/account-hierarchy.util';
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AccountPathResolverService {
  public resolveAccountHierarchy(
    entityNode: PortalLuigiNode,
    entityId?: string,
    kind?: string,
  ): string {
    if (entityNode.context?.accountPath) {
      return entityNode.context.accountPath;
    }

    const accountNames = collectAccountNamesFromHierarchy(entityNode);
    const initialId = getInitialAccountId(entityId, kind);

    if (initialId) {
      accountNames.push(initialId);
    }

    const path = accountNames.join(':');
    entityNode.context.accountPath = path;
    return path;
  }
}
