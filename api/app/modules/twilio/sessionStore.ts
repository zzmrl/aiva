import type { WebSocket } from "ws";
import type { CompletionMessage } from "../llm/completions";
import appLogger from "../../shared/logger";

const logger = appLogger.child({ module: "twilio:session" });

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
  logger.debug(
    { callSid, from: session.from, to: session.to },
    "Session created",
  );
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
    logger.debug({ callSid }, "appendMessage: no session");
    return [];
  }
  session.messages.push(message);
  logger.debug(
    { callSid, role: message.role, total: session.messages.length },
    "appendMessage",
  );
  return session.messages;
}

export function remove(callSid: string): RelaySession | undefined {
  const session = sessions.get(callSid);
  if (session) {
    logger.debug(
      { callSid, messages: session.messages.length },
      "Session removed",
    );
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
    logger.debug(
      { removed, remaining: sessions.size },
      "Cleanup: removed stale sessions",
    );
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
