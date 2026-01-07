import { SQL } from "bun";
import { readFile } from "./utils";

/**
 * Get value of environment variable or throw an error if empty or unset
 * @param envVarName - Name of the environment variable
 * @returns value of the environment variable
 */
export function getEnvOrThrow(envVarName: string): string {
  const value = process.env[envVarName];
  if (!value) {
    throw new Error(`Missing required environment variable: ${envVarName}`);
  }
  return value;
}

const dbPasswordFile = getEnvOrThrow("DATABASE_PASSWORD_FILE");
const dbUserFile = getEnvOrThrow("DATABASE_USER_FILE");
const dbNameFile = getEnvOrThrow("DATABASE_NAME_FILE");
const dbHost = process.env.DATABASE_HOST || "localhost";
const dbPort = process.env.DATABASE_PORT || 5432;

const dbPassword = await readFile(dbPasswordFile);
const dbUser = await readFile(dbUserFile);
const dbName = await readFile(dbNameFile);

export const sql = new SQL({
  host: dbHost,
  port: dbPort,
  database: dbName,
  user: dbUser,
  password: dbPassword,
});
