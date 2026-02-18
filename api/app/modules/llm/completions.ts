import type { ChatCompletionMessageParam } from "openai/resources";
import createDebug from "debug";
import client from "./client";

const debug = createDebug("api:llm:completions");

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
      debug("create: model=%s messages=%d", model, messages.length);
      const response = await client.chat.completions.create({
        model,
        ...params,
        messages: [systemMessage, ...messages],
      });
      const content = response.choices[0]?.message.content || "";
      debug("create: response length=%d", content.length);
      return content;
    },

    async *stream(messages: CompletionMessage[]) {
      debug("stream: model=%s messages=%d", model, messages.length);
      const stream = await client.chat.completions.create({
        model,
        ...params,
        messages: [systemMessage, ...messages],
        stream: true,
      });
      let totalLength = 0;
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta.content || "";
        totalLength += content.length;
        yield content;
      }
      debug("stream: complete, total length=%d", totalLength);
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
