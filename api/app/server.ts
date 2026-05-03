import config from "./config";
import { createApp } from "./factory";
import { sessionStore, stream } from "./modules/twilio";
import * as smsWorker from "./modules/twilio/smsWorker";
import { hasMcp, getTools } from "./modules/llm/mcp";
import appLogger from "./shared/logger";

const logger = appLogger.child({ module: "server" });

const app = createApp();

await smsWorker.start();

const server = app.listen(config.PORT, () => {
  logger.info(`Server is listening on port ${config.PORT}`);
  logger.info(`Environment: ${config.NODE_ENV}`);
});

const wss = stream.attachWebSocket(server);
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
  wss.close();
  server.close(() => {
    logger.debug("Server closed");
    smsWorker.stop().finally(() => process.exit(0));
  });
});
