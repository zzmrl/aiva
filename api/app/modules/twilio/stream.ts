import { WebSocketServer } from "ws";
import type { WebSocket } from "ws";
import type { Server } from "http";
import createDebug from "debug";
import * as sessionStore from "./sessionStore";
import { defaultCompletion } from "../llm/completions";
import { repository as messageRepository } from "../message";

const debug = createDebug("api:twilio:stream");

// Local map from WebSocket to callSid for non-destructive lookup
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
    debug("ConversationRelay WebSocket connection established");

    ws.on("message", async (data) => {
      let msg: RelayEvent;
      try {
        msg = JSON.parse(data.toString());
      } catch (error) {
        debug("Failed to parse WebSocket message: %O", error);
        return;
      }

      switch (msg.type) {
        case "setup": {
          debug("Setup: callSid=%s from=%s to=%s", msg.callSid, msg.from, msg.to);
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
            debug("prompt: no session found for this WebSocket");
            break;
          }

          const session = sessionStore.get(callSid);
          if (!session) break;

          debug("prompt: callSid=%s length=%d", callSid, msg.voicePrompt.length);

          // Abort any in-flight LLM stream
          session.abortController?.abort();
          const controller = new AbortController();
          session.abortController = controller;

          const messages = sessionStore.appendMessage(callSid, {
            role: "user",
            content: msg.voicePrompt,
          });

          let fullResponse = "";
          try {
            for await (const chunk of defaultCompletion.stream(messages, { signal: controller.signal })) {
              if (controller.signal.aborted) break;
              fullResponse += chunk;
              ws.send(JSON.stringify({ type: "text", token: chunk, last: false }));
            }

            if (!controller.signal.aborted) {
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
              debug("LLM stream aborted: callSid=%s", callSid);
            } else {
              debug("LLM stream error: callSid=%s %O", callSid, error);
            }
          } finally {
            if (session.abortController === controller) {
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

          debug("interrupt: callSid=%s", callSid);
          session.abortController?.abort();
          session.abortController = null;
          break;
        }

        case "error": {
          debug("ConversationRelay error: callSid=%s description=%s", msg.callSid, msg.description);
          ws.close();
          break;
        }
      }
    });

    ws.on("close", async () => {
      debug("ConversationRelay WebSocket closed");
      wsToCallSid.delete(ws);
      const session = sessionStore.removeByWs(ws);

      if (session?.messages.length) {
        debug("Saving %d messages for callSid=%s", session.messages.length, session.callSid);
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
      debug("ConversationRelay WebSocket error: %O", err);
      wsToCallSid.delete(ws);
      sessionStore.removeByWs(ws);
    });
  });
}
