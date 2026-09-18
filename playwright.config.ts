import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  expect: {
    // Canvas snapshots vary by a handful of anti-aliased pixels across
    // Chromium builds/OS font rendering even with no visual change —
    // this keeps the check meaningful without being flaky.
    toHaveScreenshot: { maxDiffPixelRatio: 0.02 },
  },
  use: {
    baseURL: 'http://127.0.0.1:5175',
    trace: 'retain-on-failure',
  },
  webServer: {
    // Bind explicitly to the IPv4 loopback address: Vite's default "localhost"
    // host can resolve to the IPv6 loopback first depending on the runner's
    // DNS order, which the IPv4-literal `url` below would then never reach.
    command: 'npx vite --config e2e/vite.config.ts --port 5175 --strictPort --host 127.0.0.1',
    url: 'http://127.0.0.1:5175',
    reuseExistingServer: !process.env.CI,
    stdout: 'pipe',
    stderr: 'pipe',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
