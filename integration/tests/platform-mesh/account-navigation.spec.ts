import { expect, test } from '../../fixtures/portal-test.ts';
import { gatewayErrorMocks, gatewayMocks } from '../../mocks/mock-catalog.ts';
import { AccountDashboardPage } from '../../pages/account-dashboard.page.ts';
import { AccountsListPage } from '../../pages/accounts-list.page.ts';
import { ErrorPage } from '../../pages/error.page.ts';
import type { ErrorPageCode } from '../../pages/error.page.ts';
import { OverviewPage } from '../../pages/overview.page.ts';
import { PortalShell } from '../../pages/portal-shell.ts';
import type { Page } from '@playwright/test';

const listedAccounts = [
  'account-alpha',
  'account-beta',
  'account-gamma',
  'account-delta',
];
const selectedAccount = 'account-gamma';

interface RedirectingFailure {
  description: string;
  mockFile: string;
  errorPageCode: ErrorPageCode;
}

interface NonRedirectingFailure {
  description: string;
  mockFile: string;
  errorDetail: string;
}

const accountInfoRedirectingFailures: RedirectingFailure[] = [
  {
    description: 'HTTP 404 Not Found',
    mockFile: gatewayErrorMocks.http404NotFound,
    errorPageCode: 404,
  },
  {
    description: 'a GraphQL "forbidden" error',
    mockFile: gatewayMocks.accountInfoReadForbiddenGraphqlError,
    errorPageCode: 403,
  },
];

const accountRedirectingFailures: RedirectingFailure[] = [
  {
    description: 'HTTP 404 Not Found',
    mockFile: gatewayErrorMocks.http404NotFound,
    errorPageCode: 404,
  },
  {
    description: 'a GraphQL "forbidden" error',
    mockFile: gatewayMocks.accountReadForbiddenGraphqlError,
    errorPageCode: 403,
  },
];

const nonRedirectingFailures: NonRedirectingFailure[] = [
  {
    description: 'HTTP 403 Forbidden',
    mockFile: gatewayErrorMocks.http403Forbidden,
    errorDetail: 'Received status code 403',
  },
  {
    description: 'HTTP 500 Internal Server Error',
    mockFile: gatewayErrorMocks.http500InternalServerError,
    errorDetail: 'Received status code 500',
  },
  {
    description: 'any other GraphQL error',
    mockFile: gatewayErrorMocks.graphqlErrorServiceUnavailable,
    errorDetail: 'the server is currently unable to handle the request',
  },
];

