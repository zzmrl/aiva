import { WebSocketServer } from "ws";
import type { Server } from "http";
import createDebug from "debug";
import * as sessionStore from "./sessionStore";
import { repository as messageRepository } from "../message";

const debug = createDebug("api:twilio:stream");

type ConnectedEvent = {
  event: "connected";
  protocol: string;
  version: string;
};

type StartEvent = {
  event: "start";
  sequenceNumber: string;
  start: {
    accountSid: string;
    callSid: string;
    streamSid: string;
    tracks: string[];
    mediaFormat: {
      encoding: string;
      sampleRate: number;
      channels: number;
    };
    customParameters: Record<string, string>;
  };
};

type MediaEvent = {
  event: "media";
  sequenceNumber: string;
  media: {
    track: string;
    chunk: string;
    timestamp: string;
    payload: string;
  };
};

type StopEvent = {
  event: "stop";
  sequenceNumber: string;
  stop: {
    accountSid: string;
    callSid: string;
  };
};

type StreamEvent = ConnectedEvent | StartEvent | MediaEvent | StopEvent;

export function attachWebSocket(server: Server): void {
  const wss = new WebSocketServer({ server, path: "/twilio/stream" });

  wss.on("connection", (ws) => {
    debug("WebSocket connection established");

    ws.on("message", async (data) => {
      let msg: StreamEvent;
      try {
        msg = JSON.parse(data.toString());
      } catch (error) {
        debug("Failed to parse WebSocket message: %O", error);
        return;
      }

      switch (msg.event) {
        case "connected":
          debug("Twilio stream connected");
          break;

        case "start": {
          const { callSid, streamSid, customParameters } = msg.start;
          debug("Stream started: callSid=%s streamSid=%s", callSid, streamSid);
          sessionStore.create(callSid, {
            ws,
            streamSid,
            callSid,
            from: customParameters.From ?? "",
            to: customParameters.To ?? "",
            messages: [],
          });
          break;
        }

        case "media":
          // Ignored — transcription handles STT
          break;

        case "stop": {
          const { callSid } = msg.stop;
          debug("Stream stopped: callSid=%s", callSid);
          const session = sessionStore.remove(callSid);

          if (session && session.messages.length > 0) {
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
          break;
        }
      }
    });

    ws.on("close", () => {
      debug("WebSocket connection closed");
      sessionStore.removeByWs(ws);
    });

    ws.on("error", (err) => {
      debug("WebSocket error: %O", err);
      sessionStore.removeByWs(ws);
    });
  });
}

export function sendAudio(callSid: string, base64Chunks: string[]): void {
  const session = sessionStore.get(callSid);
  if (!session) return;

  for (const payload of base64Chunks) {
    session.ws.send(
      JSON.stringify({
        event: "media",
        streamSid: session.streamSid,
        media: { payload },
      }),
    );
  }
}

export function clearAudio(callSid: string): void {
  const session = sessionStore.get(callSid);
  if (!session) return;

  session.ws.send(
    JSON.stringify({
      event: "clear",
      streamSid: session.streamSid,
    }),
  );
}
