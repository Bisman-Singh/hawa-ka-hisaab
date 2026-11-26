// End to end config. Specs in e2e run against the production build on the preview server, API included.
import { defineConfig, devices } from '@playwright/test';

const ci = Boolean(process.env['CI']);

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  forbidOnly: ci,
  retries: 0,
  reporter: 'list',
  use: { baseURL: 'http://localhost:4173', trace: 'retain-on-failure' },
  projects: [
    { name: 'phone', use: { ...devices['Pixel 7'] } },
    { name: 'laptop', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173/api/health',
    reuseExistingServer: !ci,
    timeout: 120_000,
  },
});
