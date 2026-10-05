import { portalSetups } from './portals/portal-setups.ts';
import { defineConfig, devices } from '@playwright/test';

const isCi = !!process.env['CI'];
const isVideoRecorded = process.env['PLAYWRIGHT_VIDEO'] === 'on';

export default defineConfig({
  outputDir: 'test-results',
  fullyParallel: true,
  forbidOnly: isCi,
  retries: isCi ? 1 : 0,
  reporter: isCi
    ? [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]]
    : [['list']],
  use: {
    ...devices['Desktop Chrome'],
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: isVideoRecorded ? 'on' : 'off',
  },
  projects: portalSetups.map((setup) => ({
    name: setup.name,
    testDir: setup.testDir,
    use: { baseURL: `http://localhost:${setup.port}` },
  })),
  webServer: portalSetups.map((setup) => ({
    command: `npx ng build ${setup.angularProject} && node server/serve-portal.ts ${setup.name}`,
    url: `http://localhost:${setup.port}`,
    reuseExistingServer: !isCi,
    timeout: 180_000,
    stdout: 'pipe',
  })),
});
