import type { Locator, Page } from '@playwright/test';

export class HeaderBar {
  static readonly allNamespacesLabel = 'All namespaces';
  static readonly noMatchingNamespacesText = 'No matching namespaces';

  readonly currentPage: Locator;
  readonly namespaceButton: Locator;
  readonly namespaceSearch: Locator;
  readonly namespaceOptions: Locator;
  readonly namespaceListMessage: Locator;
  private readonly namespaceList: Locator;

  constructor(page: Page) {
    this.namespaceList = page.getByRole('listbox', { name: 'Namespaces' });
    this.currentPage = page
      .getByRole('navigation', { name: 'Breadcrumb' })
      .locator('[aria-current="page"]');
    this.namespaceButton = page.getByTestId('namespace-selection-combobox');
    this.namespaceSearch = page
      .getByTestId('namespace-selection-search')
      .locator('input');
    this.namespaceOptions = this.namespaceList.getByRole('option');
    this.namespaceListMessage = this.namespaceList.locator(
      '.pm-namespace-menu__empty',
    );
  }

  namespaceOption(label: string): Locator {
    return this.namespaceList.getByRole('option', { name: label, exact: true });
  }

  async chooseNamespace(label: string): Promise<void> {
    await this.namespaceButton.click();
    await this.namespaceOption(label).click();
  }
}
