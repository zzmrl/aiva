import type {
  ChatCompletionMessageParam,
  ChatCompletionMessageToolCall,
} from "openai/resources";
import config from "../../config";
import appLogger from "../../shared/logger";
import client from "./client";
import { callTool, getTools, hasMcp } from "./mcp";
import type { VeniceModel } from "./models";

const logger = appLogger.child({ module: "llm:completions" });

export type CompletionMessage = ChatCompletionMessageParam;
// https://docs.venice.ai/api-reference/api-spec#venice-parameters
export type VeniceParameters = {
  character_slug?: string;
  strip_thinking_response?: boolean;
  disable_thinking?: boolean;
  enable_web_search?: "off" | "on" | "auto";
  enable_web_scraping?: boolean;
  enable_x_search?: boolean;
  enable_web_citations?: boolean;
  include_search_results_in_stream?: boolean;
  return_search_results_as_documents?: boolean;
  include_venice_system_prompt?: boolean;
  prompt_cache_key?: string;
};
export type CompletionCreateParams = {
  [p: string]: unknown;
  venice_parameters: VeniceParameters;
};

export type CompletionSettings = {
  model: VeniceModel;
  system: string;
  params?: CompletionCreateParams;
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
  const baseParams = { model, ...params };

  function buildSystemMessage(systemContext?: string) {
    const content = systemContext ? `${system}\n${systemContext}` : system;
    return { role: "system" as const, content };
  }

  // Resolves MCP tool call rounds (if any) before the final completion.
  async function prepareConversation(
    messages: CompletionMessage[],
    systemMessage: { role: "system"; content: string },
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
    async create(
      messages: CompletionMessage[],
      options?: { systemContext?: string },
    ): Promise<string> {
      logger.debug({ model, messages: messages.length }, "create()");
      const systemMessage = buildSystemMessage(options?.systemContext);
      const conversation = await prepareConversation(messages, systemMessage);
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
        systemContext?: string;
      },
    ) {
      logger.debug({ model, messages: messages.length }, "stream()");
      const systemMessage = buildSystemMessage(options?.systemContext);
      const conversation = await prepareConversation(
        messages,
        systemMessage,
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

export const smsCompletion = defineCompletion({
  model: config.SMS_MODEL,
  system:
    "You are Ava, a helpful text assistant. Keep responses short and direct. " +
    "Never use markdown — no asterisks, dashes, bullet points, or headers. Plain text only.",
  params: { venice_parameters: { enable_web_search: "auto" } },
});

export const voiceCompletion = defineCompletion({
  model: config.VOICE_MODEL,
  system: `You are Ava, a helpful voice assistant. Be concise and conversational.
    When the response contains markdown lists, convert to natural spoken language — no bullet markers.
    For short lists (2-3 items): "first... then... and finally..."
    For longer lists, introduce with a phrase like "here are the steps:" or "there are four options:", then read each item as a sentence.
    Numbered lists should be read as "first", "second", "third", not "one", "two", "three".
    URLs should be read character by character: "automate.it.com/docs" → "automate dot it dot com slash docs".
`,
  params: { venice_parameters: { enable_web_search: "auto" } },
});
