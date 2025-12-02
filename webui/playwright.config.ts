import { defineConfig } from '@playwright/test';

export default defineConfig({
  webServer: {
    command: 'bun build && bun preview',
    port: 4173,
  },
  testDir: 'e2e',
});
