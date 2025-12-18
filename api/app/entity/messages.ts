import { sql } from "../db";

export type Message = {
  id: number;
  to: string;
  from: string;
  body: string;
  created: Date;
};

export type InsertMessageInput = Pick<Message, "to" | "from" | "body">;

/**
 * Insert a new message
 * @param input - The message data to insert
 * @returns The inserted message
 */
export async function insertMessage(
  input: InsertMessageInput,
): Promise<Message> {
  return sql`
    INSERT INTO messages (to, from, body)
    VALUES (${input.to}, ${input.from}, ${input.body})
    RETURNING id, to, from,
      body, created
  `;
}

/**
 * Get all messages
 * @returns Array of all messages
 */
export async function getAllMessages(): Promise<Message[]> {
  return sql`
    SELECT id, to, from, body, created
    FROM messages
    ORDER BY created DESC
  `;
}

/**
 * Get a single message by ID
 * @param id - The message ID
 * @returns The message if found, null otherwise
 */
export async function getMessageById(id: number): Promise<Message | null> {
  const [message] = await sql`
    SELECT id, to, from, body, created
    FROM messages
    WHERE id = ${id}
  `;
  return message ?? null;
}

/**
 * Get messages by phone number
 * @param phone - The phone number
 * @returns List of messages if found, empty array otherwise
 */
export async function getMessagesByPhone(phone: string): Promise<Message[]> {
  return sql`
    SELECT id, to, from, body, created
    FROM messages
    WHERE phone_number = ${phone}
  `;
}
