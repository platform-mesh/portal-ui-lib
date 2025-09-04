import { makeEnvironmentProviders } from '@angular/core';
import { provideRouter } from '@angular/router';
import {
  LuigiContextService,
  LuigiContextServiceImpl,
} from '@luigi-project/client-support-angular';
import { organizationInitializer } from './initializers/organization-initializer';
import { routes } from './routes';


export const provideOrganizationFeature = () => {
  return makeEnvironmentProviders([
    provideRouter(routes),
    organizationInitializer(),
    {
      provide: LuigiContextService,
      useClass: LuigiContextServiceImpl,
    }
  ]);
};
