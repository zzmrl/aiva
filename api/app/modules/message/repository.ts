import { sql } from "../../shared/database";
import type { Conversation, Message } from "./model";

export type CreateMessageInput = Pick<
  Message,
  "receiver" | "sender" | "body" | "direction"
>;

/**
 * Insert a new message
 * @param input - The message data to insert
 * @returns The inserted message
 */
export async function create(input: CreateMessageInput): Promise<Message> {
  const [message] = await sql`
    INSERT INTO messages ${sql(input)}
    RETURNING *
  `;
  return message;
}

export type MessagesPhoneFilter = {
  phone?: string;
  systemPhone?: string;
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
  const { phone, systemPhone } = filter;
  const byPhone = phone
    ? sql`(sender = ${phone} OR receiver = ${phone})`
    : sql`TRUE`;
  const bySystemPhone = systemPhone
    ? sql`
        ((direction = 'inbound' AND receiver = ${systemPhone})
      OR (direction = 'outbound' AND sender = ${systemPhone}))`
    : sql`TRUE`;
  return sql`
    SELECT *
    FROM messages
    WHERE ${byPhone} AND ${bySystemPhone}
    ORDER BY created ASC
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
 * Get distinct system-side phone numbers from message history.
 * System phone = receiver on inbound, sender on outbound.
 */
export async function findSystemPhones(): Promise<string[]> {
  const rows: { phone: string }[] = await sql`
    SELECT DISTINCT
      CASE WHEN direction = 'inbound'
          THEN receiver
          ELSE sender
      END AS phone
    FROM messages
    ORDER BY phone
  `;
  return rows.map((r) => r.phone);
}

/**
 * Get recent messages between two participants, oldest first
 * @param phone1 - One participant's phone number
 * @param phone2 - The other participant's phone number
 * @param limit - Max number of messages to return (most recent)
 */
export async function findByParticipants(
  phone1: string,
  phone2: string,
  limit = 20,
): Promise<Message[]> {
  return sql`
    SELECT * FROM (
      SELECT * FROM messages
      WHERE (sender = ${phone1} AND receiver = ${phone2})
         OR (sender = ${phone2} AND receiver = ${phone1})
      ORDER BY created DESC
      LIMIT ${limit}
    ) recent
    ORDER BY created ASC
  `;
}

/**
 * Get unique conversations with their latest message
 * @param systemPhone - Optional system phone to filter conversations by
 * @returns Array of conversations ordered by most recent message first
 */
export async function findConversations(
  systemPhone?: string,
): Promise<Conversation[]> {
  const f = systemPhone
    ? sql`
        WHERE (direction = 'inbound' AND receiver = ${systemPhone})
           OR (direction = 'outbound' AND sender = ${systemPhone})
      `
    : sql``;
  return sql`
    SELECT DISTINCT ON (LEAST(sender, receiver), GREATEST(sender, receiver))
      LEAST(sender, receiver) as phone1,
      GREATEST(sender, receiver) as phone2,
      body as last_message_body,
      sender as last_message_sender,
      created as last_message_at,
      CASE WHEN direction = 'inbound' THEN sender ELSE receiver END as contact_phone
    FROM messages
    ${f}
    ORDER BY LEAST(sender, receiver), GREATEST(sender, receiver), created DESC
  `;
}
