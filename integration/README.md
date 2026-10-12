# Integration tests

Playwright tests that run the portal built from this repository against a mocked backend. Setup, mocks and conventions are described in [AGENTS.md](AGENTS.md).

## Explore the portal with the mocks

The mocks exist only inside a Playwright test (the `portalBackend` fixture installs them on the test's page), so opening `http://localhost:4400` in your own browser gives a portal without a backend. To click through the real portal with the mocks active, run a spec in debug mode:

```bash
npx playwright test --config integration/playwright.config.ts integration/tests/platform-mesh/httpbin-navigation.spec.ts --debug
```

This opens a visible Chromium window and the Playwright Inspector, paused before the first step. While the test is paused the page is live, and every request covered by the mocks is answered.

- Step through the test or resume it from the Inspector. To stay at a specific point, add a temporary `await page.pause()` to the test and remove it afterwards.
- Requests the mocks do not cover are answered with `501`.
- Http Bins are listed only for `account-gamma`, because this spec enables them for that account.
- The portal is served from a build of the current sources. Stop a stale server first (`pkill -f serve-portal.ts`), and run `npm run build:wc` after changing `projects/wc`.

## Debug a single test

Every test can be run on its own in debug mode. The `-g` pattern is the test's innermost `describe` title followed by the test title, which selects exactly that test. `file:line` would not: tests generated in a loop share one source line.

### account-navigation.spec.ts

- account navigation from the accounts list › opens the account dashboard when account info and account are read

  ```bash
  npx playwright test --config integration/playwright.config.ts integration/tests/platform-mesh/account-navigation.spec.ts -g 'account navigation from the accounts list opens the account dashboard when account info and account are read' --debug
  ```

- when reading the account info fails › renders only the 404 error page for HTTP 404 Not Found and goes back to the list

  ```bash
  npx playwright test --config integration/playwright.config.ts integration/tests/platform-mesh/account-navigation.spec.ts -g 'when reading the account info fails renders only the 404 error page for HTTP 404 Not Found and goes back to the list' --debug
  ```

- when reading the account info fails › renders only the 403 error page for a GraphQL "forbidden" error and goes back to the list

  ```bash
  npx playwright test --config integration/playwright.config.ts integration/tests/platform-mesh/account-navigation.spec.ts -g 'when reading the account info fails renders only the 403 error page for a GraphQL "forbidden" error and goes back to the list' --debug
  ```

- when reading the account info fails › alerts and keeps the account dashboard for HTTP 403 Forbidden and goes back to the list

  ```bash
  npx playwright test --config integration/playwright.config.ts integration/tests/platform-mesh/account-navigation.spec.ts -g 'when reading the account info fails alerts and keeps the account dashboard for HTTP 403 Forbidden and goes back to the list' --debug
  ```

- when reading the account info fails › alerts and keeps the account dashboard for HTTP 500 Internal Server Error and goes back to the list

  ```bash
  npx playwright test --config integration/playwright.config.ts integration/tests/platform-mesh/account-navigation.spec.ts -g 'when reading the account info fails alerts and keeps the account dashboard for HTTP 500 Internal Server Error and goes back to the list' --debug
  ```

- when reading the account info fails › alerts and keeps the account dashboard for any other GraphQL error and goes back to the list

  ```bash
  npx playwright test --config integration/playwright.config.ts integration/tests/platform-mesh/account-navigation.spec.ts -g 'when reading the account info fails alerts and keeps the account dashboard for any other GraphQL error and goes back to the list' --debug
  ```

- when the account info is read but reading the account fails › renders only the 404 error page for HTTP 404 Not Found and goes back to the list

  ```bash
  npx playwright test --config integration/playwright.config.ts integration/tests/platform-mesh/account-navigation.spec.ts -g 'when the account info is read but reading the account fails renders only the 404 error page for HTTP 404 Not Found and goes back to the list' --debug
  ```

- when the account info is read but reading the account fails › renders only the 403 error page for a GraphQL "forbidden" error and goes back to the list

  ```bash
  npx playwright test --config integration/playwright.config.ts integration/tests/platform-mesh/account-navigation.spec.ts -g 'when the account info is read but reading the account fails renders only the 403 error page for a GraphQL "forbidden" error and goes back to the list' --debug
  ```

- when the account info is read but reading the account fails › shows the read failure in the account dashboard for HTTP 403 Forbidden and goes back to the list

  ```bash
  npx playwright test --config integration/playwright.config.ts integration/tests/platform-mesh/account-navigation.spec.ts -g 'when the account info is read but reading the account fails shows the read failure in the account dashboard for HTTP 403 Forbidden and goes back to the list' --debug
  ```

- when the account info is read but reading the account fails › shows the read failure in the account dashboard for HTTP 500 Internal Server Error and goes back to the list

  ```bash
  npx playwright test --config integration/playwright.config.ts integration/tests/platform-mesh/account-navigation.spec.ts -g 'when the account info is read but reading the account fails shows the read failure in the account dashboard for HTTP 500 Internal Server Error and goes back to the list' --debug
  ```

- when the account info is read but reading the account fails › shows the read failure in the account dashboard for any other GraphQL error and goes back to the list

  ```bash
  npx playwright test --config integration/playwright.config.ts integration/tests/platform-mesh/account-navigation.spec.ts -g 'when the account info is read but reading the account fails shows the read failure in the account dashboard for any other GraphQL error and goes back to the list' --debug
  ```

### httpbin-navigation.spec.ts

- httpbin navigation within an account › keeps the namespace of the opened httpbin in the URL of every httpbin node

  ```bash
  npx playwright test --config integration/playwright.config.ts integration/tests/platform-mesh/httpbin-navigation.spec.ts -g 'httpbin navigation within an account keeps the namespace of the opened httpbin in the URL of every httpbin node' --debug
  ```

- httpbin navigation within an account › removes the namespace from the URL when navigating via the breadcrumbs out of the httpbin

  ```bash
  npx playwright test --config integration/playwright.config.ts integration/tests/platform-mesh/httpbin-navigation.spec.ts -g 'httpbin navigation within an account removes the namespace from the URL when navigating via the breadcrumbs out of the httpbin' --debug
  ```

- httpbin deep link without a namespace › opens every httpbin node without a namespace and shows that the httpbin could not be read

  ```bash
  npx playwright test --config integration/playwright.config.ts integration/tests/platform-mesh/httpbin-navigation.spec.ts -g 'httpbin deep link without a namespace opens every httpbin node without a namespace and shows that the httpbin could not be read' --debug
  ```
