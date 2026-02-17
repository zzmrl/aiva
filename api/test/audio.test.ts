import { describe, expect, it } from "bun:test";
import {
  linearToMulaw,
  downsample,
  pcmToMulawChunks,
} from "../modules/twilio/audio";

describe("linearToMulaw", () => {
  it("should encode silence (0) to mulaw", () => {
    const result = linearToMulaw(0);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(255);
  });

  it("should encode max positive sample", () => {
    const result = linearToMulaw(32767);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(255);
  });

  it("should encode max negative sample", () => {
    const result = linearToMulaw(-32768);
    expect(result).toBeGreaterThanOrEqual(0);
    expect(result).toBeLessThanOrEqual(255);
  });

  it("should produce different values for positive and negative samples", () => {
    const positive = linearToMulaw(1000);
    const negative = linearToMulaw(-1000);
    expect(positive).not.toBe(negative);
  });

  it("should produce consistent output for same input", () => {
    const result1 = linearToMulaw(5000);
    const result2 = linearToMulaw(5000);
    expect(result1).toBe(result2);
  });
});

describe("downsample", () => {
  it("should return same array when source and target rates match", () => {
    const input = new Int16Array([100, 200, 300]);
    const result = downsample(input, 8000, 8000);
    expect(result).toEqual(input);
  });

  it("should reduce sample count when downsampling", () => {
    const input = new Int16Array(24000);
    for (let i = 0; i < input.length; i++) {
      input[i] = Math.round(Math.sin(i / 100) * 10000);
    }
    const result = downsample(input, 24000, 8000);
    expect(result.length).toBe(8000);
  });

  it("should halve the samples when downsampling 2:1", () => {
    const input = new Int16Array([100, 200, 300, 400, 500, 600]);
    const result = downsample(input, 16000, 8000);
    expect(result.length).toBe(3);
  });
});

describe("pcmToMulawChunks", () => {
  it("should return base64-encoded chunks", () => {
    // 160 samples at 8kHz = 20ms = 1 chunk, so 480 samples at 24kHz = 1 chunk
    const pcm = Buffer.alloc(480 * 2); // 480 16-bit samples
    const chunks = pcmToMulawChunks(pcm, 24000);
    expect(chunks.length).toBe(1);
    // Verify base64 encoding
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    expect(() => Buffer.from(chunks[0]!, "base64")).not.toThrow();
  });

  it("should split into multiple chunks for longer audio", () => {
    // 2400 samples at 24kHz = 800 samples at 8kHz = 5 chunks of 160
    const pcm = Buffer.alloc(2400 * 2);
    const chunks = pcmToMulawChunks(pcm, 24000);
    expect(chunks.length).toBe(5);
  });

  it("should handle partial last chunk", () => {
    // 600 samples at 24kHz = 200 samples at 8kHz = 1 full + 1 partial chunk
    const pcm = Buffer.alloc(600 * 2);
    const chunks = pcmToMulawChunks(pcm, 24000);
    expect(chunks.length).toBe(2);
  });
});
