import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3013';
const webServerURL = process.env.PLAYWRIGHT_WEB_SERVER_URL || `${baseURL.replace(/\/$/, '')}/next.svg`;
const devPort = (() => {
  try {
    const url = new URL(baseURL);
    return url.port || '3013';
  } catch {
    return '3013';
  }
})();

/**
 * Playwright configuration for Cognia AI features testing
 * Optimized for CI/CD efficiency
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: process.env.CI 
    ? [['github'], ['html', { open: 'never' }], ['json', { outputFile: 'test-results/results.json' }]]
    : 'html',
  timeout: 30000,
  expect: {
    timeout: 10000,
  },
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 20000,
  },
  projects: [
    {
      name: 'unit-like',
      testMatch: /\/(stores|core)\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'ai',
      testMatch: /\/ai\/.*\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'features',
      testMatch: /\/features\/.*\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'integration',
      testMatch: /\/integration\/.*\.spec\.ts$/,
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['unit-like'],
    },
  ],
  webServer: {
    command: `pnpm exec next dev -H 127.0.0.1 -p ${devPort}`,
    url: webServerURL,
    reuseExistingServer: true,
    timeout: 180 * 1000,
  },
});
