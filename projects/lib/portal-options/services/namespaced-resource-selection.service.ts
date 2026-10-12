import { PortalNodeContext } from '../models/luigi-context';
import { PortalLuigiNode } from '../models/luigi-node';
import { Injectable, inject } from '@angular/core';
import { LuigiCoreService, NodeContext } from '@openmfp/portal-ui-lib';
import { ALL_NAMESPACE } from '@platform-mesh/portal-ui-lib/models';
import { isNamespacedResource } from '@platform-mesh/portal-ui-lib/utils';

interface NamespacedResourceSelection {
  entityTypeId: string;
  entityId: string;
  kcpPath: string;
  namespace: string;
}

@Injectable({ providedIn: 'root' })
export class NamespacedResourceSelectionService {
  private luigiCoreService = inject(LuigiCoreService);
  private selection: NamespacedResourceSelection | undefined;

  public resolveNamespace(
    entityNode: PortalLuigiNode,
    entityId: string,
    kcpPath: string,
    ctx: PortalNodeContext,
  ): string | undefined {
    const searchNamespace = this.getSelectedSearchNamespace();

    if (!isNamespacedResource(ctx)) {
      return searchNamespace;
    }

    const entityTypeId = entityNode.defineEntity?.id;
    const namespace =
      searchNamespace ??
      this.getSelectedNamespace(entityTypeId, entityId, kcpPath);

    this.selection =
      entityTypeId && namespace
        ? { entityTypeId, entityId, kcpPath, namespace }
        : undefined;

    return namespace;
  }

  public restoreNamespaceSearchParam(
    nextNode: PortalLuigiNode,
    currentContext: NodeContext,
  ): void {
    const selection = this.selection;

    if (!selection) {
      return;
    }

    if (!this.isWithinSelectedResource(nextNode, currentContext, selection)) {
      this.selection = undefined;
      return;
    }

    if (this.getSelectedSearchNamespace()) {
      return;
    }

    this.luigiCoreService
      .routing()
      .addSearchParams({ namespace: selection.namespace }, false, true);
  }

  private getSelectedSearchNamespace(): string | undefined {
    const namespace = this.luigiCoreService.routing().getSearchParams()
      .namespace as string | undefined;

    return namespace && namespace !== ALL_NAMESPACE ? namespace : undefined;
  }

  private getSelectedNamespace(
    entityTypeId: string | undefined,
    entityId: string,
    kcpPath: string,
  ): string | undefined {
    const selection = this.selection;

    if (
      !selection ||
      selection.entityTypeId !== entityTypeId ||
      selection.entityId !== entityId ||
      selection.kcpPath !== kcpPath
    ) {
      return undefined;
    }

    return selection.namespace;
  }

  private isWithinSelectedResource(
    node: PortalLuigiNode,
    currentContext: NodeContext,
    selection: NamespacedResourceSelection,
  ): boolean {
    for (
      let current: PortalLuigiNode | undefined = node;
      current;
      current = current.parent
    ) {
      if (
        current.defineEntity?.id === selection.entityTypeId &&
        this.getEntityId(current, currentContext) === selection.entityId
      ) {
        return true;
      }
    }

    return false;
  }

  private getEntityId(
    entityNode: PortalLuigiNode,
    currentContext: NodeContext,
  ): string | undefined {
    const contextKey = entityNode.defineEntity?.contextKey;
    const dynamicEntityId = contextKey
      ? (currentContext as Record<string, unknown>)[contextKey]
      : undefined;

    return (
      (dynamicEntityId as string | undefined) ||
      entityNode.context?.resourceDefinition?.name
    );
  }
}
