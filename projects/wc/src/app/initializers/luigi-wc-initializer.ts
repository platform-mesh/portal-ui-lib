import {
  DetailView,
  ListView,
  OrganizationManagement,
  Welcome,
} from '../components';
import { Error } from '../components/error/error.component';
import { registerLuigiWebComponents } from '../utils/wc';
import { Injector, inject, provideAppInitializer } from '@angular/core';

export const provideLuigiWebComponents = () =>
  provideAppInitializer(() => {
    const injector = inject(Injector);
    registerLuigiWebComponents(
      {
        'generic-list-view': ListView,
        'generic-detail-view': DetailView,
        'organization-management': OrganizationManagement,
        'welcome-view': Welcome,
        'error-component': Error,
      },
      injector,
    );

    return undefined;
  });
