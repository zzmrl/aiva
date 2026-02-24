import createDebug from "debug";
import * as messageService from "../message/service";
import twilio from "twilio";

const debug = createDebug("api:twilio:service");

export function handleIncomingCall(host: string): string {
  debug("Incoming call: host=%s", host);
  const twiml = new twilio.twiml.VoiceResponse();

  const connect = twiml.connect();
  connect.conversationRelay({
    url: `wss://${host}/twilio/relay`,
    welcomeGreeting: "Hey it's Aiva! How can I help you today?",
    voice: "uYXf8XasLslADfZ2MB4u",
  });

  return twiml.toString();
}

export async function handleIncomingSms(
  to: string,
  from: string,
  body: string,
): Promise<string> {
  debug("Incoming SMS: from=%s to=%s body length=%d", from, to, body.length);
  const twiml = new twilio.twiml.MessagingResponse();

  try {
    const message = await messageService.replyToMessage(to, from, body);
    debug("SMS reply sent: to=%s length=%d", from, message.length);
    twiml.message(message);
  } catch (error) {
    debug("Failed to handle SMS from %s: %O", from, error);
    twiml.message(
      "Sorry, I'm having trouble right now. Please try again later.",
    );
  }

  return twiml.toString();
}
