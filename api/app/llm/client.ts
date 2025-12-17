import OpenAI from "openai";

const API_KEY = process.env.VENICE_API_KEY;

if (!API_KEY) {
  throw new Error(`Missing required environment variable: VENICE_API_KEY`);
}

const client = new OpenAI({
  apiKey: API_KEY,
  baseURL: "https://api.venice.ai/api/v1",
});

export default client;
