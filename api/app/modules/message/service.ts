import { NotFoundError } from "../../shared/errors";
import { smsCompletion } from "../llm/completions";
import * as repository from "./repository";
import type { Conversation, Message } from "./model";
import appLogger from "../../shared/logger";

const logger = appLogger.child({ module: "message:service" });

export async function create(
  input: repository.CreateMessageInput,
): Promise<Message> {
  return repository.create(input);
}

export type ListMessagesFilter = repository.MessagesFilter;

export async function list(
  filter: ListMessagesFilter = {},
): Promise<Message[]> {
  return repository.findMany(filter);
}

export async function getById(id: number): Promise<Message> {
  const message = await repository.findById(id);
  if (!message) {
    throw new NotFoundError(`Message with id ${id} not found`);
  }
  return message;
}

export async function listConversations(
  systemPhone?: string,
): Promise<Conversation[]> {
  return repository.findConversations(systemPhone);
}

export async function listSystemPhones(): Promise<string[]> {
  return repository.findSystemPhones();
}

export async function replyToMessage(
  to: string,
  from: string,
  body: string,
): Promise<string> {
  logger.debug({ from, length: body.length }, "replyToMessage");
  const conversation = await repository.createInboundAndFetchConversation(
    from,
    to,
    body,
  );
  logger.debug(
    { count: conversation.length },
    "replyToMessage: conversation history",
  );
  const llmResponse = await smsCompletion.create(
    conversation.map((msg) => ({
      role: msg.direction === "outbound" ? "assistant" : "user",
      content: msg.body,
    })),
  );
  logger.debug({ length: llmResponse.length }, "replyToMessage: LLM response");
  await repository.create({
    body: llmResponse,
    receiver: from,
    sender: to,
    direction: "outbound",
  });
  return llmResponse;
}

export async function generateResponse(
  to: string,
  from: string,
): Promise<string> {
  logger.debug({ from }, "generateResponse");
  const conversation = await repository.findByParticipants(from, to);
  logger.debug(
    { count: conversation.length },
    "generateResponse: conversation history",
  );
  const llmResponse = await smsCompletion.create(
    conversation.map((msg) => ({
      role: msg.direction === "outbound" ? "assistant" : "user",
      content: msg.body,
    })),
  );
  logger.debug(
    { length: llmResponse.length },
    "generateResponse: LLM response",
  );
  await repository.create({
    body: llmResponse,
    receiver: from,
    sender: to,
    direction: "outbound",
  });
  return llmResponse;
}
