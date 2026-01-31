import { redis } from "../../shared/redis";

/**
 * @module
 * Handling duplicate events sent through webhooks
 * https://developers.telnyx.com/development/api-fundamentals/webhooks/receiving-webhooks#handling-duplicate-events
 */

const KEY_PREFIX = "telnyx:event:";
const TTL_SECONDS = 86400; // 24 hours

/**
 * Check if an event has already been processed.
 * Uses Redis SETNX for atomic check-and-set.
 *
 * @returns true if this is a new event, false if duplicate.
 */
export async function markEventProcessed(eventId: string): Promise<boolean> {
  const key = `${KEY_PREFIX}${eventId}`;
  const result = await redis.send("SET", [
    key,
    "1",
    "NX",
    "EX",
    TTL_SECONDS.toString(),
  ]);
  return result === "OK";
}
