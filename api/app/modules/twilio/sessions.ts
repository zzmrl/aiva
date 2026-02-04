import type { WebSocket } from "ws";
import type { CompletionMessage } from "../llm/repository";

export type StreamSession = {
  ws: WebSocket;
  streamSid: string;
  callSid: string;
  from: string;
  to: string;
  messages: CompletionMessage[];
};

const sessions = new Map<string, StreamSession>();

export function create(
  callSid: string,
  session: StreamSession,
): void {
  sessions.set(callSid, session);
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
