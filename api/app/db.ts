import { SQL } from "bun";
import { getEnvOrThrow, readFile } from "./utils";

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
