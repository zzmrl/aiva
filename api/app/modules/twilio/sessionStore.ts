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

const sessions = new Map<WebSocket, RelaySession>();
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

export function create(
  ws: WebSocket,
  session: Omit<RelaySession, "createdAt">,
): void {
  logger.debug(
    { callSid: session.callSid, from: session.from, to: session.to },
    "Session created",
  );
  sessions.set(ws, { ...session, createdAt: Date.now() });
}

export function get(ws: WebSocket): RelaySession | undefined {
  return sessions.get(ws);
}

export function appendMessage(
  ws: WebSocket,
  message: CompletionMessage,
): CompletionMessage[] {
  const session = sessions.get(ws);
  if (!session) {
    logger.debug("appendMessage: no session");
    return [];
  }
  session.messages.push(message);
  logger.debug(
    {
      callSid: session.callSid,
      role: message.role,
      total: session.messages.length,
    },
    "appendMessage",
  );
  return session.messages;
}

export function remove(ws: WebSocket): RelaySession | undefined {
  const session = sessions.get(ws);
  if (session) {
    logger.debug(
      { callSid: session.callSid, messages: session.messages.length },
      "Session removed",
    );
    sessions.delete(ws);
  }
  return session;
}

export function cleanup(): number {
  const now = Date.now();
  let removed = 0;
  for (const [ws, session] of sessions) {
    if (now - session.createdAt >= SESSION_TTL_MS) {
      sessions.delete(ws);
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
