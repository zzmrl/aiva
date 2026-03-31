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
router.post("/", validate(createMessageSchema), controller.create);
router.get("/system-phones", controller.listSystemPhones);
router.get(
  "/conversations",
  validate(listMessagesSchema),
  controller.listConversations,
);
router.get("/:id", validate(messageIdSchema), controller.getById);

export default router;
