import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]),
  PORT: z.coerce.number().default(3000),

  DATABASE_URL: z.url(),

  VENICE_API_KEY: z.string().min(1),

  TELNYX_APP_ID: z.string().min(1),
  TELNYX_API_KEY: z.string().min(1),
  TELNYX_PUBLIC_KEY: z.string().min(1),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment:", z.treeifyError(parsed.error));
  process.exit(1);
}

const config = parsed.data;

export default config;
