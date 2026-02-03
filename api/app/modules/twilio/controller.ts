import type { RequestHandler } from "express";
import * as service from "./service";

export const voice: RequestHandler = (_req, res) => {
  const response = service.handleIncomingCall();
  res.type("text/xml").send(response);
};

export const transcription: RequestHandler = async (req, res) => {
  await service.handleTranscription(
    req.body.To,
    req.body.From,
    req.body.TranscriptionText,
  );
  res.status(201).send();
};

export const sms: RequestHandler = async (req, res) => {
  const response = await service.handleIncomingSms(
    req.body.To,
    req.body.From,
    req.body.Body,
  );
  res.status(201).type("text/xml").send(response);
};
