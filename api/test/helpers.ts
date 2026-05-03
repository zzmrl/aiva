import type { WebSocket } from "ws";

export function makeMockWs(): WebSocket {
  return {
    send: () => {},
    on: () => {},
    close: () => {},
  } as unknown as WebSocket;
}
