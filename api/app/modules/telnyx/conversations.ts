import { redis } from "../../shared/redis";
import type { CompletionMessage } from "../llm/repository";

/**
 * @module Redis-backed conversation store for calls
 */

const KEY_PREFIX = "conversation:";
const TTL_SECONDS = 3600; // 1 hour

function key(callControlId: string): string {
  return `${KEY_PREFIX}${callControlId}`;
}

export async function get(callControlId: string): Promise<CompletionMessage[]> {
  const data = await redis.get(key(callControlId));
  if (!data) return [];
  return JSON.parse(data) as CompletionMessage[];
}

export async function set(
  callControlId: string,
  messages: CompletionMessage[],
): Promise<void> {
  await redis.set(key(callControlId), JSON.stringify(messages));
  await redis.expire(key(callControlId), TTL_SECONDS);
}

export async function append(
  callControlId: string,
  message: CompletionMessage,
): Promise<CompletionMessage[]> {
  const messages = await get(callControlId);
  messages.push(message);
  await set(callControlId, messages);
  return messages;
}

export async function remove(callControlId: string): Promise<void> {
  await redis.del(key(callControlId));
}
