import tailwindcss from '@tailwindcss/vite';
import { defineConfig, type Plugin } from 'vitest/config';
import { playwright } from '@vitest/browser-playwright';
import { sveltekit } from '@sveltejs/kit/vite';
import { WebSocketServer } from 'ws';
import type { Duplex } from 'stream';

type PatchSocket = Duplex & { destroySoon?: () => void };

const apiHost = process.env.API_HOST ?? 'localhost';
const API_PORT = 3274;

// WebSocket-to-WebSocket proxy. Raw socket writes don't reach the browser
// under Bun, but the `ws` library's handleUpgrade works (proven by Vite HMR).
const wsProxy = (): Plugin => ({
  name: 'ws-proxy',
  configureServer(server) {
    const wss = new WebSocketServer({ noServer: true });

    // Bun only lets the first upgrade listener's handleUpgrade succeed.
    // Prepend ours before Vite's HMR handler so our handleUpgrade
    // actually delivers the 101 to the browser.
    const httpServer = server.httpServer;
    if (httpServer) {
      const existing = httpServer.listeners('upgrade');
      httpServer.removeAllListeners('upgrade');
      httpServer.on('upgrade', handler);
      for (const l of existing) {
        httpServer.on('upgrade', l as (...args: unknown[]) => void);
      }
    }

    function handler(req: import('http').IncomingMessage, socket: PatchSocket, head: Buffer) {
      if (!socket.destroySoon) {
        socket.destroySoon = socket.destroy.bind(socket);
      }

      const url = req.url ?? '';
      if (!url.startsWith('/notifications') && !url.startsWith('/twilio')) {
        return;
      }
      console.log('[ws-proxy] handleUpgrade', url);

      wss.handleUpgrade(req, socket, head, (clientWs) => {
        console.log('[ws-proxy] client accepted, connecting to API');
        // Use Bun's native WebSocket — the ws library's client uses
        // http.request internally which can't handle 101 under Bun.
        const apiWs = new globalThis.WebSocket(`ws://${apiHost}:${API_PORT}${url}`);

        apiWs.onopen = () => {
          console.log('[ws-proxy] API connected');
          clientWs.on('message', (data, isBinary) => {
            if (apiWs.readyState === globalThis.WebSocket.OPEN) {
              apiWs.send(isBinary ? (data as Buffer) : data.toString());
            }
          });
          apiWs.onmessage = (e) => {
            if (clientWs.readyState === clientWs.OPEN) {
              clientWs.send(e.data);
            }
          };
        };

        apiWs.onclose = () => {
          console.log('[ws-proxy] API closed');
          clientWs.close();
        };
        clientWs.on('close', () => {
          console.log('[ws-proxy] client closed');
          apiWs.close();
        });
        apiWs.onerror = () => {
          console.log('[ws-proxy] API error');
          clientWs.close();
        };
        clientWs.on('error', (e) => {
          console.log('[ws-proxy] client error:', e.message);
          apiWs.close();
        });
      });
    }
  },
});

export default defineConfig({
  plugins: [wsProxy(), tailwindcss(), sveltekit()],
  server: {
    allowedHosts: ['localhost', '127.0.0.1', process.env.PUBLIC_HOST].filter(
      (h) => h !== undefined,
    ),
    proxy: {
      '/messages': `http://${apiHost}:${API_PORT}`,
      '/health': `http://${apiHost}:${API_PORT}`,
      '/twilio': `http://${apiHost}:${API_PORT}`,
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
