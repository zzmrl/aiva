import { sql } from "./client";

export type Message = {
  id: number;
  phoneNumber: string;
  body: string;
  createdAt: Date;
};

export type CreateMessageInput = Pick<Message, "phoneNumber" | "body">;

/**
 * Insert a new message
 * @param input - The message data to insert
 * @returns The inserted message
 */
export async function insertMessage(
  input: CreateMessageInput,
): Promise<Message> {
  return sql<Message>`
    INSERT INTO messages (phone_number, body)
    VALUES (${input.phoneNumber}, ${input.body})
    RETURNING id, phone_number AS phoneNumber,
      body, created_at AS createdAt
  `;
}

/**
 * Get all messages
 * @returns Array of all messages
 */
export async function getAllMessages(): Promise<Message[]> {
  return sql`
    SELECT
      id, phone_number AS "phoneNumber",
      body, created_at AS "createdAt"
    FROM messages
    ORDER BY created_at DESC
  `;
}

/**
 * Get a single message by ID
 * @param id - The message ID
 * @returns The message if found, null otherwise
 */
export async function getMessageById(id: number): Promise<Message | null> {
  const [message] = await sql<Message[]>`
    SELECT
      id, phone_number AS "phoneNumber",
      body, created_at AS "createdAt"
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
  return sql<Message[]>`
    SELECT
      id, phone_number AS "phoneNumber",
      body, created_at AS "createdAt"
    FROM messages
    WHERE phone_number = ${phone}
  `;
}
