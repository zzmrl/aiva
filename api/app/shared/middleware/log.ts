import pinoHttp from "pino-http";
import logger from "../logger";

export default function log() {
  const options =
    process.env.NODE_ENV === "development"
      ? {
          transport: {
            target: "pino-pretty",
            options: {
              colorize: true,
            },
          },
        }
      : {};
  return pinoHttp({ ...options, logger });
}
