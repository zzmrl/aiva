import type { ChatCompletionMessageParam } from "openai/resources";
import client from "./client";

export type CompletionMessage = ChatCompletionMessageParam;

type CompletionSettings = {
  model: string;
  system: string;
  params?: Record<string, unknown>;
};

export function defineCompletion(settings: CompletionSettings) {
  const { model, system, params } = settings;
  const systemMessage = { role: "system" as const, content: system };

  return {
    async create(messages: CompletionMessage[]): Promise<string> {
      const response = await client.chat.completions.create({
        model,
        ...params,
        messages: [systemMessage, ...messages],
      });
      return response.choices[0]?.message.content || "";
    },

    async *stream(messages: CompletionMessage[]) {
      const stream = await client.chat.completions.create({
        model,
        ...params,
        messages: [systemMessage, ...messages],
        stream: true,
      });
      for await (const chunk of stream) {
        yield chunk.choices[0]?.delta.content || "";
      }
    },
  };
}

export const defaultCompletion = defineCompletion({
  model: "venice-uncensored",
  system: "You are a helpful assistant. Try to be concise.",
  params: { venice_parameters: { enable_web_search: "auto" } },
});

export const smsCompletion = defineCompletion({
  model: "venice-uncensored",
  system:
    "You are a helpful assistant responding through SMS, be concise and to the point.",
  params: { venice_parameters: { enable_web_search: "auto" } },
});
