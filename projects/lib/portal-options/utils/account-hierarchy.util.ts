import { PortalLuigiNode } from '../models/luigi-node';

export function collectAccountNamesFromHierarchy(
  node: PortalLuigiNode | undefined,
): string[] {
  const accountNames: string[] = [];
  let currentNode: PortalLuigiNode | undefined = node;

  while (currentNode) {
    const entity = currentNode.context?.entity;
    if (entity?.metadata?.name && entity['__typename'] === 'Account') {
      accountNames.unshift(entity.metadata.name);
    }
    currentNode = currentNode.parent;
  }

  return accountNames;
}

export function getInitialAccountId(
  entityId?: string,
  kind?: string,
): string | undefined {
  return kind === 'Account' && entityId ? entityId : undefined;
}
