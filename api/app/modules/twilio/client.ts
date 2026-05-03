import twilio from "twilio";
import config from "../../config";
import appLogger from "../../shared/logger";

const logger = appLogger.child({ module: "twilio:client" });

if (!config.TWILIO_ACCOUNT_SID || !config.TWILIO_AUTH_TOKEN) {
  logger.warn(
    "TWILIO_ACCOUNT_SID or TWILIO_AUTH_TOKEN not set - some features like outbound SMS will be inavailable",
  );
}

export default config.TWILIO_ACCOUNT_SID && config.TWILIO_AUTH_TOKEN
  ? twilio(config.TWILIO_ACCOUNT_SID, config.TWILIO_AUTH_TOKEN)
  : null;
