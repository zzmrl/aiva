import * as messageService from "../message/service";
import { streamCompletion } from "../llm/repository";
import * as sessions from "./sessions";
import { textToSpeech } from "./tts";
import { pcmToMulawChunks } from "./audio";
import { sendAudio, clearAudio } from "./stream";
import twilio from "twilio";

export function handleIncomingCall(
  host: string,
  from: string,
  to: string,
): string {
  const twiml = new twilio.twiml.VoiceResponse();

  const start = twiml.start();
  start.transcription({
    statusCallbackUrl: `https://${host}/twilio/transcription-events`,
    track: "inbound_track",
    partialResults: false,
  });

  twiml.say("Hey it's Aiva! How can I help you today?");

  const connect = twiml.connect();
  const stream = connect.stream({ url: `wss://${host}/twilio/stream` });
  stream.parameter({ name: "From", value: from });
  stream.parameter({ name: "To", value: to });

  return twiml.toString();
}

export async function handleIncomingSms(
  to: string,
  from: string,
  body: string,
): Promise<string> {
  const message = await messageService.handleInboundMessage(to, from, body);
  const twiml = new twilio.twiml.MessagingResponse();
  twiml.message(message);

  return twiml.toString();
}

export async function handleTranscriptionEvent(
  callSid: string,
  event: string,
  text?: string,
): Promise<void> {
  if (event !== "transcription-content" || !text) {
    return;
  }

  const messages = sessions.appendMessage(callSid, {
    role: "user",
    content: text,
  });

  if (messages.length === 0) {
    return;
  }

  let fullResponse = "";
  let firstChunk = true;
  for await (const chunk of streamCompletion(messages)) {
    fullResponse += chunk;
    if (firstChunk && fullResponse.includes(".")) {
      firstChunk = false;
      clearAudio(callSid);
      const { pcm, sampleRate } = await textToSpeech(fullResponse);
      const chunks = pcmToMulawChunks(pcm, sampleRate);
      sendAudio(callSid, chunks);
    }
  }

  if (fullResponse) {
    if (firstChunk) {
      clearAudio(callSid);
      const { pcm, sampleRate } = await textToSpeech(fullResponse);
      const chunks = pcmToMulawChunks(pcm, sampleRate);
      sendAudio(callSid, chunks);
    }

    sessions.appendMessage(callSid, {
      role: "assistant",
      content: fullResponse,
    });
  }
}
