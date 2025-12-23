import { PortalLuigiNode } from '../models/luigi-node';
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

    let path = kind !== 'Account' || !entityId ? '' : `${entityId}`;
    let node: PortalLuigiNode | undefined = entityNode;
    do {
      const entity = node?.context?.entity;
      if (entity?.metadata?.name && entity.__typename === 'Account') {
        if (path) {
          path = `${entity.metadata.name}:${path}`;
        } else {
          path = `${entity.metadata.name}`;
        }
      }
      node = node?.parent;
    } while (node);

    entityNode.context.accountPath = path;
    return path;
  }
}
