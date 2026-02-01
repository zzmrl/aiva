import { redis } from "../../shared/redis";
import type { CompletionMessage } from "../llm/repository";

/**
 * @module Redis-backed conversation store for calls
 */

const KEY_PREFIX = "conversation:";
const TTL_SECONDS = 3600; // 1 hour

export type CallMetadata = {
  from: string;
  to: string;
};

type StoredConversation = {
  metadata: CallMetadata;
  messages: CompletionMessage[];
};

function key(callControlId: string): string {
  return `${KEY_PREFIX}${callControlId}`;
}

async function getStored(
  callControlId: string,
): Promise<StoredConversation | null> {
  const data = await redis.get(key(callControlId));
  if (!data) return null;
  return JSON.parse(data) as StoredConversation;
}

async function setStored(
  callControlId: string,
  conversation: StoredConversation,
): Promise<void> {
  await redis.set(key(callControlId), JSON.stringify(conversation));
  await redis.expire(key(callControlId), TTL_SECONDS);
}

export async function getMessages(
  callControlId: string,
): Promise<CompletionMessage[]> {
  const stored = await getStored(callControlId);
  return stored?.messages ?? [];
}

export async function init(
  callControlId: string,
  metadata: CallMetadata,
): Promise<void> {
  await setStored(callControlId, { metadata, messages: [] });
}

export async function append(
  callControlId: string,
  message: CompletionMessage,
): Promise<CompletionMessage[]> {
  const stored = await getStored(callControlId);
  if (!stored) return [];
  stored.messages.push(message);
  await setStored(callControlId, stored);
  return stored.messages;
}

export async function getAll(
  callControlId: string,
): Promise<StoredConversation | null> {
  return getStored(callControlId);
}

export async function remove(callControlId: string): Promise<void> {
  await redis.del(key(callControlId));
}
