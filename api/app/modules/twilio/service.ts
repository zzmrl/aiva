import * as messageService from "../message/service";

export async function handleIncomingSms(
  to: string,
  from: string,
  body: string,
): Promise<string> {
  return messageService.handleIncomingSms(to, from, body);
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
