import { SQL } from "bun";
import { config } from "aiva-api/app";

const sql = new SQL({
  url: config.DATABASE_URL,
});

export default sql;
