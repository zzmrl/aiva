import { PgBoss } from "pg-boss";
import config from "../../config";
import appLogger from "../logger";

const logger = appLogger.child({ module: "queue" });

const boss = new PgBoss(config.DATABASE_URL);

boss.on("error", (err) => {
  logger.error({ err }, "pg-boss error");
});

export default boss;
