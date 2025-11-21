import express, { type Request, type Response } from "express";
import cors from "cors";
import helmet from "helmet";
import debug from "debug";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/api", (_req: Request, res: Response) => {
  res.json({ message: "AIVA API is running" });
});

app.use(
  (err: Error, _req: Request, res: Response, _next: express.NextFunction) => {
    console.error(err.stack);
    res.status(500).json({ error: "Something went wrong!" });
  },
);

app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Route not found" });
});

const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

/**
 * Gracefully shutdown the server
 */
process.on("SIGTERM", () => {
  debug("SIGTERM signal received: closing HTTP server");
  server.close(() => {
    debug("Server closed");
  });
});
