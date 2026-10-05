import type { Locator, Page } from '@playwright/test';

const luigiWebComponentTagPrefix = 'luigi-wc-';

export interface NavigationNode {
  pathSegment: string;
  label: string;
}

export class PortalShell {
  static readonly selectedNavigationItemClass = /\bis-selected\b/;

  readonly alert: Locator;
  private readonly page: Page;

  constructor(page: Page) {
    this.page = page;
    this.alert = page.getByTestId('luigi-alert');
  }

  async open(): Promise<void> {
    await this.page.goto('/');
  }

  navigationItem({ pathSegment, label }: NavigationNode): Locator {
    return this.page.getByTestId(`${pathSegment}_${label}`.toLowerCase());
  }

  async renderedViews(): Promise<string[]> {
    const tagNames = await this.page
      .locator('.wcContainer > *')
      .evaluateAll((elements) =>
        elements.map((element) => element.tagName.toLowerCase()),
      );

    return tagNames
      .filter((tagName) => tagName.startsWith(luigiWebComponentTagPrefix))
      .map((tagName) => this.viewNameOf(tagName));
  }

  private viewNameOf(luigiWebComponentTagName: string): string {
    const viewUrl = Buffer.from(
      luigiWebComponentTagName.slice(luigiWebComponentTagPrefix.length),
      'hex',
    ).toString('utf8');
    return new URL(viewUrl).hash.slice(1);
  }
}
