import { NotFoundError } from "../../shared/errors";
import { repository, type Message } from ".";

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

export async function findById(id: number): Promise<Message> {
  const message = await repository.findById(id);
  if (!message) {
    throw new NotFoundError(`Message with id ${id} not found`);
  }
  return message;
}

export async function getConversation(
  phone1: string,
  phone2: string,
  minutesAgo?: number,
): Promise<Message[]> {
  return repository.findConversation(phone1, phone2, minutesAgo);
}
