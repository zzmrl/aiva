import { NotFoundError } from "../../shared/errors";
import { smsCompletion } from "../llm/completions";
import { repository, type Conversation, type Message } from ".";
import { broadcast } from "../notifications";
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

  const inbound = conversation[conversation.length - 1];
  if (inbound) {
    broadcast({ type: "new_message", message: inbound });
  }

  const llmResponse = await smsCompletion.create(
    conversation.map((msg) => ({
      role: msg.direction === "outbound" ? "assistant" : "user",
      content: msg.body,
    })),
  );
  logger.debug({ length: llmResponse.length }, "replyToMessage: LLM response");
  const outbound = await repository.create({
    body: llmResponse,
    receiver: from,
    sender: to,
    direction: "outbound",
  });
  broadcast({ type: "new_message", message: outbound });
  return llmResponse;
}
