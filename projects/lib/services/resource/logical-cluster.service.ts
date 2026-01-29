import { ApolloFactory } from './apollo-factory';
import { queryLoginCluster } from './logical-cluster.queries';
import { ResourceNodeContext } from './resource-node-context';
import { Injectable, inject } from '@angular/core';
import { LuigiCoreService } from '@openmfp/portal-ui-lib';
import { LogicalCluster } from '@platform-mesh/portal-ui-lib/models';
import { Observable } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class LogicalClusterService {
  private apolloFactory = inject(ApolloFactory);
  private luigiCoreService = inject(LuigiCoreService);

  public read(nodeContext: ResourceNodeContext): Observable<LogicalCluster> {
    return this.apolloFactory
      .apollo(nodeContext)
      .query<LogicalCluster>({
        query: queryLoginCluster,
      })
      .pipe(
        map((res: any) => res.data.core_kcp_io.v1alpha1.LogicalCluster),
        catchError((error) => {
          this.luigiCoreService.showAlert({
            text: error.message,
            type: 'error',
          });
          console.error('Error executing GraphQL query.', error);
          throw error;
        }),
      );
  }
}
