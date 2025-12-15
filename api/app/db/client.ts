import { SQL, file } from "bun";

async function readSecret(filePath: string): Promise<string> {
  try {
    const text = await file(filePath).text();
    return text.trim();
  } catch (_error) {
    throw new Error(`Failed to read secret file: ${filePath}`);
  }
}

function getEnvOrThrow(envVarName: string): string {
  const value = process.env[envVarName];
  if (!value) {
    throw new Error(`Missing required environment variable: ${envVarName}`);
  }
  return value;
}

const dbPasswordFile = getEnvOrThrow("DATABASE_PASSWORD_FILE");
const dbUserFile = getEnvOrThrow("DATABASE_USER_FILE");
const dbNameFile = getEnvOrThrow("DATABASE_NAME_FILE");
const dbHost = getEnvOrThrow("DATABASE_HOST");
const dbPort = getEnvOrThrow("DATABASE_PORT");

const dbPassword = await readSecret(dbPasswordFile);
const dbUser = await readSecret(dbUserFile);
const dbName = await readSecret(dbNameFile);

export const pg = new SQL({
  host: dbHost,
  port: dbPort,
  database: dbName,
  user: dbUser,
  password: dbPassword,
});
