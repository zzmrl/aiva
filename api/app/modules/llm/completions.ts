import type {
  ChatCompletionMessageParam,
  ChatCompletionMessageToolCall,
} from "openai/resources";
import client from "./client";
import { hasMcp, getTools, callTool } from "./mcp";
import appLogger from "../../shared/logger";

const logger = appLogger.child({ module: "llm:completions" });

export type CompletionMessage = ChatCompletionMessageParam;

type VeniceModel =
  | "zai-org-glm-4.7"
  | "zai-org-glm-4.7-flash"
  | "zai-org-glm-5"
  | "grok-41-fast"
  | "llama-3.2-3b";

type CompletionSettings = {
  model: VeniceModel;
  system: string;
  params?: Record<string, unknown>;
};

async function executeToolCalls(
  toolCalls: ChatCompletionMessageToolCall[],
  conversation: CompletionMessage[],
): Promise<void> {
  logger.debug({ count: toolCalls.length }, "executing tool calls");
  const functionCalls = toolCalls.filter((tc) => tc.type === "function");
  const results = await Promise.all(
    functionCalls.map(async (toolCall) => {
      const args = JSON.parse(toolCall.function.arguments);
      const result = await callTool(toolCall.function.name, args);
      return {
        tool_call_id: toolCall.id,
        content: result,
        role: "tool" as const,
      };
    }),
  );
  conversation.push(...results);
}

export function defineCompletion(settings: CompletionSettings) {
  const { model, system, params } = settings;
  const systemMessage = { role: "system" as const, content: system };
  const baseParams = { model, ...params };

  // Resolves MCP tool call rounds (if any) before the final completion.
  async function prepareConversation(
    messages: CompletionMessage[],
    onToolCall?: () => void | Promise<void>,
  ): Promise<CompletionMessage[]> {
    const conversation = [...messages];
    const tools = hasMcp() ? await getTools() : undefined;
    if (!tools?.length) return conversation;

    while (true) {
      const response = await client.chat.completions.create({
        ...baseParams,
        messages: [systemMessage, ...conversation],
        tools,
      });
      const choice = response.choices[0];
      if (
        choice?.finish_reason !== "tool_calls" ||
        !choice.message.tool_calls
      ) {
        break;
      }
      await onToolCall?.();
      conversation.push(choice.message);
      await executeToolCalls(choice.message.tool_calls, conversation);
    }

    return conversation;
  }

  return {
    async create(messages: CompletionMessage[]): Promise<string> {
      logger.debug({ model, messages: messages.length }, "create()");
      const conversation = await prepareConversation(messages);
      const response = await client.chat.completions.create({
        ...baseParams,
        messages: [systemMessage, ...conversation],
      });
      const content = response.choices[0]?.message.content ?? "";
      logger.debug({ length: content.length }, "create() response");
      return content;
    },

    async *stream(
      messages: CompletionMessage[],
      options?: {
        signal?: AbortSignal;
        onToolCall?: () => void | Promise<void>;
      },
    ) {
      logger.debug({ model, messages: messages.length }, "stream()");
      const conversation = await prepareConversation(
        messages,
        options?.onToolCall,
      );
      const stream = await client.chat.completions.create(
        {
          ...baseParams,
          messages: [systemMessage, ...conversation],
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
      logger.debug({ length: totalLength }, "stream() complete");
    },
  };
}

export const defaultCompletion = defineCompletion({
  model: "zai-org-glm-4.7",
  system: "You are a helpful assistant. Try to be concise.",
  params: { venice_parameters: { enable_web_search: "auto" } },
});

export const smsCompletion = defineCompletion({
  model: "zai-org-glm-4.7",
  system:
    "You are a helpful text assistant. Format your response for SMS. Be concise and to the point.",
  params: { venice_parameters: { enable_web_search: "auto" } },
});

export const voiceCompletion = defineCompletion({
  model: "zai-org-glm-4.7",
  system: `You are a helpful voice assistant. Be concise and conversational.
    Convert the output text into a format suitable for text-to-speech.
    Ensure that numbers, symbols, and abbreviations are expanded for clarity when read aloud.
    Expand all abbreviations to their full spoken forms.

    When the response contains a list, convert it to natural spoken language.
    Do not say "bullet" or "dash" or any list punctuation markers.
    For short lists (2-3 items), use natural connectives: "first... then... and finally..."
    For longer lists, introduce with a phrase like "here are the steps:" or "there are four options:" and then read each item as a sentence, pausing naturally between them.
    Numbered lists should be read as "first", "second", "third", etc., not as "one", "two", "three".

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

    "- Apples\n- Bananas\n- Cherries" → "Apples, bananas, and cherries."
    "* Apples\n* Bananas\n* Cherries" → "Apples, bananas, and cherries."
    "1. Preheat oven\n2. Mix ingredients\n3. Bake for 30 minutes" → "First, preheat the oven. Then mix the ingredients. Finally, bake for thirty minutes."
    "There are three options:\n- Option A\n- Option B\n- Option C" → "There are three options: Option A, Option B, or Option C."
`,
  params: { venice_parameters: { enable_web_search: "auto" } },
});
