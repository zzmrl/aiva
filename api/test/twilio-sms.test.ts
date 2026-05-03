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

mock.module("../app/modules/twilio/client", () => ({
  default: { messages: { create: mock() } },
}));

mock.module("../app/config", () => ({
  default: {
    NODE_ENV: "test",
    PUBLIC_HOST: "test.example.com",
    VENICE_API_KEY: "test-key",
    DATABASE_URL: "postgres://test:test@localhost:5432/test",
    TWILIO_ACCOUNT_SID: "AC123",
    TWILIO_AUTH_TOKEN: "auth-token",
  },
}));

const { handleIncomingSms } = await import("../app/modules/twilio/service");

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

    expect(mockEnqueue).toHaveBeenCalledWith(TO, FROM);
  });

  it("always returns empty TwiML", async () => {
    const xml = await handleIncomingSms(TO, FROM, BODY);

    expect(xml).toBe(`<?xml version="1.0" encoding="UTF-8"?><Response/>`);
  });
});
