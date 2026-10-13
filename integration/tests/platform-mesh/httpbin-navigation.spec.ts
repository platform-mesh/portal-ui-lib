import type { PortalBackendMock } from '../../backend/portal-backend-mock.ts';
import { expect, test } from '../../fixtures/portal-test.ts';
import { gatewayMocks, restMocks } from '../../mocks/mock-catalog.ts';
import { AccountDashboardPage } from '../../pages/account-dashboard.page.ts';
import { AccountsListPage } from '../../pages/accounts-list.page.ts';
import { HttpBinPage } from '../../pages/httpbin.page.ts';
import { HttpBinsListPage } from '../../pages/httpbins-list.page.ts';
import { OverviewPage } from '../../pages/overview.page.ts';
import { PortalShell } from '../../pages/portal-shell.ts';
import type { NavigationNode } from '../../pages/portal-shell.ts';
import type { Page } from '@playwright/test';

const selectedAccount = 'account-gamma';
const listedHttpBins = ['httpbin-alpha', 'httpbin-beta'];
const selectedHttpBin = 'httpbin-beta';
const selectedHttpBinNamespace = 'team-b';
const namespaceSearchParam = 'namespace';

test.describe('httpbin navigation within an account', () => {
  let accountsList: AccountsListPage;
  let accountDashboard: AccountDashboardPage;
  let httpBinsList: HttpBinsListPage;
  let httpBin: HttpBinPage;
  let portalShell: PortalShell;

  test.beforeEach(async ({ page, portalBackend }) => {
    accountsList = new AccountsListPage(page);
    accountDashboard = new AccountDashboardPage(page);
    httpBinsList = new HttpBinsListPage(page);
    httpBin = new HttpBinPage(page);
    portalShell = new PortalShell(page);
    portalBackend.respondToAccountEntityConfig(
      selectedAccount,
      restMocks.accountEntityConfigWithDashboardAndHttpBins,
    );

    await portalShell.open();
    await expect(page).toHaveURL(OverviewPage.path);
    await portalShell.navigationItem(AccountsListPage.navigation).click();
    await expect(page).toHaveURL(AccountsListPage.path);
    await accountsList.openAccount(selectedAccount);
    await expect(page).toHaveURL(AccountDashboardPage.path(selectedAccount));
    await expect(accountDashboard.field('spec.displayName')).toContainText(
      `Display name of ${selectedAccount}`,
    );
    await expect
      .poll(() => portalShell.renderedViews())
      .toEqual([AccountDashboardPage.viewName]);

    await portalShell.navigationItem(HttpBinsListPage.navigation).click();

    await expect(page).toHaveURL(
      (url) =>
        url.pathname === HttpBinsListPage.path(selectedAccount) &&
        url.searchParams.has(namespaceSearchParam),
    );
    for (const httpBinName of listedHttpBins) {
      await expect(httpBinsList.httpBinRow(httpBinName)).toBeVisible();
    }
    await expect
      .poll(() => portalShell.renderedViews())
      .toEqual([HttpBinsListPage.viewName]);
  });

  test('keeps the namespace of the opened httpbin in the URL of every httpbin node', async ({
    page,
    portalBackend,
  }) => {
    let httpBinReadsBefore = httpBinReads(portalBackend).length;

    await httpBinsList.openHttpBin(selectedHttpBin);

    await expectHttpBinNodeShown(page, HttpBinPage.dashboard);
    await expectHttpBinReadInSelectedNamespace(
      portalBackend,
      httpBinReadsBefore,
    );
    for (const node of HttpBinPage.navigation) {
      await expect(portalShell.navigationItem(node)).toBeVisible();
    }

    for (const node of [
      HttpBinPage.details,
      HttpBinPage.status,
      HttpBinPage.dashboard,
    ]) {
      httpBinReadsBefore = httpBinReads(portalBackend).length;

      await portalShell.navigationItem(node).click();

      await expectHttpBinNodeShown(page, node);
      await expectHttpBinReadInSelectedNamespace(
        portalBackend,
        httpBinReadsBefore,
      );
    }
  });

  test('removes the namespace from the URL when navigating via the breadcrumbs out of the httpbin', async ({
    page,
  }) => {
    await httpBinsList.openHttpBin(selectedHttpBin);
    await expectHttpBinNodeShown(page, HttpBinPage.dashboard);

    await portalShell.breadcrumb(AccountsListPage.navigation.label).click();

    await expectShownWithoutNamespace(page, AccountsListPage.path);
    await expect(accountsList.accountRow(selectedAccount)).toBeVisible();

    await portalShell.breadcrumb(OverviewPage.homeBreadcrumbLabel).click();

    await expectShownWithoutNamespace(page, OverviewPage.path);
    await expect(
      portalShell.navigationItem(OverviewPage.navigation),
    ).toHaveClass(PortalShell.selectedNavigationItemClass);
  });

  async function expectShownWithoutNamespace(page: Page, path: string) {
    await expect(page).toHaveURL((url) => url.pathname === path);
    expect
      .soft(
        new URL(page.url()).searchParams.get(namespaceSearchParam),
        `the ${namespaceSearchParam} parameter must be removed on ${path}`,
      )
      .toBeNull();
  }

  async function expectHttpBinNodeShown(page: Page, node: NavigationNode) {
    await expect(page).toHaveURL(
      `${HttpBinPage.path(selectedAccount, selectedHttpBin, node)}?${namespaceSearchParam}=${selectedHttpBinNamespace}`,
    );
    await expect(portalShell.navigationItem(node)).toHaveClass(
      PortalShell.selectedNavigationItemClass,
    );
    await expect(httpBin.field('metadata.name')).toContainText(selectedHttpBin);
    await expect
      .poll(() => portalShell.renderedViews())
      .toEqual([HttpBinPage.viewName]);
  }

  async function expectHttpBinReadInSelectedNamespace(
    portalBackend: PortalBackendMock,
    readsBefore: number,
  ) {
    await expect
      .poll(() => [
        ...new Set(
          httpBinReads(portalBackend)
            .slice(readsBefore)
            .map((request) => request.namespace),
        ),
      ])
      .toEqual([selectedHttpBinNamespace]);
  }

  function httpBinReads(portalBackend: PortalBackendMock) {
    return portalBackend.requestsTo('httpBinRead', selectedAccount);
  }
});

