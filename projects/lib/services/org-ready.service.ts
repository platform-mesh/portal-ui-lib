import { LogicalClusterService } from './resource';
import { Injectable, inject } from '@angular/core';
import {
  AuthService,
  ConfigService,
  EnvConfigService,
  LuigiCoreService,
} from '@openmfp/portal-ui-lib';
import { LogicalCluster } from '@platform-mesh/portal-ui-lib/models';
import { EMPTY, Subject, exhaustMap, filter } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class OrganizationReadyService {
  private configService = inject(ConfigService);
  private envConfigService = inject(EnvConfigService);
  private luigiCoreService = inject(LuigiCoreService);
  private logicalClusterService = inject(LogicalClusterService);
  private authService = inject(AuthService);

  private isReady = false;
  private check$ = new Subject<void>();

  constructor() {
    void this.initChecks();
  }

  private async initChecks() {
    const portalConfig = await this.configService.getPortalConfig();
    const { idpName } = await this.envConfigService.getEnvConfig();

    if (idpName === 'welcome') {
      return;
    }

    this.check$
      .pipe(
        filter(() => !this.isReady),
        exhaustMap(() =>
          this.logicalClusterService
            .read({
              portalContext: {
                crdGatewayApiUrl:
                  portalConfig.portalContext['crdGatewayApiUrl'],
              },
              token: this.authService.getToken(),
              accountId: idpName,
            })
            .pipe(
              catchError((error) => {
                console.error('Org check failed', error);
                // Return EMPTY so the exhaustMap completes without killing the check$ stream
                return EMPTY;
              }),
            ),
        ),
        map((res: LogicalCluster) => {
          this.isReady = res.status.phase === 'Ready';
          if (!this.isReady) {
            this.luigiCoreService.navigation().navigate('/error/503');
          }
        }),
      )
      .subscribe();
  }

  public checkOrganizationReady() {
    this.check$.next();
  }
}
