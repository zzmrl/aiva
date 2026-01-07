import { SQL } from "bun";
import { fileEnv } from "./utils";

const [dbPassword, dbUser, dbName] = await Promise.all([
  fileEnv("DATABASE_PASSWORD"),
  fileEnv("DATABASE_USER"),
  fileEnv("DATABASE_NAME"),
]);
const dbHost = process.env.DATABASE_HOST || "localhost";
const dbPort = process.env.DATABASE_PORT || 5432;

export const sql = new SQL({
  host: dbHost,
  port: dbPort,
  database: dbName,
  user: dbUser,
  password: dbPassword,
});
