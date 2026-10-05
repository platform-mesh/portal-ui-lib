import type { NavigationNode } from './portal-shell.ts';
import type { Locator, Page } from '@playwright/test';

export class AccountsListPage {
  static readonly path = '/home/accounts';
  static readonly viewName = 'generic-list-view';
  static readonly navigation: NavigationNode = {
    pathSegment: 'accounts',
    label: 'Accounts',
  };

  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  accountRow(accountName: string): Locator {
    return this.page.getByRole('row', { name: accountName });
  }

  async openAccount(accountName: string): Promise<void> {
    await this.accountRow(accountName).click();
  }
}
