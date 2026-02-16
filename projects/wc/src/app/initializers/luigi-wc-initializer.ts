import {
  DetailView,
  ListView,
  OrganizationManagementView,
  WelcomeView,
} from '../components';
import { ErrorView } from '../components/error/error.component';
import { registerLuigiWebComponents } from '../utils/wc';
import { Injector, inject, provideAppInitializer } from '@angular/core';

export const provideLuigiWebComponents = () =>
  provideAppInitializer(() => {
    const injector = inject(Injector);
    registerLuigiWebComponents(
      {
        'generic-list-view': ListView,
        'generic-detail-view': DetailView,
        'organization-management': OrganizationManagementView,
        'welcome-view': WelcomeView,
        'error-component': ErrorView,
      },
      injector,
    );

    return undefined;
  });
