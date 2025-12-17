import OpenAI from "openai";
import { loadEnv } from "../utils";

const apiKey = await loadEnv("VENICE_API_KEY");

const client = new OpenAI({
  apiKey,
  baseURL: "https://api.venice.ai/api/v1",
});

export default client;
