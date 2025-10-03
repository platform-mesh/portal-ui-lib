import { Injectable, inject } from '@angular/core';
import {
  ClientEnvironment,
  EnvConfigService,
  RoutingConfigService,
} from '@openmfp/portal-ui-lib';

@Injectable()
export class CustomRoutingConfigServiceImpl implements RoutingConfigService {
  private envConfigService = inject(EnvConfigService);
  private envConfig: ClientEnvironment | null = null;

  constructor() {
    this.getEnvConfig();
  }

  async getEnvConfig(): Promise<void> {
    this.envConfig = await this.envConfigService.getEnvConfig();
  }

  getRoutingConfig(): any {
    return {
      pageNotFoundHandler: async () => {
        if (!this.envConfig?.baseDomain) {
          return this.redirectTo('error/404');
        }

        if (window.location.hostname !== this.envConfig.baseDomain) {
          return this.redirectTo('welcome');
        }

        return this.redirectTo('error/404');
      },
    };
  }

  public redirectTo(path: string): any {
    return {
      redirectTo: path,
      keepURL: true,
    };
  }
}
