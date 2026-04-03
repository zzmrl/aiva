import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { sveltekit } from '@sveltejs/kit/vite';
import type { Duplex } from 'stream';

type PatchSocket = Duplex & { destroySoon?: () => void };
// Bun is missing `destroySoon` on its NodeHTTPServerSocket (oven-sh/bun#24127).
// Vite's WS proxy upgrade handler calls it during cleanup — patch it onto the
// socket before Vite's handler runs so it doesn't throw.
const patchDestroySoon = (): Plugin => ({
  name: 'patch-destroy-soon',
  configureServer(server) {
    server.httpServer?.on('upgrade', (_, socket: PatchSocket) => {
      if (!socket.destroySoon) {
        socket.destroySoon = socket.destroy.bind(socket);
      }
    });
  },
});

const apiHost = process.env.API_HOST ?? 'localhost';
const API_PORT = '3274';

export default defineConfig({
  plugins: [patchDestroySoon(), tailwindcss(), sveltekit()],
  server: {
    allowedHosts: ['localhost', '127.0.0.1', process.env.PUBLIC_HOST].filter(
      (h) => h !== undefined,
    ),
    proxy: {
      '/messages': `http://${apiHost}:${API_PORT}`,
      '/health': `http://${apiHost}:${API_PORT}`,
      '/twilio': {
        target: `http://${apiHost}:${API_PORT}`,
        ws: true,
      },
      '/notifications': {
        target: `http://${apiHost}:${API_PORT}`,
        ws: true,
      },
    },
  },
  test: {
    expect: { requireAssertions: true },
    projects: [
      {
        extends: './vite.config.ts',
        test: {
          name: 'client',
          browser: {
            enabled: true,
            provider: playwright(),
            instances: [{ browser: 'chromium', headless: true }],
          },
          include: ['src/**/*.svelte.{test,spec}.{js,ts}'],
          exclude: ['src/lib/server/**'],
        },
      },
      {
        extends: './vite.config.ts',
        test: {
          name: 'server',
          environment: 'node',
          include: ['src/**/*.{test,spec}.{js,ts}'],
          exclude: ['src/**/*.svelte.{test,spec}.{js,ts}'],
        },
      },
    ],
  },
});
