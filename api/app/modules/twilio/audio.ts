const MULAW_BIAS = 0x84;
const MULAW_CLIP = 32635;

/**
 * Encode a 16-bit linear PCM sample to 8-bit mu-law (ITU-T G.711).
 */
export function linearToMulaw(sample: number): number {
  const sign = sample < 0 ? 0x80 : 0;
  let magnitude = Math.min(Math.abs(sample), MULAW_CLIP);

  magnitude += MULAW_BIAS;

  let exponent = 7;
  for (
    let expMask = 0x4000;
    (magnitude & expMask) === 0 && exponent > 0;
    exponent--, expMask >>= 1
  ) {
    // find segment
  }

  const mantissa = (magnitude >> (exponent + 3)) & 0x0f;
  const mulawByte = ~(sign | (exponent << 4) | mantissa) & 0xff;

  return mulawByte;
}

/**
 * Downsample PCM audio using linear interpolation.
 */
export function downsample(
  pcm: Int16Array,
  sourceRate: number,
  targetRate: number,
): Int16Array {
  if (sourceRate === targetRate) return pcm;

  const ratio = sourceRate / targetRate;
  const outputLength = Math.floor(pcm.length / ratio);
  const output = new Int16Array(outputLength);

  for (let i = 0; i < outputLength; i++) {
    const srcIndex = i * ratio;
    const lower = Math.floor(srcIndex);
    const upper = Math.min(lower + 1, pcm.length - 1);
    const fraction = srcIndex - lower;
    output[i] = Math.round(
      (pcm[lower] ?? 0) * (1 - fraction) + (pcm[upper] ?? 0) * fraction,
    );
  }

  return output;
}

const FRAME_SIZE = 160; // 20ms at 8kHz

/**
 * Convert raw PCM buffer to base64-encoded mu-law chunks suitable for Twilio.
 * Each chunk is 160 bytes (20ms at 8kHz).
 */
export function pcmToMulawChunks(pcm: Buffer, sourceRate: number): string[] {
  const samples = new Int16Array(
    pcm.buffer,
    pcm.byteOffset,
    pcm.byteLength / 2,
  );
  const downsampled = downsample(samples, sourceRate, 8000);

  const mulaw = new Uint8Array(downsampled.length);
  for (let i = 0; i < downsampled.length; i++) {
    mulaw[i] = linearToMulaw(downsampled[i] ?? 0);
  }

  const chunks: string[] = [];
  for (let offset = 0; offset < mulaw.length; offset += FRAME_SIZE) {
    const end = Math.min(offset + FRAME_SIZE, mulaw.length);
    const frame = mulaw.subarray(offset, end);
    chunks.push(Buffer.from(frame).toString("base64"));
  }

  return chunks;
}
