import pino from "pino";

const level = process.env.LOG_LEVEL ?? "info";

const destination =
  process.env.NODE_ENV === "development"
    ? (await import("pino-pretty")).default({
        colorize: true,
        ignore: "module,hostname",
        messageFormat: (log, messageKey, _levelLabel, { colors }) => {
          const module = log.module
            ? colors.whiteBright(`[${log.module}]`) + " "
            : "";
          return `${module}${log[messageKey]}`;
        },
      })
    : undefined;

export default pino({ level }, destination);
