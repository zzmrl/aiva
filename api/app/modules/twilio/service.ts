import * as messageService from "../message/service";
import twilio from "twilio";

export function handleIncomingCall(): string {
  const twiml = new twilio.twiml.VoiceResponse();
  twiml.say("Hello. Please leave a message for Automate It.");
  twiml.record({
    transcribe: true,
    transcribeCallback: "/twilio/transcribe",
    maxLength: 30,
  });
  twiml.hangup();
  return twiml.toString();
}

export async function handleIncomingSms(
  to: string,
  from: string,
  body: string,
): Promise<string> {
  const response = await messageService.handleInboundMessage(to, from, body);
  const twiml = new twilio.twiml.MessagingResponse();
  twiml.message(response);
  return twiml.toString();
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
    direction: "inbound",
  });
}
