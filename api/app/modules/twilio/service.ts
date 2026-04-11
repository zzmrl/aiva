import * as messageService from "../message/service";
import twilioClient from "./client";
import twilio from "twilio";
import appLogger from "../../shared/logger";
import config from "../../config";

const logger = appLogger.child({ module: "twilio:service" });

export function handleIncomingCall(): string {
  logger.debug("Incoming call");
  const twiml = new twilio.twiml.VoiceResponse();

  const connect = twiml.connect();
  connect.conversationRelay({
    url: `wss://${config.PUBLIC_HOST}/twilio/relay`,
    welcomeGreeting: "Hey it's Ava! Whats up?",
    voice: "yM93hbw8Qtvdma2wCnJG",
  });

  return twiml.toString();
}

const getSyncTimeoutMs = () =>
  Number(process.env.SMS_SYNC_TIMEOUT_MS) || 10_000;

export async function handleIncomingSms(
  to: string,
  from: string,
  body: string,
): Promise<string> {
  logger.debug({ from, to, length: body.length }, "handleIncomingSms");

  const replyPromise = messageService.replyToMessage(to, from, body);
  const timeout = new Promise<null>((resolve) =>
    setTimeout(() => resolve(null), getSyncTimeoutMs()),
  );

  const result = await Promise.race([replyPromise, timeout]);

  if (result !== null) {
    logger.debug({ length: result.length }, "handleIncomingSms: sync reply");
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message(result);
    return twiml.toString();
  }

  logger.debug("handleIncomingSms: timed out, falling back to async");
  void replyPromise
    .then(async (reply) => {
      logger.debug(
        { length: reply.length },
        "handleIncomingSms: async reply ready",
      );
      if (!twilioClient) {
        logger.warn("outbound SMS disabled — no Twilio client");
        return;
      }
      await twilioClient.messages.create({ body: reply, from: to, to: from });
      logger.debug({ to: from }, "handleIncomingSms: async outbound SMS sent");
    })
    .catch((err) => {
      logger.error({ from, err }, "handleIncomingSms: async reply failed");
    });

  const twiml = new twilio.twiml.MessagingResponse();
  twiml.message("One moment...");
  return twiml.toString();
}
