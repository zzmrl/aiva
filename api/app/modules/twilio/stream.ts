import { WebSocketServer } from "ws";
import type { WebSocket } from "ws";
import type { Server } from "http";
import * as sessionStore from "./sessionStore";
import { voiceCompletion } from "../llm/completions";
import { repository as messageRepository } from "../message";
import appLogger from "../../shared/logger";

const logger = appLogger.child({ module: "twilio:stream" });

const wsToCallSid = new Map<WebSocket, string>();

type SetupEvent = {
  type: "setup";
  callSid: string;
  from: string;
  to: string;
  sessionId: string;
  accountSid: string;
  customParameters: Record<string, string>;
};

type PromptEvent = {
  type: "prompt";
  voicePrompt: string;
  last: boolean;
};

type InterruptEvent = {
  type: "interrupt";
  utteranceUntilInterrupt: string;
  durationUntilInterruptMs: number;
};

type ErrorEvent = {
  type: "error";
  description: string;
  callSid: string;
};

type RelayEvent = SetupEvent | PromptEvent | InterruptEvent | ErrorEvent;

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === "AbortError";
}

export function attachWebSocket(server: Server): void {
  const wss = new WebSocketServer({ server, path: "/twilio/relay" });

  wss.on("connection", (ws) => {
    logger.debug("ConversationRelay WebSocket connection established");

    ws.on("message", async (data) => {
      let msg: RelayEvent;
      try {
        msg = JSON.parse(data.toString());
      } catch (error) {
        logger.debug({ err: error }, "Failed to parse WebSocket message");
        return;
      }

      switch (msg.type) {
        case "setup": {
          logger.debug(
            { callSid: msg.callSid, from: msg.from, to: msg.to },
            "Setup",
          );
          wsToCallSid.set(ws, msg.callSid);
          sessionStore.create(msg.callSid, {
            ws,
            callSid: msg.callSid,
            from: msg.from,
            to: msg.to,
            messages: [],
            abortController: null,
          });
          break;
        }

        case "prompt": {
          if (!msg.last) break;

          const callSid = wsToCallSid.get(ws);
          if (!callSid) {
            logger.debug("prompt: no session found for this WebSocket");
            break;
          }

          const session = sessionStore.get(callSid);
          if (!session) break;

          logger.debug({ callSid, length: msg.voicePrompt.length }, "prompt");

          session.abortController?.abort();
          const abortController = new AbortController();
          session.abortController = abortController;

          const messages = sessionStore.appendMessage(callSid, {
            role: "user",
            content: msg.voicePrompt,
          });

          let fullResponse = "";
          try {
            for await (const chunk of voiceCompletion.stream(messages, {
              signal: abortController.signal,
            })) {
              if (abortController.signal.aborted) break;
              fullResponse += chunk;
              ws.send(
                JSON.stringify({ type: "text", token: chunk, last: false }),
              );
            }

            if (!abortController.signal.aborted) {
              ws.send(JSON.stringify({ type: "text", token: "", last: true }));
              if (fullResponse) {
                sessionStore.appendMessage(callSid, {
                  role: "assistant",
                  content: fullResponse,
                });
              }
            }
          } catch (error: unknown) {
            if (isAbortError(error)) {
              logger.debug({ callSid }, "LLM stream aborted");
            } else {
              logger.error({ callSid, err: error }, "LLM stream error");
            }
          } finally {
            if (session.abortController === abortController) {
              session.abortController = null;
            }
          }
          break;
        }

        case "interrupt": {
          const callSid = wsToCallSid.get(ws);
          if (!callSid) break;

          const session = sessionStore.get(callSid);
          if (!session) break;

          logger.debug({ callSid }, "interrupt");
          session.abortController?.abort();
          session.abortController = null;
          break;
        }

        case "error": {
          logger.error(
            { callSid: msg.callSid, description: msg.description },
            "ConversationRelay error",
          );
          ws.close();
          break;
        }
      }
    });

    ws.on("close", async () => {
      logger.debug("ConversationRelay WebSocket closed");
      wsToCallSid.delete(ws);
      const session = sessionStore.removeByWs(ws);

      if (session?.messages.length) {
        logger.debug(
          { count: session.messages.length, callSid: session.callSid },
          "Saving messages",
        );
        for (const message of session.messages) {
          const isUser = message.role === "user";
          await messageRepository.create({
            sender: isUser ? session.from : session.to,
            receiver: isUser ? session.to : session.from,
            body: message.content?.toString() ?? "",
            direction: isUser ? "inbound" : "outbound",
          });
        }
      }
    });

    ws.on("error", (err) => {
      logger.error({ err }, "ConversationRelay WebSocket error");
      wsToCallSid.delete(ws);
      sessionStore.removeByWs(ws);
    });
  });
}
