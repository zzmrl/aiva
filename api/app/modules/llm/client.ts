import OpenAI from "openai";
import { config } from "aiva-api/app";

const client = new OpenAI({
  apiKey: config.VENICE_API_KEY,
  baseURL: "https://api.venice.ai/api/v1",
});

export default client;
