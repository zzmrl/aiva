import { Router } from "express";
import { validate } from "../../shared/middleware";
import * as controller from "./controller";
import { messagingSchema, voiceSchema } from "./validation";

const router = Router();

router.post("/voice", validate(voiceSchema), controller.voice);
router.post("/messaging", validate(messagingSchema), controller.messaging);

export default router;
