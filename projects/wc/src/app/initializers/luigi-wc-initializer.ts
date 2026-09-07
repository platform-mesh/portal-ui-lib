import {
  DetailView,
  ListView,
  OrganizationManagementView,
  WelcomeView,
} from '../components';
import { ErrorView } from '../components/error/error.component';
import { OpenSearchListView } from '../components/generic-ui/opensearch-list-view/open-search-list-view.component';
import { SearchListDynamicPage } from '../components/generic-ui/search-list-dynamic-page/search-list-dynamic-page.component';
import { registerLuigiWebComponents } from '../utils/wc';
import { Injector, inject, provideAppInitializer } from '@angular/core';
import { createCustomElement } from '@angular/elements';

export const provideLuigiWebComponents = () =>
  provideAppInitializer(() => {
    const injector = inject(Injector);
    registerLuigiWebComponents(
      {
        'generic-os-list-view': OpenSearchListView,
        'generic-list-view': ListView,
        'generic-detail-view': DetailView,
        'organization-management': OrganizationManagementView,
        'welcome-view': WelcomeView,
        'error-component': ErrorView,
        'search-list-dynamic-page': SearchListDynamicPage,
      },
      injector,
    );
    return undefined;
  });
