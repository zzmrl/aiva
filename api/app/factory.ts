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

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(
    pino({
      // ensure that pino-pretty is activated only in development
      ...(process.stdout.isTTY
        ? {
            transport: {
              target: "pino-pretty",
              options: {
                colorize: true,
              },
            },
          }
        : {}),
    }),
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({
      status: "ok",
      timestamp: new Date().toISOString(),
    });
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
    if (!req.body.TranscriptionText || !req.body.From) {
      res.status(400).send("Missing required fields");
      return;
    }

    await insertMessage({
      body: req.body.TranscriptionText,
      phoneNumber: req.body.From,
    });

    res.status(201).send();
  });

  app.post("/sms", async (req, res) => {
    if (!req.body.Body || !req.body.From) {
      res.status(400).send("Missing required fields");
      return;
    }

    await insertMessage({
      body: req.body.Body,
      phoneNumber: req.body.From,
    });

    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message("Message received by Automate It.");

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
