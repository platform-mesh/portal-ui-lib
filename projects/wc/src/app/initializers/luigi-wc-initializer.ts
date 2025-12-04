import {
  DetailViewComponent,
  ListViewComponent,
  OrganizationManagementComponent,
  WelcomeComponent,
} from '../components';
import { ErrorComponent } from '../components/error/error.component';
import { registerLuigiWebComponents } from '../utils/wc';
import { Injector, inject, provideAppInitializer } from '@angular/core';

export const provideLuigiWebComponents = () =>
  provideAppInitializer(() => {
    const injector = inject(Injector);
    registerLuigiWebComponents(
      {
        'generic-list-view': ListViewComponent,
        'generic-detail-view': DetailViewComponent,
        'organization-management': OrganizationManagementComponent,
        'welcome-view': WelcomeComponent,
        'error-component': ErrorComponent,
      },
      injector,
    );

    return undefined;
  });
