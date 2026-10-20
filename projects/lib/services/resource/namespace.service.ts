import { ResourceNodeContext } from './resource-node-context';
import { ResourceService } from './resource.service';
import { Injectable, inject } from '@angular/core';
import {
  ResourceDefinition,
  ResourceListResult,
} from '@platform-mesh/portal-ui-lib/models';
import { generateGraphQLFields } from '@platform-mesh/portal-ui-lib/utils';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class NamespaceService {
  private resourceService = inject(ResourceService);

  list(nodeContext: ResourceNodeContext): Observable<string[]> {
    return this.resourceService
      .list(
        'v1_namespaces',
        generateGraphQLFields([{ property: 'metadata.name' }]),
        {
          portalContext: {
            crdGatewayApiUrl: nodeContext.portalContext.crdGatewayApiUrl,
          },
          resourceDefinition: {
            version: 'v1',
            entityCollection: 'Namespaces',
            entity: 'Namespace',
            scope: 'Cluster',
          } as ResourceDefinition,
          kcpPath: nodeContext.kcpPath,
          token: nodeContext.token,
        },
      )
      .pipe(
        map((result: ResourceListResult) =>
          result.items.map((item) => item.metadata.name),
        ),
      );
  }
}
