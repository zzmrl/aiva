import createDebug from "debug";
import client from "../llm/client";

const debug = createDebug("api:twilio:tts");

export async function textToSpeech(
  text: string,
): Promise<{ pcm: Buffer; sampleRate: number }> {
  debug("TTS request: text length=%d", text.length);
  const response = await client.audio.speech.create({
    model: "tts-kokoro",
    input: text,
    voice: "af_sky",
    response_format: "pcm",
  });
  const arrayBuffer = await response.arrayBuffer();
  debug("TTS response: %d bytes", arrayBuffer.byteLength);
  return { pcm: Buffer.from(arrayBuffer), sampleRate: 24000 };
}
