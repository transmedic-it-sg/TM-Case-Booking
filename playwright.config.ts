import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e/tests',
  timeout: 60000,
  expect: {
    timeout: 15000
  },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: 1,
  reporter: [
    ['html'],
    ['json', { outputFile: './test-results/results.json' }],
    ['junit', { outputFile: './test-results/results.xml' }]
  ],
  use: {
    baseURL: 'http://localhost:3002',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 10000,
    navigationTimeout: 30000
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'DISABLE_ESLINT_PLUGIN=true PORT=3002 npm start',
    port: 3002,
    reuseExistingServer: !process.env.CI,
    timeout: 120000
  },
  outputDir: './test-results/'
});