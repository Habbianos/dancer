import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60000,
  use: { baseURL: process.env.TEST_URL ?? 'http://127.0.0.1:4321/', viewport: { width: 1300, height: 850 }, launchOptions: process.platform === 'win32' ? { channel: 'msedge' } : {} },
});
