import { Router } from "express";
import { validate } from "../../shared/middleware";
import * as controller from "./controller";
import { validateTwilioRequest } from "./middleware";
import { smsWebhookSchema, transcriptionSchema } from "./validation";

const router = Router();

router.post("/voice", validateTwilioRequest, controller.voice);
router.post(
  "/transcription-events",
  validateTwilioRequest,
  validate(transcriptionSchema),
  controller.transcriptionEvents,
);
router.post("/sms", validateTwilioRequest, validate(smsWebhookSchema), controller.sms);

export default router;
