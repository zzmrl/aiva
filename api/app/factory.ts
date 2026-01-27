import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import cors from "cors";
import helmet from "helmet";
import twilio from "twilio";
import pino from "pino-http";
import { repository as messageRepository } from "./modules/message";
import {
  createCompletion,
  streamCompletion,
  type CompletionMessage,
} from "./llm/completions";
import Telnyx from "telnyx";
import { TelnyxProvider } from "./providers/telnyx";

const telnyx = new Telnyx();
const telnyxAppId = process.env.PHONE_ACCOUNT_ID ?? "default-changeme";
const phoneProvider = new TelnyxProvider(telnyx, telnyxAppId);

type CallWebhookEvent =
  | Telnyx.CallInitiatedWebhookEvent
  | Telnyx.CallAnsweredWebhookEvent
  | Telnyx.TranscriptionWebhookEvent
  | Telnyx.CallHangupWebhookEvent;

type MessageWebhookEvent = Telnyx.InboundMessageWebhookEvent;

export function createApp() {
  const app = express();
  const conversations = new Map<string, CompletionMessage[]>();

  const logger = () =>
    pino(
      // ensure that pino-pretty is activated only in development
      process.stdout.isTTY
        ? {
            transport: {
              target: "pino-pretty",
              options: {
                colorize: true,
              },
            },
          }
        : {},
    );

  app.use(
    helmet(),
    cors(),
    logger(),
    express.json(),
    express.urlencoded({ extended: true }),
  );

  app.get("/health", (_req, res) => {
    res.sendStatus(200);
  });

  app.post("/webhooks/voice", async (req, res) => {
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
        await phoneProvider.answerCall(callControlId);
        break;
      case "call.answered":
        conversations.set(callControlId, []);
        await phoneProvider.startTranscription(callControlId);
        await phoneProvider.speak(
          callControlId,
          "Hello! I am Automate It Virtual Assistant. How can I help you today?",
        );
        break;
      case "call.transcription": {
        const { transcript = "", is_final } =
          data.payload.transcription_data ?? {};
        if (!is_final) {
          return;
        }

        const history = conversations.get(callControlId) ?? [];
        history.push({
          role: "user",
          content: transcript,
        });

        let fullResponse = "";
        let firstChunk = true;
        for await (const chunk of streamCompletion(history)) {
          fullResponse += chunk;
          if (firstChunk && fullResponse.includes(".")) {
            firstChunk = false;
            await phoneProvider.speak(callControlId, fullResponse);
          }
        }

        history.push({
          role: "assistant",
          content: fullResponse,
        });
        conversations.set(callControlId, history);
        break;
      }
      case "call.hangup":
        conversations.delete(callControlId);
        break;
    }
  });

  async function receiveMessage(to: string, from: string, body: string) {
    if (!to || !from || !body) {
      throw new Error("Missing required fields");
    }

    const message = await messageRepository.create({
      body,
      receiver: to,
      sender: from,
    });
    const conversationHistory = await messageRepository.findConversation(
      message.sender,
      message.receiver,
      30,
    );
    const llmResponse = await createCompletion(
      conversationHistory.map((message) => ({
        role: message.sender === message.receiver ? "assistant" : "user",
        content: message.body,
      })),
    );
    await messageRepository.create({
      body: llmResponse,
      receiver: message.sender,
      sender: message.receiver,
    });

    return llmResponse;
  }

  app.post("/webhooks/messaging", async (req, res) => {
    res.sendStatus(200);

    const { data }: MessageWebhookEvent = req.body;
    if (!data?.payload) {
      throw new Error("Missing expected payload");
    }

    if (data.event_type === "message.received") {
      const { to, from, text } = data.payload;

      if (!to?.[0]?.phone_number || !from?.phone_number || !text) {
        throw new Error("Missing required fields");
      }
      receiveMessage(to[0].phone_number, from.phone_number, text);
    }
  });

  app.post("/voice", (_req, res) => {
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say("Hello. Please leave a message for Automate It.");
    twiml.record({
      transcribe: true,
      transcribeCallback: "/voiceTranscribe",
      maxLength: 30,
    });
    twiml.hangup();
    res.type("text/xml").send(twiml.toString());
  });

  app.post("/voiceTranscribe", async (req, res) => {
    if (!req.body.TranscriptionText || !req.body.From || !req.body.To) {
      res.status(400).send("Missing required fields");
      return;
    }
    await messageRepository.create({
      body: req.body.TranscriptionText,
      receiver: req.body.To,
      sender: req.body.From,
    });
    res.status(201).send();
  });

  app.post("/sms", async (req, res) => {
    if (!req.body.Body || !req.body.From || !req.body.To) {
      res.status(400).send("Missing required fields");
      return;
    }

    const llmResponse = await receiveMessage(
      req.body.To,
      req.body.From,
      req.body.Body,
    );
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message(llmResponse);
    res.status(201).type("text/xml").send(twiml.toString());
  });

  app.get("/messages", async (_req, res) => {
    const messages = await messageRepository.findMany();
    res.json(messages);
  });

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    res.log.error(err.stack);
    res.status(500).json({
      error: "Something went wrong!",
    });
  });

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: "Resource not found" });
  });

  return app;
}
