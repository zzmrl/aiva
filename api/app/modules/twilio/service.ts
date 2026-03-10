import * as messageService from "../message/service";
import twilio from "twilio";
import appLogger from "../../shared/logger";

const logger = appLogger.child({ module: "twilio:service" });

export function handleIncomingCall(host: string): string {
  logger.debug({ host }, "Incoming call");
  const twiml = new twilio.twiml.VoiceResponse();

  const connect = twiml.connect();
  connect.conversationRelay({
    url: `wss://${host}/twilio/relay`,
    welcomeGreeting: "Hey it's Ava! Whats up?",
    voice: "yM93hbw8Qtvdma2wCnJG",
  });

  return twiml.toString();
}

export async function handleIncomingSms(
  to: string,
  from: string,
  body: string,
): Promise<string> {
  logger.debug({ from, to, length: body.length }, "Incoming SMS");
  const twiml = new twilio.twiml.MessagingResponse();

  try {
    const message = await messageService.replyToMessage(to, from, body);
    logger.debug({ to: from, length: message.length }, "SMS reply sent");
    twiml.message(message);
  } catch (error) {
    logger.error({ from, err: error }, "Failed to handle SMS");
    twiml.message(
      "Sorry, I'm having trouble right now. Please try again later.",
    );
  }

  return twiml.toString();
}
