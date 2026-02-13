import { PortalNodeContext } from '../models/luigi-context';
import { PortalLuigiNode } from '../models/luigi-node';
import { CrdGatewayKcpPatchResolver } from './crd-gateway-kcp-patch-resolver.service';
import { Injectable, inject } from '@angular/core';
import { NodeContextProcessingService } from '@openmfp/portal-ui-lib';
import { AccountInfo } from '@platform-mesh/portal-ui-lib/models';
import {
  AccountInfoService,
  ErrorHandlerService,
  OrganizationReadyService,
} from '@platform-mesh/portal-ui-lib/services';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class NodeContextProcessingServiceImpl implements NodeContextProcessingService {
  private crdGatewayKcpPatchResolver = inject(CrdGatewayKcpPatchResolver);
  private accountInfoService = inject(AccountInfoService);
  private organizationReadyService = inject(OrganizationReadyService);
  private errorHandlerService = inject(ErrorHandlerService);

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

    // update the current already calculated by Luigi context for a node
    this.addFieldsToContext(ctx, entityId, kcpPath, accountPath, kind);

    // update the node context of sa node to contain the entity for future context calculations
    this.addFieldsToContext(
      entityNode.context,
      entityId,
      kcpPath,
      accountPath,
      kind,
    );

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
      if (!this.errorHandlerService.isUnauthorizedAccess(e)) {
        console.error('Failed to read account info', e);
      }
    }
  }

  private addFieldsToContext(
    ctx: PortalNodeContext,
    entityId: string | undefined,
    kcpPath: string,
    accountPath: string | undefined,
    kind: string | undefined,
  ) {
    ctx.kcpPath = kcpPath;
    ctx.entityName = entityId;
    ctx.entityKind = kind;
    ctx.accountPath = accountPath;
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
}
