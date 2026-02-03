import { Router } from "express";
import { validate } from "../../shared/middleware";
import * as controller from "./controller";
import {
  listMessagesSchema,
  messageIdSchema,
  createMessageSchema,
} from "./validation";

const router = Router();

router.get("/", validate(listMessagesSchema), controller.list);
router.get("/conversations", controller.listConversations);
router.get("/:id", validate(messageIdSchema), controller.getById);
router.post("/", validate(createMessageSchema), controller.create);

export default router;
