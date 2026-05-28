import {
  DetailView,
  ListView,
  OrganizationManagementView,
  WelcomeView,
} from '../components';
import { ErrorView } from '../components/error/error.component';
import { OSListView } from '../components/generic-ui/opensearch-list-view/os-list-view.component';
import { registerLuigiWebComponents } from '../utils/wc';
import { Injector, inject, provideAppInitializer } from '@angular/core';
import { createCustomElement } from '@angular/elements';

export const provideLuigiWebComponents = () =>
  provideAppInitializer(() => {
    const injector = inject(Injector);
    registerLuigiWebComponents(
      {
        'generic-os-list-view': OSListView,
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
