import { streamCompletion } from "../llm/repository";
import { service as messageService, repository as messageRepository } from "../message";
import * as conversations from "./conversations";
import * as repository from "./repository";
import type {
  CallAnsweredPayload,
  CallHangupPayload,
  CallInitiatedPayload,
  MessagingPayload,
  TranscriptionPayload,
} from "./validation";

export async function handleCallInitiated(
  payload: CallInitiatedPayload,
): Promise<void> {
  await conversations.init(payload.call_control_id, {
    from: payload.from,
    to: payload.to,
  });
  await repository.answerCall(payload.call_control_id);
}

export async function handleCallAnswered(
  payload: CallAnsweredPayload,
): Promise<void> {
  await repository.startTranscription(payload.call_control_id);
  await repository.speak(
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

  const messages = await conversations.append(call_control_id, {
    role: "user",
    content: transcript,
  });

  let fullResponse = "";
  let firstChunk = true;
  for await (const chunk of streamCompletion(messages)) {
    fullResponse += chunk;
    if (firstChunk && fullResponse.includes(".")) {
      firstChunk = false;
      await repository.speak(call_control_id, fullResponse);
    }
  }

  await conversations.append(call_control_id, {
    role: "assistant",
    content: fullResponse,
  });
}

export async function handleCallHangup(
  payload: CallHangupPayload,
): Promise<void> {
  const conversation = await conversations.getAll(payload.call_control_id);

  if (conversation && conversation.messages.length > 0) {
    const { from, to } = conversation.metadata;

    for (const message of conversation.messages) {
      const isUser = message.role === "user";
      await messageRepository.create({
        sender: isUser ? from : to,
        receiver: isUser ? to : from,
        body: message.content?.toString() ?? "",
      });
    }
  }

  await conversations.remove(payload.call_control_id);
}

export async function handleInboundMessage(
  payload: MessagingPayload,
): Promise<void> {
  const [to, from, text] = [
    payload.to[0].phone_number,
    payload.from.phone_number,
    payload.text,
  ];
  const response = await messageService.handleInboundMessage(to, from, text);

  repository.sendSms(from, to, response);
}
