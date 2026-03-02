import { webhook } from "twilio";
import config from "../../config";

export const validateTwilioRequest = webhook({
  authToken: config.TWILIO_AUTH_TOKEN,
  validate: !!config.TWILIO_AUTH_TOKEN,
  host: config.PUBLIC_HOST,
  protocol: "https",
  includeHelpers: false,
});
