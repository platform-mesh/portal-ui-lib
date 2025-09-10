jest.mock('../components/generic-ui/detail-view/detail-view.component', () => ({
  DetailViewComponent: class DetailViewComponent {},
}));
jest.mock('../components/generic-ui/list-view/list-view.component', () => ({
  ListViewComponent: class ListViewComponent {},
}));
jest.mock('../components/organization-management/organization-management.component', () => ({
  OrganizationManagementComponent: class OrganizationManagementComponent {},
}));

import { ApplicationInitStatus } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { provideLuigiWebComponents } from './luigi-wc-initializer';
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

    const componentsMap = spy.mock.calls[0][0] as Record<string, any>;
    expect(componentsMap).toBeTruthy();
    expect(Object.keys(componentsMap).sort()).toEqual(
      ['generic-detail-view', 'generic-list-view', 'organization-management'].sort(),
    );

    // Validate second arg looks like an Injector
    const passedInjector = spy.mock.calls[0][1];
    expect(passedInjector).toBeTruthy();
    expect(typeof passedInjector.get).toBe('function');
  });
});
