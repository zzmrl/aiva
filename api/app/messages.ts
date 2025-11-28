import db from "./db";

export type Message = {
  id: number;
  phoneNumber: string;
  body: string;
  createdAt: Date;
};

export type CreateMessageInput = Pick<Message, "phoneNumber" | "body">;

/**
 * Insert a new message into the database
 * @param input - The message data to insert
 * @returns The inserted message
 */
export async function insertMessage(
  input: CreateMessageInput,
): Promise<Message> {
  const query = `
    INSERT INTO messages (phone_number, body)
    VALUES ($1, $2)
    RETURNING id, phone_number, body
  `;
  return db.one<Message>(query, [input.phoneNumber, input.body]);
}

/**
 * Get all messages from the database
 * @returns Array of all messages
 */
export function getAllMessages(): Promise<Message[]> {
  const query = `
    SELECT id, phone_number, body
    FROM messages
    ORDER BY created_at DESC
  `;
  return db.manyOrNone<Message>(query);
}

/**
 * Get a single message by ID
 * @param id - The message ID
 * @returns The message if found, null otherwise
 */
export async function getMessageById(id: number): Promise<Message | null> {
  const query = `
    SELECT id, phone_number, body
    FROM messages
    WHERE id = $1
  `;
  return db.oneOrNone<Message>(query, [id]);
}

/**
 * Get a single message by ID
 * @param id - The message ID
 * @returns The message if found, null otherwise
 */
export async function getMessageByPhone(id: number): Promise<Message | null> {
  const query = `
    SELECT id, phone_number, body
    FROM messages
    WHERE id = $1
  `;
  return db.oneOrNone<Message>(query, [id]);
}
