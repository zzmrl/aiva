import createDebug from "debug";
import config from "./config";
import { createApp } from "./factory";
import { sessions, stream } from "./modules/twilio";

const debug = createDebug("api");

const app = createApp();

const server = app.listen(config.PORT, () => {
  console.info(`Server is listening on port ${config.PORT}`);
});

stream.attachWebSocket(server);
sessions.startCleanup();

// Graceful shutdown
process.on("SIGTERM", () => {
  debug("SIGTERM signal received: closing HTTP server");
  sessions.stopCleanup();
  server.close(() => {
    debug("Server closed");
  });
});
