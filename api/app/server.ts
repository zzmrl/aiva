import config from "./config";
import { createApp } from "./factory";
import { sessionStore, stream } from "./modules/twilio";
import * as notifications from "./modules/notifications";
import { hasMcp, getTools } from "./modules/llm/mcp";
import appLogger from "./shared/logger";
import { createServer } from "http";

const logger = appLogger.child({ module: "server" });

const app = createApp();
const server = createServer(app);
const relayWss = stream.createWebSocketServer();
const notificationsWss = notifications.createWebSocketServer();

server.on("upgrade", (request, socket, head) => {
  logger.debug({ url: request.url }, "upgrade request");
  const { pathname } = new URL(request.url ?? "", "wss://base.url");

  if (pathname === "/twilio/relay") {
    relayWss.handleUpgrade(request, socket, head, (ws) => {
      relayWss.emit("connection", ws, request);
    });
  } else if (pathname === "/notifications") {
    notificationsWss.handleUpgrade(request, socket, head, (ws) => {
      notificationsWss.emit("connection", ws, request);
    });
  } else {
    socket.destroy();
  }
});

server.listen(config.PORT, () => {
  logger.info(`Server is listening on port ${config.PORT}`);
  logger.info(`Environment: ${config.NODE_ENV}`);
});

sessionStore.startCleanup();

if (hasMcp()) {
  getTools()
    .then(() => logger.debug("MCP tools pre-loaded"))
    .catch((err) => logger.error({ err }, "Failed to pre-load MCP tools"));
}

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.debug("SIGTERM signal received: closing HTTP server");
  sessionStore.stopCleanup();
  relayWss.close();
  notificationsWss.close();
  server.close(() => {
    logger.debug("Server closed");
    process.exit(0);
  });
});
