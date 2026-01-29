import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import cors from "cors";
import helmet from "helmet";
import pino from "pino-http";
import { AppError } from "./shared/errors";
import { router as messageRouter } from "./modules/message";
import { router as twilioRouter } from "./modules/twilio";
import { router as telnyxRouter } from "./modules/telnyx";

const logger = () =>
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
  );

export function createApp() {
  const app = express();

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

  app.use("/messages", messageRouter);
  app.use("/twilio", twilioRouter);
  app.use("/webhooks", telnyxRouter);

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    res.log.error(err.stack);

    if (err instanceof AppError) {
      res.status(err.statusCode).json({
        error: err.message,
      });
      return;
    }

    res.status(500).json({
      error: "Something went wrong!",
    });
  });
  app.use((_req, res) => {
    res.status(404).json({ error: "Resource not found" });
  });

  return app;
}
