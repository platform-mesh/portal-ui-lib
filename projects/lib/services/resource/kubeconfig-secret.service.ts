import { ResourceNodeContext } from './resource-node-context';
import { ResourceService } from './resource.service';
import { Injectable, inject } from '@angular/core';
import { ResourceDefinition } from '@platform-mesh/portal-ui-lib/models';
import { Observable, map } from 'rxjs';

const SECRET_RESOURCE_DEFINITION: ResourceDefinition = {
  version: 'v1',
  entity: 'Secret',
  entityCollection: 'Secrets',
  scope: 'Namespaced',
};

@Injectable({
  providedIn: 'root',
})
export class KubeconfigSecretService {
  private resourceService = inject(ResourceService);

  readEncodedKubeconfig(
    name: string,
    namespace: string,
    dataKey: string,
    context: ResourceNodeContext,
  ): Observable<string | undefined> {
    const secretContext: ResourceNodeContext = {
      ...context,
      namespaceId: namespace,
      resourceDefinition: SECRET_RESOURCE_DEFINITION,
    };

    return this.resourceService
      .read(name, SECRET_RESOURCE_DEFINITION, ['data'], secretContext, false)
      .pipe(map((secret) => secret.data?.[dataKey]));
  }
}
