import { sql } from "../../shared/database";
import type { Conversation, Message } from "./model";

export type CreateMessageInput = Pick<Message, "receiver" | "sender" | "body" | "direction">;

/**
 * Insert a new message
 * @param input - The message data to insert
 * @returns The inserted message
 */
export async function create(input: CreateMessageInput): Promise<Message> {
  const params = sql(input);
  const [message] = await sql`
    INSERT INTO messages ${params}
    RETURNING *
  `;
  return message;
}

export type MessagesPhoneFilter = {
  phone?: string;
};
export type MessagesFilter = MessagesPhoneFilter;

/**
 * Get all messages
 * @param filter - Filter options
 * @returns Array of all messages
 */
export async function findMany(
  filter: MessagesFilter = {},
): Promise<Message[]> {
  let f = sql``;
  if (filter.phone) {
    f = sql`
      WHERE sender = ${filter.phone}
       OR receiver = ${filter.phone}
    `;
  }
  return sql`
    SELECT *
    FROM messages
    ${f}
    ORDER BY created DESC
  `;
}

/**
 * Get a single message by ID
 * @param id - The message ID
 * @returns The message if found, null otherwise
 */
export async function findById(id: number): Promise<Message | undefined> {
  const [message] = await sql`
    SELECT *
    FROM messages
    WHERE id = ${id}
  `;
  return message;
}

/**
 * Get messages in a conversation between two parties
 * @param phone1 - First phone number in the conversation
 * @param phone2 - Second phone number in the conversation
 * @param minutesAgo - Limit results to messages created X minutes ago
 * @returns Messages between the two parties, ordered chronologically (oldest first)
 */
export async function findConversation(
  phone1: string,
  phone2: string,
  minutesAgo?: number,
): Promise<Message[]> {
  const ageFilter = minutesAgo
    ? sql`AND created >= NOW() - INTERVAL '${minutesAgo} MINUTE'`
    : sql``;
  return sql`
    SELECT *
    FROM messages
    WHERE (sender = ${phone1} AND receiver = ${phone2})
       OR (sender = ${phone2} AND receiver = ${phone1})
    ${ageFilter}
    ORDER BY created ASC
  `;
}

/**
 * Get unique conversations with their latest message
 * @returns Array of conversations ordered by most recent message first
 */
export async function findConversations(): Promise<Conversation[]> {
  return sql`
    SELECT DISTINCT ON (LEAST(sender, receiver), GREATEST(sender, receiver))
      LEAST(sender, receiver) as phone1,
      GREATEST(sender, receiver) as phone2,
      body as last_message_body,
      sender as last_message_sender,
      created as last_message_at,
      CASE WHEN direction = 'inbound' THEN sender ELSE receiver END as contact_phone
    FROM messages
    ORDER BY LEAST(sender, receiver), GREATEST(sender, receiver), created DESC
  `;
}
