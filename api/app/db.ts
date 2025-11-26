import pgpromise from "pg-promise";

const pgp = pgpromise();

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is not set");
}

const db = pgp(databaseUrl);

export default db;
