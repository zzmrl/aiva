import { z } from "zod";
import { file } from "bun";

async function resolveSecrets(
  env: NodeJS.ProcessEnv,
): Promise<Record<string, string | undefined>> {
  const resolved: Record<string, string | undefined> = { ...env };

  for (const [key, value] of Object.entries(env)) {
    if (key?.endsWith("_FILE") && value) {
      const baseKey = key.slice(0, -5);
      try {
        resolved[baseKey] = (await file(value).text()).trim();
      } catch {
        // let zod handle
      }
    }
  }

  return resolved;
}

const environment = await resolveSecrets(process.env);

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().default(3274),
  PUBLIC_HOST: z.string().min(1),
  VENICE_API_KEY: z.string().min(1),
  DATABASE_URL: z.url(),
  TWILIO_AUTH_TOKEN: z.string().min(1).optional(),
});

const parsed = envSchema.safeParse(environment);

if (!parsed.success) {
  console.error("Invalid environment:", z.treeifyError(parsed.error));
  process.exit(1);
}

const config = parsed.data;

if (!config.TWILIO_AUTH_TOKEN) {
  console.warn(
    "TWILIO_AUTH_TOKEN is not set — Twilio webhook signature validation is disabled",
  );
}

export type AppConfig = typeof config;

export default config;
