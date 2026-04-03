import { WebSocketServer } from "ws";
import type { WebSocket } from "ws";
import appLogger from "../../shared/logger";
import type { Message } from "../message/model";

const logger = appLogger.child({ module: "notifications" });

const clients = new Set<WebSocket>();

export type NewMessageEvent = {
  type: "new_message";
  message: Message;
};

export function broadcast(event: NewMessageEvent): void {
  logger.debug({ type: event.type }, "broadcasting");
  if (clients.size === 0) return;
  const data = JSON.stringify(event);
  for (const client of clients) {
    if (client.readyState === client.OPEN) {
      logger.debug("open and ready");
      client.send(data);
    }
  }
}

export function createWebSocketServer(): WebSocketServer {
  const wss = new WebSocketServer({ noServer: true });

  wss.on("connection", (ws) => {
    logger.debug("Client connected");
    clients.add(ws);

    ws.on("close", () => {
      clients.delete(ws);
      logger.debug("Client disconnected");
    });

    ws.on("error", (err) => {
      logger.error({ err }, "WebSocket error");
      clients.delete(ws);
    });
  });

  return wss;
}
