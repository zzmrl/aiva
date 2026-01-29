import type { RequestHandler } from "express";
import type Telnyx from "telnyx";
import * as service from "./service";

type CallWebhookEvent =
  | Telnyx.CallInitiatedWebhookEvent
  | Telnyx.CallAnsweredWebhookEvent
  | Telnyx.TranscriptionWebhookEvent
  | Telnyx.CallHangupWebhookEvent;

type MessageWebhookEvent = Telnyx.InboundMessageWebhookEvent;

export const voice: RequestHandler = async (req, res) => {
  res.sendStatus(200);

  const { data }: CallWebhookEvent = req.body;
  if (!data?.payload) {
    throw new Error("Missing expected payload");
  }

  const callControlId = data.payload.call_control_id;
  if (!callControlId) {
    throw new Error("Missing expected call control ID");
  }

  switch (data.event_type) {
    case "call.initiated":
      await service.handleCallInitiated(callControlId);
      break;
    case "call.answered":
      await service.handleCallAnswered(callControlId);
      break;
    case "call.transcription":
      await service.handleTranscription(data.payload, callControlId);
      break;
    case "call.hangup":
      service.handleCallHangup(callControlId);
      break;
  }
};

export const messaging: RequestHandler = async (req, res) => {
  res.sendStatus(200);

  const { data }: MessageWebhookEvent = req.body;
  if (!data?.payload) {
    throw new Error("Missing expected payload");
  }

  if (data.event_type === "message.received") {
    await service.handleInboundMessage(data.payload);
  }
};
