import type { RequestHandler } from "express";
import { validateRequest } from "twilio";
import config from "../../config";

export const validateTwilioRequest: RequestHandler = (req, res, next) => {
  if (!config.TWILIO_AUTH_TOKEN) {
    return next();
  }

  const signature = req.headers["x-twilio-signature"] as string | undefined;
  if (!signature) {
    res.status(403).json({ error: "Missing Twilio signature" });
    return;
  }

  const url = `https://${config.PUBLIC_HOST}${req.originalUrl}`;
  const isValid = validateRequest(
    config.TWILIO_AUTH_TOKEN,
    signature,
    url,
    req.body,
  );

  if (!isValid) {
    res.status(403).json({ error: "Invalid Twilio signature" });
    return;
  }

  next();
};
