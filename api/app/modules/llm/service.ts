import type { ChatCompletionMessageParam } from "openai/resources";
import client from "./client";

const DEFAULT_SETTINGS = {
  model: "venice-uncensored",
  venice_parameters: {
    enable_web_search: "auto",
  },
} as const;
const SYSTEM_MESSAGE = {
  role: "system",
  content: "You are a helpful assistant. Try to be concise.",
} as const;

export type CompletionMessage = ChatCompletionMessageParam;

export async function createCompletion(
  messages: CompletionMessage[],
): Promise<string> {
  const response = await client.chat.completions.create({
    ...DEFAULT_SETTINGS,
    messages: [SYSTEM_MESSAGE, ...messages],
  });
  return response.choices[0]?.message.content || "";
}

export async function* streamCompletion(messages: CompletionMessage[]) {
  const stream = await client.chat.completions.create({
    ...DEFAULT_SETTINGS,
    messages: [SYSTEM_MESSAGE, ...messages],
    stream: true,
  });
  for await (const chunk of stream) {
    yield chunk.choices[0]?.delta.content || "";
  }
}
