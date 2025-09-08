import { makeEnvironmentProviders } from '@angular/core';
import { organizationInitializer } from './initializers/organization-initializer';


export const provideOrganizationFeature = () => {
  return makeEnvironmentProviders([
    organizationInitializer(),
  ]);
};
