import OpenAI from "openai";
import { readFile } from "../utils";

async function fileEnv(varName: string): Promise<string> {
  const value = process.env[varName];
  const filePath = process.env[`${varName}_FILE`];
  if (value && filePath) {
    throw new Error(
      `Both ${varName} and ${varName}_FILE are set (but are exclusive)`,
    );
  }
  if (value) {
    return value;
  } else if (filePath) {
    return readFile(filePath);
  }
  throw new Error(
    `Missing required environment variables: ${varName} or ${varName}_FILE`,
  );
}

const apiKey = await fileEnv("VENICE_API_KEY");

const client = new OpenAI({
  apiKey,
  baseURL: "https://api.venice.ai/api/v1",
});

export default client;
