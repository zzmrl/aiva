import type { WebSocket } from "ws";
import createDebug from "debug";
import type { CompletionMessage } from "../llm/completions";

const debug = createDebug("api:twilio:session");

export type RelaySession = {
  ws: WebSocket;
  callSid: string;
  from: string;
  to: string;
  messages: CompletionMessage[];
  abortController: AbortController | null;
  createdAt: number;
};

const SESSION_TTL_MS = 30 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

const sessions = new Map<string, RelaySession>();
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

export function create(
  callSid: string,
  session: Omit<RelaySession, "createdAt">,
): void {
  debug("Session created: callSid=%s from=%s to=%s", callSid, session.from, session.to);
  sessions.set(callSid, { ...session, createdAt: Date.now() });
}

export function get(callSid: string): RelaySession | undefined {
  return sessions.get(callSid);
}

export function appendMessage(
  callSid: string,
  message: CompletionMessage,
): CompletionMessage[] {
  const session = sessions.get(callSid);
  if (!session) {
    debug("appendMessage: no session for callSid=%s", callSid);
    return [];
  }
  session.messages.push(message);
  debug("appendMessage: callSid=%s role=%s total=%d", callSid, message.role, session.messages.length);
  return session.messages;
}

export function remove(callSid: string): RelaySession | undefined {
  const session = sessions.get(callSid);
  if (session) {
    debug("Session removed: callSid=%s messages=%d", callSid, session.messages.length);
  }
  sessions.delete(callSid);
  return session;
}

export function removeByWs(ws: WebSocket): RelaySession | undefined {
  for (const [callSid, session] of sessions) {
    if (session.ws === ws) {
      sessions.delete(callSid);
      return session;
    }
  }
  return undefined;
}

export function cleanup(): number {
  const now = Date.now();
  let removed = 0;
  for (const [callSid, session] of sessions) {
    if (now - session.createdAt >= SESSION_TTL_MS) {
      sessions.delete(callSid);
      removed++;
    }
  }
  if (removed > 0) {
    debug("Cleanup: removed %d stale sessions, %d remaining", removed, sessions.size);
  }
  return removed;
}

export function startCleanup(): void {
  if (cleanupTimer) return;
  cleanupTimer = setInterval(cleanup, CLEANUP_INTERVAL_MS);
  cleanupTimer.unref();
}

export function stopCleanup(): void {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
    cleanupTimer = null;
  }
}
