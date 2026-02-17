import type { WebSocket } from "ws";
import type { CompletionMessage } from "../llm/completions";

export type StreamSession = {
  ws: WebSocket;
  streamSid: string;
  callSid: string;
  from: string;
  to: string;
  messages: CompletionMessage[];
  createdAt: number;
};

const SESSION_TTL_MS = 30 * 60 * 1000;
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000;

const sessions = new Map<string, StreamSession>();
let cleanupTimer: ReturnType<typeof setInterval> | null = null;

export function create(
  callSid: string,
  session: Omit<StreamSession, "createdAt">,
): void {
  sessions.set(callSid, { ...session, createdAt: Date.now() });
}

export function get(callSid: string): StreamSession | undefined {
  return sessions.get(callSid);
}

export function appendMessage(
  callSid: string,
  message: CompletionMessage,
): CompletionMessage[] {
  const session = sessions.get(callSid);
  if (!session) return [];
  session.messages.push(message);
  return session.messages;
}

export function remove(callSid: string): StreamSession | undefined {
  const session = sessions.get(callSid);
  sessions.delete(callSid);
  return session;
}

export function removeByWs(ws: WebSocket): StreamSession | undefined {
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
