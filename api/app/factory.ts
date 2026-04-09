import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import cors from "cors";
import helmet from "helmet";
import { existsSync, readFileSync } from "fs";
import { randomBytes } from "crypto";
import { join } from "path";
import { AppError } from "./shared/errors";
import { generalLimiter, twilioLimiter, log } from "./shared/middleware";
import { router as messageRouter } from "./modules/message";
import { router as twilioRouter } from "./modules/twilio";

export function createApp() {
  const app = express();

  app.set("trust proxy", 1);

  // Generate a per-request nonce before helmet runs
  app.use((_req, res, next) => {
    res.locals.nonce = randomBytes(16).toString("base64");
    next();
  });

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          scriptSrc: [
            "'self'",
            (_req, res) => `'nonce-${(res as Response).locals.nonce}'`,
          ],
        },
      },
    }),
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
    // Serve assets but not index.html — the catch-all injects the nonce
    app.use(express.static(publicDir, { index: false }));

    let indexTemplate: string | null = null;
    app.use((_req, res) => {
      indexTemplate ??= readFileSync(join(publicDir, "index.html"), "utf-8");
      const html = indexTemplate.replace(
        /<script/g,
        `<script nonce="${res.locals.nonce}"`,
      );
      res.setHeader("Content-Type", "text/html");
      res.send(html);
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
