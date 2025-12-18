import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import cors from "cors";
import helmet from "helmet";
import twilio from "twilio";
import pino from "pino-http";
import { insertMessage, getAllMessages } from "./entity/messages";
import { smsCompletion } from "./llm/completions";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  // ensure that pino-pretty is activated only in development
  app.use(
    pino(
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
    ),
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).send();
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

    await insertMessage({
      body: req.body.TranscriptionText,
      to: req.body.To,
      from: req.body.From,
    });

    res.status(201).send();
  });

  app.post("/sms", async (req, res) => {
    if (!req.body.Body || !req.body.From || !req.body.To) {
      res.status(400).send("Missing required fields");
      return;
    }

    await insertMessage({
      body: req.body.Body,
      to: req.body.To,
      from: req.body.From,
    });

    const llmResponse = await smsCompletion(req.body.Body);

    await insertMessage({
      body: llmResponse,
      to: req.body.From,
      from: req.body.To,
    });

    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message(llmResponse);

    res.status(201).type("text/xml").send(twiml.toString());
  });

  app.get("/messages", async (_req: Request, res: Response) => {
    const messages = await getAllMessages();

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
