import { PortalNodeContext } from '../models/luigi-context';
import { PortalLuigiNode } from '../models/luigi-node';
import { CrdGatewayKcpPatchResolver } from './crd-gateway-kcp-patch-resolver.service';
import { Injectable, inject } from '@angular/core';
import {
  LuigiCoreService,
  NodeContextProcessingService,
} from '@openmfp/portal-ui-lib';
import {
  ALL_NAMESPACE,
  AccountInfo,
} from '@platform-mesh/portal-ui-lib/models';
import {
  AccountInfoService,
  ErrorHandlerService,
  InstancePermissionsService,
  OrganizationReadyService,
  ResourceService,
} from '@platform-mesh/portal-ui-lib/services';
import {
  generateGraphQLFields,
  isNamespacedResource,
  permissionKey,
} from '@platform-mesh/portal-ui-lib/utils';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class NodeContextProcessingServiceImpl implements NodeContextProcessingService {
  private crdGatewayKcpPatchResolver = inject(CrdGatewayKcpPatchResolver);
  private accountInfoService = inject(AccountInfoService);
  private instancePermissionsService = inject(InstancePermissionsService);
  private organizationReadyService = inject(OrganizationReadyService);
  private errorHandlerService = inject(ErrorHandlerService);
  private luigiCoreService = inject(LuigiCoreService);

  public async processNodeContext(
    dynamicEntityId: string,
    entityNode: PortalLuigiNode,
    ctx: PortalNodeContext,
  ) {
    const kind = entityNode.defineEntity?.type;
    const entityId =
      dynamicEntityId || entityNode.context.resourceDefinition?.name;

    if (!entityId) {
      return;
    }

    const { kcpPath, accountPath } =
      await this.crdGatewayKcpPatchResolver.resolveCrdGatewayKcpPath(
        entityNode,
        entityId,
        kind,
      );

    const namespace =
      this.luigiCoreService.routing().getSearchParams().namespace !==
      ALL_NAMESPACE
        ? this.luigiCoreService.routing().getSearchParams().namespace
        : undefined;

    // update the current already calculated by Luigi context for a node
    this.addFieldsToContext(
      ctx,
      entityId,
      kcpPath,
      accountPath,
      kind,
      namespace,
    );

    // update the node context of sa node to contain the entity for future context calculations
    this.addFieldsToContext(
      entityNode.context,
      entityId,
      kcpPath,
      accountPath,
      kind,
      namespace,
    );

    this.accamulatePortalPermissions(ctx);
    this.getEntityPermissions(ctx, namespace);
    try {
      const accountInfo = await firstValueFrom(
        this.accountInfoService.read({
          portalContext: {
            crdGatewayApiUrl: ctx.portalContext.crdGatewayApiUrl,
          },
          token: ctx.token,
          accountId: entityId,
        }),
      );

      // update the current already calculated by Luigi context for a node
      this.addFieldsToContextFromAccountInfo(ctx, entityId, accountInfo);

      // update the node context of sa node to contain the entity for future context calculations
      this.addFieldsToContextFromAccountInfo(
        entityNode.context,
        entityId,
        accountInfo,
      );

      // we were able to ready the account info so on this kcpPath we can query for the organization ready state
      this.organizationReadyService.checkOrganizationReady();
    } catch (e) {
      if (
        this.errorHandlerService.redirectToErrorPage(
          e,
          this.isLocationWithinEntity(entityNode, dynamicEntityId),
        )
      ) {
        await this.abandonPendingNavigation();
      }

      this.errorHandlerService.handleError(e, 'Failed to read account info.');
    }
  }

  private abandonPendingNavigation(): Promise<never> {
    return new Promise<never>(() => {});
  }

  private isLocationWithinEntity(
    entityNode: PortalLuigiNode,
    dynamicEntityId: string,
  ): boolean {
    const locationSegments = window.location.pathname
      .split('/')
      .filter(Boolean);
    const entitySegments: (string | undefined)[] = [];

    for (
      let node: PortalLuigiNode | undefined = entityNode;
      node;
      node = node.parent
    ) {
      if (!node.pathSegment) {
        continue;
      }

      const isDynamicSegment = node.pathSegment.startsWith(':');
      const dynamicSegmentValue =
        node === entityNode ? dynamicEntityId || undefined : undefined;
      entitySegments.unshift(
        isDynamicSegment ? dynamicSegmentValue : node.pathSegment,
      );
    }

    return entitySegments.every(
      (segment, index) =>
        segment === undefined || segment === locationSegments[index],
    );
  }

  private addFieldsToContext(
    ctx: PortalNodeContext,
    entityId: string | undefined,
    kcpPath: string,
    accountPath: string | undefined,
    kind: string | undefined,
    namespace: string | undefined,
  ) {
    ctx.kcpPath = kcpPath;
    ctx.entityName = entityId;
    ctx.entityKind = kind;
    ctx.accountPath = accountPath;
    ctx.namespaceId = namespace;
  }

  private addFieldsToContextFromAccountInfo(
    ctx: PortalNodeContext,
    entityId: string,
    accountInfo: AccountInfo,
  ) {
    const accountOriginClusterId = accountInfo.spec.account.originClusterId;
    const organizationOriginClusterId =
      accountInfo.spec.organization.originClusterId;
    const organization = accountInfo.spec.organization.name;

    ctx.organizationId = `${organizationOriginClusterId}/${organization}`;
    ctx.entityId = `${accountOriginClusterId}/${entityId}`;
    ctx.kcpCA = btoa(accountInfo.spec.clusterInfo.ca);
  }

  private getEntityPermissions(
    ctx: PortalNodeContext,
    namespace: string | undefined,
  ) {
    const resourceDefinition = ctx.resourceDefinition;

    if (!resourceDefinition || !resourceDefinition?.permissionsDefinition) {
      return;
    }

    const name = ctx[resourceDefinition.permissionsDefinition.entityContextKey];

    if (!name) {
      return;
    }

    return this.instancePermissionsService
      .checkInstance(ctx, resourceDefinition.permissionsDefinition!, {
        name,
        namespace,
      })
      .subscribe((result) => {
        const portalPermissions = ctx.portalPermissions ?? {};

        result.forEach((permission) => {
          portalPermissions[`${permissionKey(permission)}`] =
            permission.actions;
        });

        ctx.portalPermissions = portalPermissions;
      });
  }

  private accamulatePortalPermissions(ctx: PortalNodeContext) {
    const portalPermissions = ctx.portalPermissions ?? {};

    ctx.nodesPermissions?.forEach((permission) => {
      portalPermissions[permission.resource] = permission.actions;
    });

    ctx.portalPermissions = portalPermissions;
  }
}
