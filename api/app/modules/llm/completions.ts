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
  system: `You are Ava, a helpful voice assistant. Be concise and conversational.
    When the response contains markdown lists, convert to natural spoken language — no bullet markers.
    For short lists (2-3 items): "first... then... and finally..."
    For longer lists, introduce with a phrase like "here are the steps:" or "there are four options:", then read each item as a sentence.
    Numbered lists should be read as "first", "second", "third", not "one", "two", "three".
    URLs should be read character by character: "automate.it.com/docs" → "automate dot it dot com slash docs".
`,
  params: { venice_parameters: { enable_web_search: "auto" } },
});
