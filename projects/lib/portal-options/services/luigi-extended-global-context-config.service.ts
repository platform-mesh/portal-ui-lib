import { Injectable, inject } from '@angular/core';
import {
  AuthService,
  ConfigService,
  EnvConfigService,
  LuigiExtendedGlobalContextConfigService,
} from '@openmfp/portal-ui-lib';
import { ResourceService } from '@platform-mesh/portal-ui-lib/services';
import { firstValueFrom } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LuigiExtendedGlobalContextConfigServiceImpl
  implements LuigiExtendedGlobalContextConfigService
{
  private resourceService = inject(ResourceService);
  private envConfigService = inject(EnvConfigService);
  private configService = inject(ConfigService);
  private authService = inject(AuthService);

  async createLuigiExtendedGlobalContext(): Promise<Record<string, any>> {
    const portalConfig = await this.configService.getPortalConfig();
    const entityId = (await this.envConfigService.getEnvConfig())[
      'organization'
    ];
    const operation = 'core_platform_mesh_io';

    try {
      const accountInfo = await firstValueFrom(
        this.resourceService.readAccountInfo({
          portalContext: {
            crdGatewayApiUrl: portalConfig.portalContext['crdGatewayApiUrl'],
          },
          token: this.authService.getToken(),
          accountId: entityId,
        }),
      );

      const resourceKcpIoClusterAnnotation =
        accountInfo?.metadata?.annotations?.['kcp.io/cluster'];
      if (!resourceKcpIoClusterAnnotation) {
        console.warn(
          `Cluster annotation (kcp.io/cluster) missing for resource: ${entityId}`,
        );
        return {};
      }

      return {
        organization: entityId,
        organizationId: `${resourceKcpIoClusterAnnotation}/${entityId}`,
        kcpCA: btoa(accountInfo?.spec?.clusterInfo?.ca),
        entityId: `${resourceKcpIoClusterAnnotation}/${entityId}`, // if no entity selected the entityId is the same as the organizationId
      };
    } catch (e) {
      console.error(`Failed to read entity ${entityId} from ${operation}`, e);
    }
    return {};
  }
}
