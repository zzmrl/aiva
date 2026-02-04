import { Router } from "express";
import { validate } from "../../shared/middleware";
import * as controller from "./controller";
import { smsWebhookSchema, transcriptionSchema } from "./validation";

const router = Router();

router.post("/voice", controller.voice);
router.post(
  "/transcription-events",
  validate(transcriptionSchema),
  controller.transcriptionEvents,
);
router.post("/sms", validate(smsWebhookSchema), controller.sms);

export default router;
