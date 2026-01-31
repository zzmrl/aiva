import type { RequestHandler } from "express";
import { markEventProcessed } from "./dedup";
import * as service from "./service";
import type { MessagingWebhookBody, VoiceWebhookBody } from "./validation";

export const voice: RequestHandler = async (req, res) => {
  res.sendStatus(200);

  const { data } = req.body as VoiceWebhookBody;

  if (!(await markEventProcessed(data.id))) {
    return;
  }

  switch (data.event_type) {
    case "call.initiated":
      await service.handleCallInitiated(data.payload);
      break;
    case "call.answered":
      await service.handleCallAnswered(data.payload);
      break;
    case "call.transcription":
      await service.handleTranscription(data.payload);
      break;
    case "call.hangup":
      await service.handleCallHangup(data.payload);
      break;
  }
};

export const messaging: RequestHandler = async (req, res) => {
  res.sendStatus(200);

  const { data } = req.body as MessagingWebhookBody;

  if (!(await markEventProcessed(data.id))) {
    return;
  }

  if (data.event_type === "message.received") {
    await service.handleInboundMessage(data.payload);
  }
};
