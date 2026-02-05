import { ApolloFactory } from './apollo-factory';
import { queryLoginCluster } from './logical-cluster.queries';
import { ResourceNodeContext } from './resource-node-context';
import { Injectable, inject } from '@angular/core';
import { LogicalCluster } from '@platform-mesh/portal-ui-lib/models';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class LogicalClusterService {
  private apolloFactory = inject(ApolloFactory);

  public read(nodeContext: ResourceNodeContext): Observable<LogicalCluster> {
    return this.apolloFactory
      .apollo(nodeContext)
      .query<LogicalCluster>({
        query: queryLoginCluster,
      })
      .pipe(map((res: any) => res.data.core_kcp_io.v1alpha1.LogicalCluster));
  }
}
