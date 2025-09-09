import { Injector, inject, provideAppInitializer } from '@angular/core';
import { DetailViewComponent } from '../components/generic-ui/detail-view/detail-view.component';
import { ListViewComponent } from '../components/generic-ui/list-view/list-view.component';
import { OrganizationManagementComponent } from '../components/organization-management/organization-management.component';
import { registerLuigiWebComponents } from '../utils/wc';

export const provideLuigiWebComponents = () =>
  provideAppInitializer(() => {
    const injector = inject(Injector);
    registerLuigiWebComponents(
      {
        'generic-list-view': ListViewComponent,
        'generic-detail-view': DetailViewComponent,
        'organization-management': OrganizationManagementComponent,
      },
      injector,
    );

    return undefined
  });
