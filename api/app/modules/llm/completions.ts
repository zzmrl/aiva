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

    async *stream(
      messages: CompletionMessage[],
      options?: { signal?: AbortSignal },
    ) {
      debug("stream: model=%s messages=%d", model, messages.length);
      const stream = await client.chat.completions.create(
        {
          model,
          ...params,
          messages: [systemMessage, ...messages],
          stream: true,
        },
        { signal: options?.signal },
      );
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
    "You are a helpful text assistant. Format your response for SMS. Be concise and to the point.",
  params: { venice_parameters: { enable_web_search: "auto" } },
});

export const voiceCompletion = defineCompletion({
  model: "venice-uncensored",
  system: `You are a helpful voice assistant. Be concise and conversational.
    Convert the output text into a format suitable for text-to-speech.
    Ensure that numbers, symbols, and abbreviations are expanded for clarity when read aloud.
    Expand all abbreviations to their full spoken forms.

    Example input and output:
    "$42.50" → "forty-two dollars and fifty cents"
    "£1,001.32" → "one thousand and one pounds and thirty-two pence"
    "1234" → "one thousand two hundred thirty-four"
    "3.14" → "three point one four"
    "555-555-5555" → "five five five, five five five, five five five five"
    "2nd" → "second"
    "XIV" → "fourteen" - unless it's a title, then it's "the fourteenth"
    "3.5" → "three point five"
    "⅔" → "two-thirds"
    "Dr." → "Doctor"
    "Ave." → "Avenue"
    "St." → "Street" (but saints like "St. Patrick" should remain)
    "Ctrl + Z" → "control z"
    "100km" → "one hundred kilometers"
    "100%" → "one hundred percent"
    "elevenlabs.io/docs" → "eleven labs dot io slash docs"
    "2024-01-01" → "January first, two-thousand twenty-four"
    "123 Main St, Anytown, USA" → "one two three Main Street, Anytown, United States of America"
    "14:30" → "two thirty PM"
    "01/02/2023" → "January second, two-thousand twenty-three" or "the first of February, two-thousand twenty-three", depending on locale of the user
`,
  params: { venice_parameters: { enable_web_search: "auto" } },
});
