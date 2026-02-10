import { Injectable } from '@angular/core';
import { NavigationRedirectStrategy } from '@openmfp/portal-ui-lib';

const REDIRECT_URL_KEY = 'redirectUrl';

@Injectable({ providedIn: 'root' })
export class NavigationRedirectStrategyServiceImpl implements NavigationRedirectStrategy {
  getRedirectUrl(): string {
    return localStorage.getItem(REDIRECT_URL_KEY) || '';
  }

  saveRedirectUrl(url: string): void {
    if (url.startsWith('/error')) {
      return;
    }

    localStorage.setItem(REDIRECT_URL_KEY, url);
  }

  clearRedirectUrl(): void {
    localStorage.removeItem(REDIRECT_URL_KEY);
  }
}
