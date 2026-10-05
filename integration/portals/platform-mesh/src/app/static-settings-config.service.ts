import {
  LuigiStaticSettings,
  StaticSettingsConfigService,
} from '@openmfp/portal-ui-lib';

export class StaticSettingsConfigServiceImpl implements StaticSettingsConfigService {
  getStaticSettingsConfig() {
    const logo = 'assets/images/logo.png';
    const settings: LuigiStaticSettings = {
      header: {
        title: 'Platform Mesh Portal',
        logo,
        favicon: logo,
      },
      experimental: {
        btpToolLayout: true,
        globalNav: true,
        navHeader: true,
      },
    };

    return settings as any;
  }
}
