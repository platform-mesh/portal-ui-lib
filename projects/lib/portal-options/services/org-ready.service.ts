import { Injectable, inject } from '@angular/core';
import {
  AuthService,
  ConfigService,
  EnvConfigService,
} from '@openmfp/portal-ui-lib';
import { ResourceService } from '@platform-mesh/portal-ui-lib/services';
import { Subject, exhaustMap, filter, tap } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class OrganizationReadyService {
  private configService = inject(ConfigService);
  private envConfigService = inject(EnvConfigService);
  private resourceService = inject(ResourceService);
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
          this.resourceService.readOrganizationReady({
            portalContext: {
              crdGatewayApiUrl: portalConfig.portalContext['crdGatewayApiUrl'],
            },
            token: this.authService.getToken(),
            accountId: idpName,
          }),
        ),
        tap((isReady) => {
          this.isReady = isReady;
        }),
      )
      .subscribe();
  }

  public checkOrganizationReady() {
    this.check$.next();
  }
}
