import pgPromise from "pg-promise";
import fs from "fs/promises";

export const pgp = pgPromise();

async function readSecret(filePath: string): Promise<string> {
  try {
    const text = await fs.readFile(filePath, "utf8");
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

const db = pgp({
  host: dbHost,
  port: parseInt(dbPort),
  database: dbName,
  user: dbUser,
  password: dbPassword,
});

export default db;
