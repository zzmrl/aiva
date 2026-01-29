import { createCompletion } from "../../llm/completions";
import * as messageService from "../message/service";

export async function handleIncomingSms(
  to: string,
  from: string,
  body: string,
): Promise<string> {
  const message = await messageService.create({
    body,
    receiver: to,
    sender: from,
  });

  const conversationHistory = await messageService.getConversation(
    message.sender,
    message.receiver,
    30,
  );

  const llmResponse = await createCompletion(
    conversationHistory.map((msg) => ({
      role: msg.sender === message.receiver ? "assistant" : "user",
      content: msg.body,
    })),
  );

  await messageService.create({
    body: llmResponse,
    receiver: message.sender,
    sender: message.receiver,
  });

  return llmResponse;
}

export async function handleTranscription(
  to: string,
  from: string,
  text: string,
): Promise<void> {
  await messageService.create({
    body: text,
    receiver: to,
    sender: from,
  });
}
