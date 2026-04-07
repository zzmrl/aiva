import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import cors from "cors";
import helmet from "helmet";
import { existsSync } from "fs";
import { join } from "path";
import { AppError } from "./shared/errors";
import { generalLimiter, twilioLimiter, log } from "./shared/middleware";
import { router as messageRouter } from "./modules/message";
import { router as twilioRouter } from "./modules/twilio";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);

  app.use(
    helmet(),
    cors(),
    generalLimiter,
    log(),
    express.json({ limit: "1mb" }),
    express.urlencoded({ extended: true, limit: "1mb" }),
  );

  app.get("/health", (_req, res) => {
    res.sendStatus(200);
  });

  app.use("/messages", messageRouter);
  app.use("/twilio", twilioLimiter, twilioRouter);

  const publicDir = join(import.meta.dir, "../public");
  if (existsSync(publicDir)) {
    app.use(express.static(publicDir));
    app.use((_req, res) => {
      res.sendFile(join(publicDir, "index.html"));
    });
  } else {
    app.use((_req, res) => {
      res.status(404).json({ error: "Resource not found" });
    });
  }

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

  return app;
}
