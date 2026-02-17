import { SQL } from "bun";
import config from "../../config";

const sql = new SQL({
  url: config.DATABASE_URL,
});

export default sql;
