import createDebug from "debug";
import config from "./config";
import { createApp } from "./factory";
import { sessionStore, stream } from "./modules/twilio";

const debug = createDebug("api");

const app = createApp();

const server = app.listen(config.PORT, () => {
  console.info(`Server is listening on port ${config.PORT}`);
  console.info(`Environment: ${config.NODE_ENV}`);
});

stream.attachWebSocket(server);
sessionStore.startCleanup();

// Graceful shutdown
process.on("SIGTERM", () => {
  debug("SIGTERM signal received: closing HTTP server");
  sessionStore.stopCleanup();
  server.close(() => {
    debug("Server closed");
  });
});
