import { PortalLuigiNode } from '../models/luigi-node';

export function collectAccountNamesFromNodeHierarchy(
  node: PortalLuigiNode | undefined,
): string[] {
  const accountNames: string[] = [];
  let currentNode: PortalLuigiNode | undefined = node;

  while (currentNode) {
    const entityName = currentNode.context?.entityName;
    const entityKind = currentNode.context?.entityKind;
    if (entityName && entityKind?.toLowerCase() === 'account') {
      accountNames.unshift(entityName);
    }
    currentNode = currentNode.parent;
  }

  return accountNames;
}

export function getInitialAccountId(
  entityId?: string,
  kind?: string,
): string | undefined {
  return kind?.toLowerCase() === 'account' && entityId ? entityId : undefined;
}

export function calculateAccountHierarchy(
  entityNode: PortalLuigiNode,
  entityId?: string,
  kind?: string,
): string[] {
  const initialAccountId = getInitialAccountId(entityId, kind);
  // when we are on a dynamic node and the id any kind has changed we need to reset the context data
  if (entityNode.defineEntity?.contextKey && initialAccountId) {
    entityNode.context.entityName = undefined;
    entityNode.context.entityKind = undefined;
  }

  const accountNames = collectAccountNamesFromNodeHierarchy(entityNode);

  if (initialAccountId) {
    accountNames.push(initialAccountId);
  }
  return accountNames;
}
