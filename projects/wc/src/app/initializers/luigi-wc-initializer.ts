import { DetailViewComponent } from '../components/generic-ui/detail-view/detail-view.component';
import { ListViewComponent } from '../components/generic-ui/list-view/list-view.component';
import { registerLuigiWebComponents } from '../utils/wc';
import { Injector, inject, provideAppInitializer } from '@angular/core';

export const provideLuigiWebComponents = () =>
  provideAppInitializer(() => {
    const injector = inject(Injector);
    registerLuigiWebComponents(
      {
        'generic-list-view': ListViewComponent,
        'generic-detail-view': DetailViewComponent,
      },
      injector,
    );
  });
