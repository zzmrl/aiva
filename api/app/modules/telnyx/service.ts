import type Telnyx from "telnyx";
import { streamCompletion, type CompletionMessage } from "../llm/service";
import { service as messageService } from "../message";
import * as client from "./client";
import type { MessagingPayload } from "./validation";

const conversations = new Map<string, CompletionMessage[]>();

export function getConversation(callControlId: string): CompletionMessage[] {
  return conversations.get(callControlId) ?? [];
}

export function clearConversation(callControlId: string): void {
  conversations.delete(callControlId);
}

type TranscriptionEvent = Telnyx.TranscriptionWebhookEvent;
type TranscriptionPayload = NonNullable<TranscriptionEvent["data"]>["payload"];

export async function handleCallInitiated(
  callControlId: string,
): Promise<void> {
  await client.answerCall(callControlId);
}

export async function handleCallAnswered(callControlId: string): Promise<void> {
  conversations.set(callControlId, []);
  await client.startTranscription(callControlId);
  await client.speak(
    callControlId,
    "Hello! I am Automate It Virtual Assistant. How can I help you today?",
  );
}

export async function handleTranscription(
  payload: TranscriptionPayload,
  callControlId: string,
): Promise<void> {
  const { transcript = "", is_final } = payload?.transcription_data ?? {};
  if (!is_final) {
    return;
  }

  const conversation = conversations.get(callControlId) ?? [];
  conversation.push({
    role: "user",
    content: transcript,
  });

  let fullResponse = "";
  let firstChunk = true;
  for await (const chunk of streamCompletion(conversation)) {
    fullResponse += chunk;
    if (firstChunk && fullResponse.includes(".")) {
      firstChunk = false;
      await client.speak(callControlId, fullResponse);
    }
  }

  conversation.push({
    role: "assistant",
    content: fullResponse,
  });
}

export function handleCallHangup(callControlId: string): void {
  conversations.delete(callControlId);
}

export async function handleInboundMessage(
  payload: MessagingPayload,
): Promise<void> {
  await messageService.handleIncomingSms(
    payload.to[0].phone_number,
    payload.from.phone_number,
    payload.text,
  );
}
