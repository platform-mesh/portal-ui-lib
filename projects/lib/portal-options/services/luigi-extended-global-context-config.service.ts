import { kcpRootOrgsPath } from '../models/constants';
import { Injectable, inject } from '@angular/core';
import {
  EnvConfigService,
  LuigiExtendedGlobalContextConfigService,
} from '@openmfp/portal-ui-lib';

@Injectable({ providedIn: 'root' })
export class LuigiExtendedGlobalContextConfigServiceImpl implements LuigiExtendedGlobalContextConfigService {
  private envConfigService = inject(EnvConfigService);

  async createLuigiExtendedGlobalContext(): Promise<Record<string, any>> {
    const idpName = (await this.envConfigService.getEnvConfig()).idpName;

    if (idpName === 'welcome') {
      return {};
    }

    return {
      organization: idpName,
      kcpPath: `${kcpRootOrgsPath}:${idpName}`,
      entityName: idpName,
    };
  }
}
