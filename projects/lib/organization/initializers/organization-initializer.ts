import { inject, provideAppInitializer } from '@angular/core';
import { Router } from '@angular/router';
import { EnvConfigService } from '@openmfp/portal-ui-lib';

export const organizationInitializer = () => {
  return provideAppInitializer(async () => {
    const envService = inject(EnvConfigService)
    const router = inject(Router)

    try {
      await envService.getEnvConfig()
    } catch {
      router.navigate(['welcome']);
    }
  });
};
