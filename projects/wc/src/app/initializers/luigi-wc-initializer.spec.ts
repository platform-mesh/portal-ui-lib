import { ApplicationInitStatus } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { DetailViewComponent } from '../components/generic-ui/detail-view/detail-view.component';
import { ListViewComponent } from '../components/generic-ui/list-view/list-view.component';
import { provideLuigiWebComponents } from './luigi-wc-initializer';

import { OrganizationManagementComponent } from '../components/organization-management/organization-management.component';
import * as wc from '../utils/wc';

describe('provideLuigiWebComponents', () => {
  beforeEach(() => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [provideLuigiWebComponents()],
    });
  });

  it('registers Luigi web components on app init', async () => {
    const spy = jest.spyOn(wc, 'registerLuigiWebComponents').mockReturnValue();

    // Trigger Angular APP_INITIALIZERs
    await TestBed.inject(ApplicationInitStatus).donePromise;

    expect(spy).toHaveBeenCalledTimes(1);

    const expectedMap = {
      'generic-list-view': ListViewComponent,
      'generic-detail-view': DetailViewComponent,
      'organization-management': OrganizationManagementComponent,
    } as Record<string, any>;

    // Validate first arg equals the components map
    expect(spy.mock.calls[0][0]).toEqual(expectedMap);

    // Validate second arg looks like an Injector
    const passedInjector = spy.mock.calls[0][1];
    expect(passedInjector).toBeTruthy();
    expect(typeof passedInjector.get).toBe('function');
  });
});
