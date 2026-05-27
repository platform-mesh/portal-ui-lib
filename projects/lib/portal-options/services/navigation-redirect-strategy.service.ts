import { Injectable } from '@angular/core';
import {
  LocalStorageKeys,
  NavigationRedirectStrategy,
} from '@openmfp/portal-ui-lib';

@Injectable({ providedIn: 'root' })
export class NavigationRedirectStrategyServiceImpl implements NavigationRedirectStrategy {
  getRedirectUrl(): string {
    return localStorage.getItem(LocalStorageKeys.LAST_NAVIGATION_URL) || '';
  }

  saveRedirectUrl(url: string): void {
    if (url.startsWith('/error')) {
      return;
    }

    localStorage.setItem(LocalStorageKeys.LAST_NAVIGATION_URL, url);
  }

  clearRedirectUrl(): void {
    localStorage.removeItem(LocalStorageKeys.LAST_NAVIGATION_URL);
  }
}
