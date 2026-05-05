import { describe, expect, it, mock, beforeEach } from "bun:test";

const mockCreate = mock(() => Promise.resolve({ id: 1 }));
const mockEnqueue = mock(() => Promise.resolve());

mock.module("../app/modules/message/repository", () => ({
  create: mockCreate,
  findMany: mock(async () => []),
  findById: mock(async () => undefined),
  findByParticipants: mock(async () => []),
  findSystemPhones: mock(async () => []),
  findConversations: mock(async () => []),
  createInboundAndFetchConversation: mock(async () => []),
}));

mock.module("../app/modules/twilio/smsWorker", () => ({
  enqueue: mockEnqueue,
}));

import { handleIncomingSms } from "../app/modules/twilio/service";

const TO = "+15559876543";
const FROM = "+15551234567";
const BODY = "Hello";

describe("handleIncomingSms", () => {
  beforeEach(() => {
    mock.clearAllMocks();
  });

  it("saves inbound message before enqueuing", async () => {
    await handleIncomingSms(TO, FROM, BODY);

    expect(mockCreate).toHaveBeenCalledWith({
      body: BODY,
      receiver: TO,
      sender: FROM,
      direction: "inbound",
    });
    expect(mockCreate.mock.invocationCallOrder[0]).toBeLessThan(
      mockEnqueue.mock.invocationCallOrder[0] ?? 0,
    );
  });

  it("enqueues a job with correct to/from", async () => {
    await handleIncomingSms(TO, FROM, BODY);

    expect(mockEnqueue).toHaveBeenCalledWith(FROM, TO);
  });

  it("always returns empty TwiML", async () => {
    const xml = await handleIncomingSms(TO, FROM, BODY);

    expect(xml).toBe(`<?xml version="1.0" encoding="UTF-8"?><Response/>`);
  });
});
