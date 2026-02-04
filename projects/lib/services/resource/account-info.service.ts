import { accountInfoRead } from './account-info.queries';
import { ApolloFactory } from './apollo-factory';
import { ResourceNodeContext } from './resource-node-context';
import { Injectable, inject } from '@angular/core';
import { AccountInfo } from '@platform-mesh/portal-ui-lib/models';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class AccountInfoService {
  private apolloFactory = inject(ApolloFactory);

  read(nodeContext: ResourceNodeContext): Observable<AccountInfo> {
    return this.apolloFactory
      .apollo(nodeContext)
      .query<AccountInfo>({
        query: accountInfoRead,
      })
      .pipe(
        map((res: any) => {
          const rawAccountInfo =
            res.data.core_platform_mesh_io.v1alpha1.AccountInfo;

          return {
            ...rawAccountInfo,
            spec: {
              ...rawAccountInfo.spec,
              oidc: {
                ...rawAccountInfo.spec.oidc,
                clients: JSON.parse(rawAccountInfo.spec.oidc.clients),
              },
            },
          };
        }),
      );
  }
}
