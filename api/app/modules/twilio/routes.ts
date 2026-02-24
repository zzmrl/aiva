import { Router } from "express";
import { validate } from "../../shared/middleware";
import * as controller from "./controller";
import { validateTwilioRequest } from "./middleware";
import { smsWebhookSchema, voiceWebhookSchema } from "./validation";

const router = Router();

router.post(
  "/voice",
  validateTwilioRequest,
  validate(voiceWebhookSchema),
  controller.voice,
);
router.post(
  "/sms",
  validateTwilioRequest,
  validate(smsWebhookSchema),
  controller.sms,
);

export default router;
