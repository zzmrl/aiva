import { NotFoundError } from "../../shared/errors";
import { smsCompletion } from "../llm/completions";
import { repository, type Conversation, type Message } from ".";
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

export async function listConversation(
  phone1: string,
  phone2: string,
  minutesAgo?: number,
): Promise<Message[]> {
  return repository.findConversation(phone1, phone2, minutesAgo);
}

export async function listConversations(): Promise<Conversation[]> {
  return repository.findConversations();
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
    30,
  );
  logger.debug({ count: conversation.length }, "replyToMessage: conversation history");
  const llmResponse = await smsCompletion.create(
    conversation.map((msg) => ({
      role: msg.direction === "outbound" ? "assistant" : "user",
      content: msg.body,
    })),
  );
  logger.debug({ length: llmResponse.length }, "replyToMessage: LLM response");
  repository
    .create({ body: llmResponse, receiver: from, sender: to, direction: "outbound" })
    .catch((err) => logger.error({ err }, "replyToMessage: failed to save outbound message"));
  return llmResponse;
}
