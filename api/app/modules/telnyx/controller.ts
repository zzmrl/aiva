import type { RequestHandler } from "express";
import type Telnyx from "telnyx";
import * as service from "./service";
import type { MessagingWebhookBody, VoiceWebhookBody } from "./validation";

type TranscriptionPayload = NonNullable<
  Telnyx.TranscriptionWebhookEvent["data"]
>["payload"];

export const voice: RequestHandler = async (req, res) => {
  res.sendStatus(200);

  const { data } = req.body as VoiceWebhookBody;
  const callControlId = data.payload.call_control_id;

  switch (data.event_type) {
    case "call.initiated":
      await service.handleCallInitiated(callControlId);
      break;
    case "call.answered":
      await service.handleCallAnswered(callControlId);
      break;
    case "call.transcription":
      // Transcription payload has additional fields beyond the validated schema
      await service.handleTranscription(
        req.body.data.payload as TranscriptionPayload,
        callControlId,
      );
      break;
    case "call.hangup":
      service.handleCallHangup(callControlId);
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
