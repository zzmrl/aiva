import createDebug from "debug";
import config from "./config";
import { createApp } from "./factory";

const debug = createDebug("api");

const app = createApp();

const server = app.listen(config.PORT, () => {
  console.info(`Server is listening on port ${config.PORT}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  debug("SIGTERM signal received: closing HTTP server");
  server.close(() => {
    debug("Server closed");
  });
});
