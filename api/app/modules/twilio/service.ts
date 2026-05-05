import * as messageRepository from "../message/repository";
import * as smsWorker from "./smsWorker";
import { twiml } from "twilio";
import appLogger from "../../shared/logger";
import config from "../../config";
import twilioClient from "./client";

const logger = appLogger.child({ module: "twilio:service" });

const MAX_REPLY_LENGTH = 1500;

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
  await smsWorker.enqueue(from, to);
  logger.debug({ from: to }, "handleIncomingSms: job enqueued");

  const response = new twiml.MessagingResponse();
  return response.toString();
}

export async function sendSms(
  to: string,
  from: string,
  body: string,
): Promise<void> {
  logger.debug({ from, to, length: body.length }, "sendSms");

  if (!twilioClient) {
    logger.warn("outbound SMS disabled - no Twilio client");
    return;
  }

  const segments = splitReply(body, MAX_REPLY_LENGTH);
  for (const body of segments) {
    await twilioClient.messages.create({ body, from, to });
  }

  logger.debug({ to, segments: segments.length }, "outbound SMS sent");
}

function splitReply(reply: string, maxLength: number): string[] {
  if (reply.length <= maxLength) return [reply];

  const segments: string[] = [];
  let remaining = reply.trim();
  while (remaining.length > maxLength) {
    const slice = remaining.slice(0, maxLength);
    const breakPoint =
      Math.max(slice.lastIndexOf("\n"), slice.lastIndexOf(". ")) + 1 ||
      slice.lastIndexOf(" ") + 1 ||
      maxLength;
    segments.push(remaining.slice(0, breakPoint).trim());
    remaining = remaining.slice(breakPoint).trim();
  }
  if (remaining.length > 0) segments.push(remaining);
  return segments;
}
