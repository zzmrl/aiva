import type { RequestHandler } from "express";
import * as service from "./service";
import type { MessagingWebhookBody, VoiceWebhookBody } from "./validation";

export const voice: RequestHandler = async (req, res) => {
  res.sendStatus(200);

  const { data } = req.body as VoiceWebhookBody;

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
      service.handleCallHangup(data.payload);
      break;
  }
};

export const messaging: RequestHandler = async (req, res) => {
  res.sendStatus(200);

  const { data } = req.body as MessagingWebhookBody;

  if (data.event_type === "message.received") {
    await service.handleInboundMessage(data.payload);
  }
};
