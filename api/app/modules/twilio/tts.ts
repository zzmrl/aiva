import client from "../llm/client";

export async function textToSpeech(
  text: string,
): Promise<{ pcm: Buffer; sampleRate: number }> {
  const response = await client.audio.speech.create({
    model: "tts-kokoro",
    input: text,
    voice: "af_sky",
    response_format: "pcm",
  });
  const arrayBuffer = await response.arrayBuffer();
  return { pcm: Buffer.from(arrayBuffer), sampleRate: 24000 };
}
