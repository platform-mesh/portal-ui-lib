import { inject, provideAppInitializer } from '@angular/core';
import { Router } from '@angular/router';
import {
  AuthConfigService,
  AuthService,
  EnvConfigService,
  LuigiCoreService,
} from '@openmfp/portal-ui-lib';

export const organizationInitializer = () => {
  return provideAppInitializer(async () => {
    const envConfigService = inject(EnvConfigService);
    const router = inject(Router);
    const authService = inject(AuthService);
    const authConfigService = inject(AuthConfigService);
    const luigiCoreService = inject(LuigiCoreService);

    try {
      const env = await envConfigService.getEnvConfig();
      await authService.refresh();
      const auth = authService.getAuthData();
      // const envConfig = await envConfigService.getEnvConfig();
      if (!auth && window.location.pathname !== '/callback') {
        luigiCoreService.setConfig({
          auth: authConfigService.getAuthConfig(),
        });
        luigiCoreService.setAuthData(auth);
      } else if (auth && env.idpName === 'default') {
        router.navigate(['organization-management']);
      }
    } catch {
      router.navigate(['organization-management']);
    }
  });
};
