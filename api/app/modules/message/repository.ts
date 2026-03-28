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
 * Insert an inbound message and fetch the recent conversation in a single query.
 * More efficient than separate create + findConversation calls.
 * @param from - Sender phone number
 * @param to - Receiver phone number
 * @param body - Message body
 * @returns Messages in the conversation (including the newly inserted one), oldest first
 */
export async function createInboundAndFetchConversation(
  from: string,
  to: string,
  body: string,
): Promise<Message[]> {
  return sql`
    WITH new_msg AS (
      INSERT INTO messages (body, receiver, sender, direction)
      VALUES (${body}, ${to}, ${from}, 'inbound')
      RETURNING *
    )
    SELECT * FROM messages
    WHERE ((sender = ${from} AND receiver = ${to})
       OR (sender = ${to} AND receiver = ${from}))
      AND created >= NOW() - INTERVAL '30 MINUTE'
    UNION ALL
    SELECT * FROM new_msg
    ORDER BY created ASC
  `;
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
