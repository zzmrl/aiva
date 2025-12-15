import createDebug from "debug";
import { createApp } from "./app";

const debug = createDebug("api");

const app = createApp();
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.info(`Server is listening on port ${PORT}`);
});

/**
 * Gracefully shutdown server
 */
process.on("SIGTERM", () => {
  debug("SIGTERM signal received: closing HTTP server");
  server.close(() => {
    debug("Server closed");
  });
});
