import { accountInfoRead } from './account-info.queries';
import { ApolloFactory } from './apollo-factory';
import { ResourceNodeContext } from './resource-node-context';
import { Injectable, inject } from '@angular/core';
import { AccountInfo } from '@platform-mesh/portal-ui-lib/models';
import { Observable, throwError } from 'rxjs';
import { catchError, map, shareReplay } from 'rxjs/operators';

@Injectable({
  providedIn: 'root',
})
export class AccountInfoService {
  private apolloFactory = inject(ApolloFactory);
  private readCache = new Map<string, Observable<AccountInfo>>();

  read(nodeContext: ResourceNodeContext): Observable<AccountInfo> {
    const cacheKey = nodeContext.kcpPath ?? '';
    const cachedRead = this.readCache.get(cacheKey);
    if (cachedRead) {
      return cachedRead;
    }

    const request$ = this.apolloFactory
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
        shareReplay(1),
        catchError((error) => {
          this.readCache.delete(cacheKey);
          return throwError(() => error);
        }),
      );

    this.readCache.set(cacheKey, request$);
    return request$;
  }
}
