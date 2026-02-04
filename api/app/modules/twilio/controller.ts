import type { RequestHandler } from "express";
import config from "../../config";
import * as service from "./service";
import type { TranscriptionRequest } from "./validation";

export const voice: RequestHandler = (req, res) => {
  const response = service.handleIncomingCall(
    config.PUBLIC_HOST,
    req.body.From,
    req.body.To,
  );
  res.type("text/xml").send(response);
};

export const transcriptionEvents: RequestHandler = async (
  req: TranscriptionRequest,
  res,
) => {
  res.sendStatus(200);
  await service.handleTranscriptionEvent(
    req.body.CallSid,
    req.body.TranscriptionEvent,
    req.body.TranscriptionText,
  );
};

export const sms: RequestHandler = async (req, res) => {
  const response = await service.handleIncomingSms(
    req.body.To,
    req.body.From,
    req.body.Body,
  );
  res.status(201).type("text/xml").send(response);
};
