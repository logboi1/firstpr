import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  workers: 1,
  use: { baseURL: 'http://localhost:3100', headless: true },
  webServer: [
    { command: 'node tests/e2e/supabase-stub.mjs', url: 'http://localhost:54329/health', reuseExistingServer: false },
    { command: 'npm run dev -- --hostname localhost --port 3100', url: 'http://localhost:3100', reuseExistingServer: false,
      env: { NEXT_PUBLIC_SUPABASE_URL: 'http://localhost:54329', NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: 'test-publishable-key' } },
  ],
});
