import type { RequestHandler } from "express";
import config from "../../config";
import * as service from "./service";
import type { VoiceWebhookRequest, SmsWebhookRequest } from "./validation";

export const voice: RequestHandler = (req: VoiceWebhookRequest, res) => {
  const response = service.handleIncomingCall(config.PUBLIC_HOST);
  res.type("text/xml").send(response);
};

export const sms: RequestHandler = async (req: SmsWebhookRequest, res) => {
  const response = await service.handleIncomingSms(
    req.body.To,
    req.body.From,
    req.body.Body,
  );
  res.status(201).type("text/xml").send(response);
};
