import { defineConfig } from '@playwright/test';
const fixtureEnv = {
  NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54329',
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'test-publishable-key',
  NODE_OPTIONS: '--import ./tests/e2e/github-fetch-fixture.mjs',
};
export default defineConfig({
  testDir: './tests/e2e',
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://localhost:3100', headless: true, trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: [
    { command: 'node tests/e2e/supabase-stub.mjs', url: 'http://localhost:54329/health', reuseExistingServer: false },
    { command: process.env.FIRSTPR_E2E_PRODUCTION
        ? 'npm run build && npm run start -- --hostname localhost --port 3100'
        : 'npm run dev -- --hostname localhost --port 3100',
      url: 'http://localhost:3100', timeout: 180000, reuseExistingServer: false, env: fixtureEnv },
  ],
});
