import type { RequestHandler } from "express";
import twilio from "twilio";
import * as service from "./service";

export const voice: RequestHandler = (_req, res) => {
  const twiml = new twilio.twiml.VoiceResponse();
  twiml.say("Hello. Please leave a message for Automate It.");
  twiml.record({
    transcribe: true,
    transcribeCallback: "/voiceTranscribe",
    maxLength: 30,
  });
  twiml.hangup();
  res.type("text/xml").send(twiml.toString());
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
  const reply = await service.handleIncomingSms(
    req.body.To,
    req.body.From,
    req.body.Body,
  );
  const twiml = new twilio.twiml.MessagingResponse();
  twiml.message(reply);
  res.status(201).type("text/xml").send(twiml.toString());
};
