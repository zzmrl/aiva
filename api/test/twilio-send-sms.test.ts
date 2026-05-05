import { describe, expect, it, mock, beforeEach } from "bun:test";

const mockMessagesCreate = mock(() => Promise.resolve({ sid: "SM1" }));

mock.module("../app/modules/twilio/client", () => ({
  default: { messages: { create: mockMessagesCreate } },
}));

import { sendSms } from "../app/modules/twilio/service";

const TO = "+15559876543";
const FROM = "+15551234567";

function getSentBodies(): string[] {
  return mockMessagesCreate.mock.calls.map(
    (call) => (call as unknown as [{ body: string }])[0].body,
  );
}

describe("sendSms reply splitting", () => {
  beforeEach(() => {
    mockMessagesCreate.mockClear();
  });

  it("sends a single message when under the limit", async () => {
    await sendSms(TO, FROM, "Hello there");

    expect(mockMessagesCreate).toHaveBeenCalledTimes(1);
    expect(mockMessagesCreate).toHaveBeenCalledWith({
      body: "Hello there",
      from: FROM,
      to: TO,
    });
  });

  it("sends a single message when exactly at the limit", async () => {
    const body = "x".repeat(1500);

    await sendSms(TO, FROM, body);

    expect(mockMessagesCreate).toHaveBeenCalledTimes(1);
    expect(getSentBodies()[0]).toBe(body);
  });

  it("splits on a newline boundary", async () => {
    const first = "a".repeat(1000) + "\n";
    const second = "b".repeat(800);

    await sendSms(TO, FROM, first + second);

    const bodies = getSentBodies();
    expect(bodies).toEqual([first.trim(), second]);
  });

  it("splits on a sentence boundary when no newline is present", async () => {
    const sentence1 = "a".repeat(1000) + ". ";
    const sentence2 = "b".repeat(800) + ".";

    await sendSms(TO, FROM, sentence1 + sentence2);

    const bodies = getSentBodies();
    expect(bodies.length).toBe(2);
    expect(bodies[0]).toBe(sentence1.trim());
    expect(bodies[1]).toBe(sentence2);
  });

  it("falls back to a word boundary when no sentence boundary fits", async () => {
    const longWordless = "a".repeat(1499);
    const tail = "tailword";
    const body = longWordless + " " + tail;

    await sendSms(TO, FROM, body);

    const bodies = getSentBodies();
    expect(bodies).toEqual([longWordless, tail]);
  });

  it("hard-cuts at maxLength when no boundary exists", async () => {
    const body = "a".repeat(1600);

    await sendSms(TO, FROM, body);

    const bodies = getSentBodies();
    expect(bodies).toEqual(["a".repeat(1500), "a".repeat(100)]);
  });

  it("preserves segment order and content across many splits", async () => {
    const markers = ["ALPHA", "BRAVO", "CHARLIE", "DELTA"];
    const filler = "x".repeat(1490);
    const body = markers.map((m) => `${m}${filler}.\n`).join("");

    await sendSms(TO, FROM, body);

    const bodies = getSentBodies();
    expect(bodies.length).toBeGreaterThanOrEqual(markers.length);
    const positions = markers.map((m) =>
      bodies.findIndex((b) => b.includes(m)),
    );
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect(positions).toEqual([...positions].sort((a, b) => a - b));
    for (const b of bodies) {
      expect(b.length).toBeLessThanOrEqual(1500);
    }
  });

  it("sends each segment with the same to/from", async () => {
    const body = "a".repeat(1600);

    await sendSms(TO, FROM, body);

    for (const call of mockMessagesCreate.mock.calls) {
      const arg = (call as unknown as [{ from: string; to: string }])[0];
      expect(arg.from).toBe(FROM);
      expect(arg.to).toBe(TO);
    }
  });
});