test.describe('httpbin deep link without a namespace', () => {
  let httpBin: HttpBinPage;
  let portalShell: PortalShell;

  test.beforeEach(({ page, portalBackend }) => {
    httpBin = new HttpBinPage(page);
    portalShell = new PortalShell(page);
    portalBackend.respondToAccountEntityConfig(
      selectedAccount,
      restMocks.accountEntityConfigWithDashboardAndHttpBins,
    );
    portalBackend.respondToHttpBinRead(
      selectedAccount,
      gatewayMocks.httpBinReadMissingNamespaceArgument,
    );
  });

  test('opens every httpbin node without a namespace and shows that the httpbin could not be read', async ({
    page,
    portalBackend,
  }) => {
    test.info().annotations.push({
      type: 'current behavior',
      description:
        'A deep link without ?namespace gives the portal no namespace for the httpbin: it does not add one to the URL and reads the httpbin without it, which the gateway rejects with "missing required argument: namespace".',
    });
    let httpBinReadsBefore = httpBinReads(portalBackend).length;

    await page.goto(
      HttpBinPage.path(selectedAccount, selectedHttpBin, HttpBinPage.dashboard),
    );

    await expectHttpBinNodeShownWithoutNamespace(
      page,
      portalBackend,
      HttpBinPage.dashboard,
      httpBinReadsBefore,
    );

    for (const node of [HttpBinPage.details, HttpBinPage.status]) {
      httpBinReadsBefore = httpBinReads(portalBackend).length;

      await portalShell.navigationItem(node).click();

      await expectHttpBinNodeShownWithoutNamespace(
        page,
        portalBackend,
        node,
        httpBinReadsBefore,
      );
    }
  });

  async function expectHttpBinNodeShownWithoutNamespace(
    page: Page,
    portalBackend: PortalBackendMock,
    node: NavigationNode,
    readsBefore: number,
  ) {
    await expect(portalShell.navigationItem(node)).toHaveClass(
      PortalShell.selectedNavigationItemClass,
    );
    await expect(httpBin.readState).toHaveAttribute(
      'title-text',
      HttpBinPage.readFailedTitle,
    );
    await expect
      .poll(() => portalShell.renderedViews())
      .toEqual([HttpBinPage.viewName]);
    await expect(page).toHaveURL(
      HttpBinPage.path(selectedAccount, selectedHttpBin, node),
    );
    await expect(portalShell.alert).toHaveCount(0);
    await expect
      .poll(() => [
        ...new Set(
          httpBinReads(portalBackend)
            .slice(readsBefore)
            .map((request) => request.namespace),
        ),
      ])
      .toEqual([undefined]);
  }

  function httpBinReads(portalBackend: PortalBackendMock) {
    return portalBackend.requestsTo('httpBinRead', selectedAccount);
  }
});
