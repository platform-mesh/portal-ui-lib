import { expect, test } from '../../fixtures/portal-test.ts';
import { restMocks } from '../../mocks/mock-catalog.ts';
import { AccountsListPage } from '../../pages/accounts-list.page.ts';
import { HeaderBar } from '../../pages/header-bar.ts';
import { HttpBinsListPage } from '../../pages/httpbins-list.page.ts';
import { OverviewPage } from '../../pages/overview.page.ts';
import { PortalShell } from '../../pages/portal-shell.ts';
import type { Page } from '@playwright/test';

const selectedAccount = 'account-gamma';
const namespaceSearchParam = 'namespace';
const allNamespacesValue = '-all-';

test.describe('header bar of a namespaced list', () => {
  let headerBar: HeaderBar;
  let portalShell: PortalShell;

  test.beforeEach(async ({ page, portalBackend }) => {
    headerBar = new HeaderBar(page);
    portalShell = new PortalShell(page);
    portalBackend.respondToAccountEntityConfig(
      selectedAccount,
      restMocks.accountEntityConfigWithDashboardAndHttpBins,
    );

    await portalShell.open();
    await portalShell.navigationItem(AccountsListPage.navigation).click();
    await new AccountsListPage(page).openAccount(selectedAccount);
    await portalShell.navigationItem(HttpBinsListPage.navigation).click();
    await expectNamespaceInUrl(page, allNamespacesValue);
  });

  test('shows the path from home to the current page', async () => {
    await expect(
      portalShell.breadcrumb(OverviewPage.homeBreadcrumbLabel),
    ).toBeVisible();
    await expect(
      portalShell.breadcrumb(AccountsListPage.navigation.label),
    ).toBeVisible();
    await expect(portalShell.breadcrumb(selectedAccount)).toBeVisible();
    await expect(headerBar.currentPage).toHaveText(
      HttpBinsListPage.navigation.label,
    );
  });

  test('switches from all namespaces to one namespace and back', async ({
    page,
  }) => {
    await expect(headerBar.namespaceButton).toHaveText(
      HeaderBar.allNamespacesLabel,
    );

    await headerBar.chooseNamespace('team-b');

    await expectNamespaceInUrl(page, 'team-b');
    await expect(headerBar.namespaceButton).toHaveText('Namespace: team-b');

    await headerBar.chooseNamespace(HeaderBar.allNamespacesLabel);

    await expectNamespaceInUrl(page, allNamespacesValue);
    await expect(headerBar.namespaceButton).toHaveText(
      HeaderBar.allNamespacesLabel,
    );
  });

  test('finds a namespace by its name and says when none matches', async () => {
    await headerBar.namespaceButton.click();
    await expect(headerBar.namespaceOptions).toHaveText([
      HeaderBar.allNamespacesLabel,
      'team-a',
      'team-b',
    ]);

    await headerBar.namespaceSearch.fill('b');

    await expect(headerBar.namespaceOptions).toHaveText([
      HeaderBar.allNamespacesLabel,
      'team-b',
    ]);

    await headerBar.namespaceSearch.fill('missing');

    await expect(headerBar.namespaceOptions).toHaveText([
      HeaderBar.allNamespacesLabel,
    ]);
    await expect(headerBar.namespaceListMessage).toHaveText(
      HeaderBar.noMatchingNamespacesText,
    );
  });
});

async function expectNamespaceInUrl(page: Page, namespace: string) {
  await expect(page).toHaveURL(
    (url) => url.searchParams.get(namespaceSearchParam) === namespace,
  );
}
