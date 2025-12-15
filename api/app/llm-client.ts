import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.VENICE_API_KEY,
  baseURL: "https://api.venice/ai/api/v1",
});

export default client;
