import { Router } from "express";
import * as controller from "./controller";

const router = Router();

router.post("/voice", controller.voice);
router.post("/messaging", controller.messaging);

export default router;
