import { z } from "zod";
import appLogger from "./shared/logger";

const logger = appLogger.child({ module: "config" });

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(3274),
  PUBLIC_HOST: z.string().min(1),
  VENICE_API_KEY: z.string().min(1),
  DATABASE_URL: z.url(),
  TWILIO_AUTH_TOKEN: z.string().min(1).optional(),
  TWILIO_ACCOUNT_SID: z.string().min(1).optional(),
  AUTOMATE_IT_API_KEY: z.string().min(1).optional(),
});

const environment = process.env;
const parsed = envSchema.safeParse(environment);

if (!parsed.success) {
  logger.error(z.treeifyError(parsed.error), "Invalid environment");
  process.exit(1);
}

const config = parsed.data;

logger.debug("Config loaded");

if (!config.TWILIO_AUTH_TOKEN) {
  logger.warn(
    "TWILIO_AUTH_TOKEN is not set — Twilio webhook signature validation is disabled",
  );
}

export type AppConfig = typeof config;

export default config;
