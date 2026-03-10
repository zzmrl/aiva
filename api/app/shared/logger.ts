import pino from "pino";
import type { PrettyOptions } from "pino-pretty";

const level = process.env.LOG_LEVEL ?? "info";

const transport: pino.LoggerOptions =
  process.env.NODE_ENV === "development"
    ? {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            ignore: "module,hostname",
            messageFormat: "{if module}<{module}> {end}{msg}",
            singleLine: true,
          } satisfies PrettyOptions,
        },
      }
    : {};

export default pino({ ...transport, level });
