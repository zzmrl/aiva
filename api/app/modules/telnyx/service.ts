import { streamCompletion, type CompletionMessage } from "../llm/service";
import { service as messageService } from "../message";
import * as client from "./client";
import type {
  CallAnsweredPayload,
  CallHangupPayload,
  CallInitiatedPayload,
  MessagingPayload,
  TranscriptionPayload,
} from "./validation";

const conversations = new Map<string, CompletionMessage[]>();

export function getConversation(callControlId: string): CompletionMessage[] {
  return conversations.get(callControlId) ?? [];
}

export function clearConversation(callControlId: string): void {
  conversations.delete(callControlId);
}

export async function handleCallInitiated(
  payload: CallInitiatedPayload,
): Promise<void> {
  await client.answerCall(payload.call_control_id);
}

export async function handleCallAnswered(
  payload: CallAnsweredPayload,
): Promise<void> {
  conversations.set(payload.call_control_id, []);
  await client.startTranscription(payload.call_control_id);
  await client.speak(
    payload.call_control_id,
    "Hello! I am Automate It Virtual Assistant. How can I help you today?",
  );
}

export async function handleTranscription(
  payload: TranscriptionPayload,
): Promise<void> {
  const {
    call_control_id,
    transcription_data: { transcript, is_final },
  } = payload;

  if (!is_final) {
    return;
  }

  const conversation = conversations.get(call_control_id) ?? [];
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
      await client.speak(call_control_id, fullResponse);
    }
  }

  conversation.push({
    role: "assistant",
    content: fullResponse,
  });
}

export function handleCallHangup(payload: CallHangupPayload): void {
  conversations.delete(payload.call_control_id);
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