test.describe('account navigation from the accounts list', () => {
  let accountsList: AccountsListPage;
  let accountDashboard: AccountDashboardPage;
  let errorPage: ErrorPage;
  let portalShell: PortalShell;

  test.beforeEach(async ({ page, portalBackend }) => {
    accountsList = new AccountsListPage(page);
    accountDashboard = new AccountDashboardPage(page);
    errorPage = new ErrorPage(page);
    portalShell = new PortalShell(page);

    await portalShell.open();
    await expectOverviewShown(page);

    await portalShell.navigationItem(AccountsListPage.navigation).click();

    await expectAccountsListShown(page);
    for (const accountName of listedAccounts) {
      await expect(accountsList.accountRow(accountName)).toBeVisible();
    }
    expect(portalBackend.requestsTo('accountsList')).toHaveLength(1);
  });

  test('opens the account dashboard when account info and account are read', async ({
    page,
    portalBackend,
  }) => {
    await accountsList.openAccount(selectedAccount);

    await expect(page).toHaveURL(AccountDashboardPage.path(selectedAccount));
    await expect(accountDashboard.workspacePath).toHaveText(
      `root:orgs:test-org:${selectedAccount}`,
    );
    await expect(accountDashboard.field('spec.displayName')).toContainText(
      `Display name of ${selectedAccount}`,
    );
    await expect(
      portalShell.navigationItem(AccountDashboardPage.navigation),
    ).toBeVisible();
    await expect
      .poll(() => portalShell.renderedViews())
      .toEqual([AccountDashboardPage.viewName]);
    await expect(portalShell.alert).toHaveCount(0);
    expect(
      portalBackend.requestsTo('accountInfoRead', selectedAccount),
    ).toHaveLength(1);
    expect(
      portalBackend.requestsTo('accountRead', selectedAccount),
    ).toHaveLength(1);

    await expectBackNavigationToListThenOverview(page);
  });

  test.describe('when reading the account info fails', () => {
    for (const failure of accountInfoRedirectingFailures) {
      test(`renders only the ${failure.errorPageCode} error page for ${failure.description} and goes back to the list`, async ({
        page,
        portalBackend,
      }) => {
        portalBackend.respondToAccountInfoRead(
          selectedAccount,
          failure.mockFile,
        );

        await accountsList.openAccount(selectedAccount);

        await expectOnlyErrorPageShown(page, failure.errorPageCode);
        expect(
          portalBackend.requestsTo('accountEntityConfig', selectedAccount),
          'the account children must not be loaded',
        ).toHaveLength(0);
        expect(
          portalBackend.requestsTo('accountRead', selectedAccount),
          'the account view must not be rendered',
        ).toHaveLength(0);

        await expectBackNavigationToListThenOverview(page);
      });
    }

    for (const failure of nonRedirectingFailures) {
      test(`alerts and keeps the account dashboard for ${failure.description} and goes back to the list`, async ({
        page,
        portalBackend,
      }) => {
        test.info().annotations.push({
          type: 'current behavior',
          description:
            'Only 403 (forbidden message) and 404 redirect to the error page; other account info errors are alerted.',
        });
        portalBackend.respondToAccountInfoRead(
          selectedAccount,
          failure.mockFile,
        );

        await accountsList.openAccount(selectedAccount);

        await expect(portalShell.alert).toContainText(
          'Failed to read account info.',
        );
        await expect(portalShell.alert).toContainText(failure.errorDetail);
        await expect(page).toHaveURL(
          AccountDashboardPage.path(selectedAccount),
        );
        await expect
          .poll(() => portalShell.renderedViews())
          .toEqual([AccountDashboardPage.viewName]);

        await expectBackNavigationToListThenOverview(page);
      });
    }
  });

  test.describe('when the account info is read but reading the account fails', () => {
    for (const failure of accountRedirectingFailures) {
      test(`renders only the ${failure.errorPageCode} error page for ${failure.description} and goes back to the list`, async ({
        page,
        portalBackend,
      }) => {
        portalBackend.respondToAccountRead(selectedAccount, failure.mockFile);

        await accountsList.openAccount(selectedAccount);

        await expectOnlyErrorPageShown(page, failure.errorPageCode);
        expect(
          portalBackend.requestsTo('accountInfoRead', selectedAccount),
        ).toHaveLength(1);
        expect(
          portalBackend.requestsTo('accountRead', selectedAccount),
        ).toHaveLength(1);

        await expectBackNavigationToListThenOverview(page);
      });
    }

    for (const failure of nonRedirectingFailures) {
      test(`shows the read failure in the account dashboard for ${failure.description} and goes back to the list`, async ({
        page,
        portalBackend,
      }) => {
        test.info().annotations.push({
          type: 'current behavior',
          description:
            'Only 403 (forbidden message) and 404 redirect to the error page; the detail view shows other read errors in place, without an alert.',
        });
        portalBackend.respondToAccountRead(selectedAccount, failure.mockFile);

        await accountsList.openAccount(selectedAccount);

        await expect(page).toHaveURL(
          AccountDashboardPage.path(selectedAccount),
        );
        await expect(accountDashboard.readState).toHaveAttribute(
          'title-text',
          AccountDashboardPage.readFailedTitle,
        );
        await expect
          .poll(() => portalShell.renderedViews())
          .toEqual([AccountDashboardPage.viewName]);
        await expect(portalShell.alert).toHaveCount(0);

        await expectBackNavigationToListThenOverview(page);
      });
    }
  });

  async function expectOnlyErrorPageShown(
    page: Page,
    errorPageCode: ErrorPageCode,
  ) {
    await expect(page).toHaveURL(ErrorPage.path(errorPageCode));
    await expect(errorPage.title).toHaveText(ErrorPage.titles[errorPageCode]);
    await expect(errorPage.illustration(errorPageCode)).toBeVisible();
    await expect(errorPage.illustrationDrawing(errorPageCode)).toBeVisible();
    await expect
      .poll(() => portalShell.renderedViews())
      .toEqual([ErrorPage.viewName]);
    await expect(
      portalShell.navigationItem(AccountDashboardPage.navigation),
    ).toBeHidden();
    await expect(portalShell.alert).toHaveCount(0);
  }

  async function expectOverviewShown(page: Page) {
    await expect(page).toHaveURL(OverviewPage.path);
    await expect(
      portalShell.navigationItem(OverviewPage.navigation),
    ).toHaveClass(PortalShell.selectedNavigationItemClass);
  }

  async function expectAccountsListShown(page: Page) {
    await expect(page).toHaveURL(AccountsListPage.path);
    await expect(
      portalShell.navigationItem(AccountsListPage.navigation),
    ).toHaveClass(PortalShell.selectedNavigationItemClass);
    await expect(accountsList.accountRow(selectedAccount)).toBeVisible();
    await expect
      .poll(() => portalShell.renderedViews())
      .toEqual([AccountsListPage.viewName]);
  }

  async function expectBackNavigationToListThenOverview(page: Page) {
    await page.goBack();
    await expectAccountsListShown(page);

    await page.goBack();
    await expectOverviewShown(page);
  }
});
