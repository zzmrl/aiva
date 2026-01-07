import OpenAI from "openai";
import { fileEnv } from "../utils";

const apiKey = await fileEnv("VENICE_API_KEY");

const client = new OpenAI({
  apiKey,
  baseURL: "https://api.venice.ai/api/v1",
});

export default client;
