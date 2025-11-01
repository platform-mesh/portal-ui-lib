import { PortalNodeContext } from '../models/luigi-context';
import { PortalLuigiNode } from '../models/luigi-node';
import { CrdGatewayKcpPatchResolver } from './crd-gateway-kcp-patch-resolver.service';
import { Injectable, inject } from '@angular/core';
import { NodeContextProcessingService } from '@openmfp/portal-ui-lib';
import { ResourceService } from '@platform-mesh/portal-ui-lib/services';
import { replaceDotsAndHyphensWithUnderscores } from '@platform-mesh/portal-ui-lib/utils';
import { firstValueFrom } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class NodeContextProcessingServiceImpl
  implements NodeContextProcessingService
{
  private resourceService = inject(ResourceService);
  private crdGatewayKcpPatchResolver = inject(CrdGatewayKcpPatchResolver);

  public async processNodeContext(
    entityId: string,
    entityNode: PortalLuigiNode,
    ctx: PortalNodeContext,
  ) {
    const group = entityNode.defineEntity?.graphqlEntity?.group;
    const kind = entityNode.defineEntity?.graphqlEntity?.kind;
    const queryPart = entityNode.defineEntity?.graphqlEntity?.query;

    if (!entityId || !group || !kind || !queryPart) {
      return;
    }

    const kcpPath =
      await this.crdGatewayKcpPatchResolver.resolveCrdGatewayKcpPath(
        entityNode,
        entityId,
        kind,
      );

    const operation = replaceDotsAndHyphensWithUnderscores(group);
    const namespaceId =
      ctx.resourceDefinition?.scope === 'Namespaced'
        ? ctx.namespaceId
        : undefined;
    let query = `query ($name: String!) { ${operation} { ${kind}(name: $name) ${queryPart} }}`;
    if (namespaceId) {
      query = `query ($name: String!, $namespace: String!) { ${operation} { ${kind}(name: $name, namespace: $namespace) ${queryPart} }}`;
    }

    try {
      const entity = await firstValueFrom(
        this.resourceService.read(
          entityId,
          operation,
          kind,
          query,
          {
            resourceDefinition: ctx.resourceDefinition,
            portalContext: {
              crdGatewayApiUrl: ctx.portalContext.crdGatewayApiUrl,
            },
            token: ctx.token,
            namespaceId,
          },
          kind.toLowerCase() === 'account',
        ),
      );

      // update the current already calculated by Luigi context for a node
      ctx.kcpPath = kcpPath;
      ctx.entity = entity;
      ctx.entityName = entityId;
      ctx.entityId = `${entity.metadata?.annotations?.['kcp.io/cluster']}/${entityId}`;
      // update the node context of sa node to contain the entity for future context calculations
      entityNode.context.kcpPath = kcpPath;
      entityNode.context.entity = entity;
      entityNode.context.entityName = ctx.entityName;
      entityNode.context.entityId = ctx.entityId;
    } catch (e) {
      console.error(`Not able to read entity ${entityId} from ${operation}`);
    }
  }
}
