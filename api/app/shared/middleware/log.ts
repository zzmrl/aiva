import pinoHttp from "pino-http";
import logger from "../logger";

export default function log() {
  return pinoHttp({ logger });
}
