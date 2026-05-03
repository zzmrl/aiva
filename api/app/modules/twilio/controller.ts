import type { RequestHandler } from "express";
import * as service from "./service";
import type { SmsWebhookRequest } from "./validation";

export const voice: RequestHandler = (_req, res) => {
  const response = service.handleIncomingCall();
  res.type("text/xml").send(response);
};

export const sms: RequestHandler = async (req: SmsWebhookRequest, res) => {
  const { To, From, Body } = req.body;
  const response = await service.handleIncomingSms(To, From, Body);
  res.status(201).type("text/xml").send(response);
};
