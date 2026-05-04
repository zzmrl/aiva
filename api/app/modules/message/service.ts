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

export async function generateReply(to: string, from: string): Promise<string> {
  const conversation = await repository.findByParticipants(from, to);
  const llmResponse = await smsCompletion.create(
    conversation.map((msg) => ({
      role: msg.direction === "outbound" ? "assistant" : "user",
      content: msg.body,
    })),
  );
  logger.debug(
    { from, replyLen: llmResponse.length, historyCount: conversation.length },
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
