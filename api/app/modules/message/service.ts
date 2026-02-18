import createDebug from "debug";
import { NotFoundError } from "../../shared/errors";
import { smsCompletion } from "../llm/completions";
import { repository, type Conversation, type Message } from ".";

const debug = createDebug("api:message:service");

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
  debug("replyToMessage: from=%s body length=%d", from, body.length);
  await repository.create({
    body,
    receiver: to,
    sender: from,
    direction: "inbound",
  });
  const conversation = await repository.findConversation(from, to, 30);
  debug("replyToMessage: conversation history=%d messages", conversation.length);
  const llmResponse = await smsCompletion.create(
    conversation.map((msg) => ({
      role: msg.direction === "outbound" ? "assistant" : "user",
      content: msg.body,
    })),
  );
  debug("replyToMessage: LLM response length=%d", llmResponse.length);
  await repository.create({
    body: llmResponse,
    receiver: from,
    sender: to,
    direction: "outbound",
  });
  return llmResponse;
}
