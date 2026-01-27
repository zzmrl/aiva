import { sql } from "../../db";
import type { Message } from "./model";

export type CreateMessageInput = Pick<Message, "receiver" | "sender" | "body">;

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

/**
 * Get all messages
 * @returns Array of all messages
 */
export async function findMany(
  filter: { phone?: string } = {},
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
