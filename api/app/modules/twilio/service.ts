import * as messageRepository from "../message/repository";
import * as smsWorker from "./smsWorker";
import { twiml } from "twilio";
import appLogger from "../../shared/logger";
import config from "../../config";

const logger = appLogger.child({ module: "twilio:service" });

export function handleIncomingCall(): string {
  logger.debug("Incoming call");
  const response = new twiml.VoiceResponse();
  const connect = response.connect();
  connect.conversationRelay({
    url: `wss://${config.PUBLIC_HOST}/twilio/relay`,
    welcomeGreeting: "Hey it's Ava! Whats up?",
    voice: "yM93hbw8Qtvdma2wCnJG",
  });
  return response.toString();
}

export async function handleIncomingSms(
  to: string,
  from: string,
  body: string,
): Promise<string> {
  logger.debug({ from, to, length: body.length }, "handleIncomingSms");

  await messageRepository.create({
    body,
    receiver: to,
    sender: from,
    direction: "inbound",
  });
  await smsWorker.enqueue(to, from);
  logger.debug({ from }, "handleIncomingSms: job enqueued");

  const response = new twiml.MessagingResponse();
  return response.toString();
}
