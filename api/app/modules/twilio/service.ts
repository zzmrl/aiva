import createDebug from "debug";
import * as messageService from "../message/service";
import { defaultCompletion } from "../llm/completions";
import * as sessionStore from "./sessionStore";
import { textToSpeech } from "./tts";
import { pcmToMulawChunks } from "./audio";
import { sendAudio, clearAudio } from "./stream";
import twilio from "twilio";

const debug = createDebug("api:twilio:service");

export function handleIncomingCall(
  host: string,
  from: string,
  to: string,
): string {
  debug("Incoming call: from=%s to=%s host=%s", from, to, host);
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
  debug("Incoming SMS: from=%s to=%s body length=%d", from, to, body.length);
  const twiml = new twilio.twiml.MessagingResponse();

  try {
    const message = await messageService.replyToMessage(to, from, body);
    debug("SMS reply sent: to=%s length=%d", from, message.length);
    twiml.message(message);
  } catch (error) {
    debug("Failed to handle SMS from %s: %O", from, error);
    twiml.message(
      "Sorry, I'm having trouble right now. Please try again later.",
    );
  }

  return twiml.toString();
}

export async function handleTranscriptionEvent(
  callSid: string,
  event: string,
  text?: string,
): Promise<void> {
  debug("Transcription event: callSid=%s event=%s", callSid, event);
  if (event !== "transcription-content" || !text) {
    return;
  }

  debug("Transcription text: callSid=%s length=%d", callSid, text.length);
  const messages = sessionStore.appendMessage(callSid, {
    role: "user",
    content: text,
  });

  if (messages.length === 0) {
    return;
  }

  try {
    let fullResponse = "";
    let firstChunk = true;
    for await (const chunk of defaultCompletion.stream(messages)) {
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

      sessionStore.appendMessage(callSid, {
        role: "assistant",
        content: fullResponse,
      });
    }
  } catch (error) {
    debug(
      "Failed to generate voice response for callSid=%s: %O",
      callSid,
      error,
    );
  }
}
