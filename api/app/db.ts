import pgPromise from "pg-promise";
import fs from "fs/promises";

const pgp = pgPromise();

async function readSecret(filePath: string): Promise<string> {
  try {
    const text = await fs.readFile(filePath, "utf8");
    return text.trim();
  } catch (_error) {
    throw new Error(`Failed to read secret file: ${filePath}`);
  }
}

const dbPasswordFile = process.env.DATABASE_PASSWORD_FILE;
if (!dbPasswordFile) {
  throw new Error(
    "Missing required environment variable: DATABASE_PASSWORD_FILE",
  );
}
const dbUserFile = process.env.DATABASE_USER_FILE;
if (!dbUserFile) {
  throw new Error("Missing required environment variable: DATABASE_USER_FILE");
}
const dbNameFile = process.env.DATABASE_NAME_FILE;
if (!dbNameFile) {
  throw new Error("Missing required environment variable: DATABASE_NAME_FILE");
}
const dbHost = process.env.DATABASE_HOST;
if (!dbHost) {
  throw new Error("Missing required environment variable: DATABASE_HOST");
}
const dbPort = process.env.DATABASE_PORT;
if (!dbPort) {
  throw new Error("Missing required environment variable: DATABASE_PORT");
}

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
