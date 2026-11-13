import { defineConfig, devices } from '@playwright/test';

// ─────────────────────────────────────────────────────────────────────────────
// Dev-only Playwright harness (visual-regression + accessibility).
//
// This is TOOLING, not app code. It is expected to be removed at the end of the
// visual redesign. It never imports from `src/` and never mutates app behaviour.
//
// Port 8000 is deliberate: the dockerized Medusa API allows CORS from
// http://localhost:8000 (STORE_CORS), so the storefront's API calls succeed
// when the API is up on :9000. The kitchen-sink surface renders regardless of
// API availability (it's data-less), so the visual spec passes either way.
//
// We run the app in Vite DEV mode (not `preview`) because the `/_kitchen-sink`
// route is guarded by `import.meta.env.DEV` and only exists in dev.
// ─────────────────────────────────────────────────────────────────────────────

const PORT = 8000;
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './e2e',
  testMatch: '**/*.spec.ts',

  // Baselines live next to the specs, organised by project + platform so a
  // Linux CI run and a local macOS run don't clobber each other.
  snapshotPathTemplate: 'e2e/__screenshots__/{testFilePath}/{arg}-{projectName}-{platform}{ext}',

  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },

  expect: {
    toHaveScreenshot: {
      // Tolerate sub-pixel AA / font-rendering jitter without hiding real
      // layout regressions.
      maxDiffPixelRatio: 0.02,
      animations: 'disabled',
    },
  },

  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1024 } },
    },
    {
      name: 'tablet',
      use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 } },
    },
    {
      name: 'mobile',
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 } },
    },
  ],

  webServer: {
    command: `pnpm exec vite --port ${PORT} --strictPort`,
    url: BASE_URL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
