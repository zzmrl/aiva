import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import cors from "cors";
import helmet from "helmet";
import createDebug from "debug";
import twilio from "twilio";
import pino from "pino-http";

const app = express();
const PORT = process.env.PORT || 3000;

const debug = createDebug("api");

app.use(helmet());
app.use(cors());
// The following configuration ensures that pino-pretty is activated only in development mode.
const pinoOptions = process.stdout.isTTY
  ? {
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
        },
      },
    }
  : {};
app.use(pino({ ...pinoOptions }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

app.post("/voice", (_req: Request, res: Response) => {
  const twiml = new twilio.twiml.MessagingResponse();

  twiml.say("Message received by Automate It.");

  res.type("text/xml");
  res.send(twiml.toString());
});

app.post("/sms", (_req: Request, res: Response) => {
  const twiml = new twilio.twiml.MessagingResponse();

  twiml.message("Message received by Automate It.");

  res.type("text/xml");
  res.send(twiml.toString());
});

app.get("/messages", (_req: Request, res: Response) => {
  res.json({ message: "AIVA API is running" });
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

const server = app.listen(PORT, () => {
  console.info(`Server is running on port ${PORT}`);
});

/**
 * Gracefully shutdown server
 */
process.on("SIGTERM", () => {
  debug("SIGTERM signal received: closing HTTP server");
  server.close(() => {
    debug("Server closed");
  });
});
