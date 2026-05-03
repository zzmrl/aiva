import { WebSocketServer, type WebSocket } from "ws";
import type { Server } from "http";
import * as sessionStore from "./sessionStore";
import { voiceCompletion, type CompletionMessage } from "../llm/completions";
import { repository as messageRepository } from "../message";
import appLogger from "../../shared/logger";

const logger = appLogger.child({ module: "twilio:stream" });

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

async function handleSetup(ws: WebSocket, msg: SetupEvent): Promise<void> {
  logger.debug({ callSid: msg.callSid, from: msg.from, to: msg.to }, "Setup");

  let messages: CompletionMessage[] = [];
  try {
    const history = await messageRepository.findByParticipants(
      msg.from,
      msg.to,
    );
    messages = history.map((m) => ({
      role: m.direction === "inbound" ? "user" : ("assistant" as const),
      content: m.body,
    }));
    if (messages.length) {
      logger.debug(
        { callSid: msg.callSid, count: messages.length },
        "Loaded conversation history",
      );
    }
  } catch (err) {
    logger.error({ callSid: msg.callSid, err }, "Failed to load history");
  }

  sessionStore.create(ws, {
    ws,
    callSid: msg.callSid,
    from: msg.from,
    to: msg.to,
    messages,
    abortController: null,
  });
}

async function handlePrompt(ws: WebSocket, msg: PromptEvent): Promise<void> {
  if (!msg.last) return;

  const session = sessionStore.get(ws);
  if (!session) {
    logger.debug("prompt: no session found for this WebSocket");
    return;
  }

  const { callSid } = session;
  logger.debug({ callSid, length: msg.voicePrompt.length }, "prompt");

  session.abortController?.abort();
  const abortController = new AbortController();
  session.abortController = abortController;

  const messages = sessionStore.appendMessage(ws, {
    role: "user",
    content: msg.voicePrompt,
  });

  const toolCallPhrases = [
    "One moment...",
    "Let me check on that...",
    "Give me just a sec...",
    "Hold on...",
    "Let me look that up...",
  ];
  let toolCallIndex = 0;
  const onToolCall = () => {
    const phrase = toolCallPhrases[toolCallIndex % toolCallPhrases.length];
    toolCallIndex++;
    ws.send(JSON.stringify({ type: "text", token: phrase, last: false }));
  };

  const now = new Date();
  const systemContext = [
    `The caller's phone number is ${session.from}.`,
    `The current date and time is ${now.toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" })}.`,
  ].join(" ");

  let fullResponse = "";
  try {
    for await (const chunk of voiceCompletion.stream(messages, {
      signal: abortController.signal,
      onToolCall,
      systemContext,
    })) {
      if (abortController.signal.aborted) break;
      fullResponse += chunk;
      ws.send(JSON.stringify({ type: "text", token: chunk, last: false }));
    }

    if (!abortController.signal.aborted) {
      ws.send(JSON.stringify({ type: "text", token: "", last: true }));
      if (fullResponse) {
        sessionStore.appendMessage(ws, {
          role: "assistant",
          content: fullResponse,
        });
      }
    }
  } catch (err: unknown) {
    if (isAbortError(err)) {
      logger.debug({ callSid }, "LLM stream aborted");
    } else {
      logger.error({ callSid, err }, "LLM stream error");
    }
  } finally {
    if (session.abortController === abortController) {
      session.abortController = null;
    }
  }
}

function handleInterrupt(ws: WebSocket): void {
  const session = sessionStore.get(ws);
  if (!session) return;

  logger.debug({ callSid: session.callSid }, "interrupt");
  session.abortController?.abort();
  session.abortController = null;
}

function handleRelayError(ws: WebSocket, msg: ErrorEvent): void {
  logger.error(
    { callSid: msg.callSid, description: msg.description },
    "ConversationRelay error",
  );
  ws.close();
}

async function handleClose(ws: WebSocket): Promise<void> {
  logger.debug("ConversationRelay WebSocket closed");
  const session = sessionStore.remove(ws);

  if (!session?.messages.length) return;

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

export function attachWebSocket(server: Server): WebSocketServer {
  const wss = new WebSocketServer({ server, path: "/twilio/relay" });

  wss.on("connection", (ws) => {
    logger.debug("ConversationRelay WebSocket connection established");

    ws.on("message", async (data) => {
      let msg: RelayEvent;
      try {
        msg = JSON.parse(data.toString());
      } catch (err) {
        logger.debug({ err }, "Failed to parse WebSocket message");
        return;
      }

      switch (msg.type) {
        case "setup":
          return await handleSetup(ws, msg);
        case "prompt":
          return handlePrompt(ws, msg);
        case "interrupt":
          return handleInterrupt(ws);
        case "error":
          return handleRelayError(ws, msg);
      }
    });

    ws.on("close", () => handleClose(ws));

    ws.on("error", (err) => {
      logger.error({ err }, "ConversationRelay WebSocket error");
      sessionStore.remove(ws);
    });
  });

  return wss;
}
