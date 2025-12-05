import { defineConfig } from '@playwright/test';

export default defineConfig({
  webServer: {
    command: 'bun run build && bun run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
  },
  testDir: 'tests',
  use: {
    baseURL: 'http://localhost:4173',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  retries: process.env.CI ? 2 : 0,
  timeout: 30000,
  expect: {
    timeout: 5000,
  },
});
