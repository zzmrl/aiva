import { describe, expect, it, mock, beforeEach, afterAll } from "bun:test";
import type { Message, CreateMessageInput } from "../app/modules/message";

const mockCreate = mock(
  (_input: CreateMessageInput): Promise<Message> =>
    Promise.resolve({
      id: 1,
      receiver: "",
      sender: "",
      body: "",
      direction: "inbound",
      created: new Date(),
    }),
);
const mockFindMany = mock(() => Promise.resolve<Message[]>([]));
const mockFindConversation = mock(() => Promise.resolve<Message[]>([]));

const mockCreateCompletion = mock((_messages: unknown[]) =>
  Promise.resolve("Mocked text response"),
);

mock.module("../app/modules/message/repository", () => ({
  create: mockCreate,
  findMany: mockFindMany,
  findConversation: mockFindConversation,
  findById: mock(() => Promise.resolve(undefined)),
  getMessagesByPhone: mock(() => Promise.resolve([])),
}));

mock.module("../app/db", () => ({
  sql: mock(() => Promise.resolve([])),
}));

const mockRedisStore = new Map<string, string>();
const mockRedisGet = mock((key: string) =>
  Promise.resolve(mockRedisStore.get(key) ?? null),
);
const mockRedisSet = mock((key: string, value: string) => {
  mockRedisStore.set(key, value);
  return Promise.resolve();
});
const mockRedisDel = mock((key: string) => {
  mockRedisStore.delete(key);
  return Promise.resolve();
});
const mockRedisExpire = mock(() => Promise.resolve());
const mockRedisSend = mock(
  (cmd: string, args: [string, string, ...string[]]) => {
    if (cmd === "SET" && args.includes("NX")) {
      const key = args[0];
      if (mockRedisStore.has(key)) {
        return Promise.resolve(null);
      }
      mockRedisStore.set(key, args[1]);
      return Promise.resolve("OK");
    }
    return Promise.resolve(null);
  },
);

mock.module("../app/shared/redis", () => ({
  redis: {
    get: mockRedisGet,
    set: mockRedisSet,
    del: mockRedisDel,
    expire: mockRedisExpire,
    send: mockRedisSend,
  },
}));

mock.module("../app/config", () => ({
  default: {
    NODE_ENV: "test",
    PORT: 3000,
    VENICE_API_KEY: "test-key",
    TELNYX_APP_ID: "test-app-id",
    TELNYX_API_KEY: "test-api-key",
    TELNYX_PUBLIC_KEY: "test-public-key",
    DATABASE_HOST: "localhost",
    DATABASE_PORT: 5432,
    DATABASE_USER: "test",
    DATABASE_PASSWORD: "test",
    DATABASE_NAME: "test",
  },
}));

mock.module("../app/modules/llm/client", () => ({
  default: {},
}));

mock.module("../app/modules/llm/repository", () => ({
  createCompletion: mockCreateCompletion,
  streamCompletion: mock(async function* () {}),
}));

const mockAnswerCall = mock(() => Promise.resolve());
const mockStartTranscription = mock(() => Promise.resolve());
const mockSpeak = mock(() => Promise.resolve());

mock.module("../app/modules/telnyx/client", () => ({
  default: {},
}));

mock.module("../app/modules/telnyx/repository", () => ({
  answerCall: mockAnswerCall,
  startTranscription: mockStartTranscription,
  speak: mockSpeak,
  sendSms: mock(() => Promise.resolve()),
}));

const { createApp } = await import("../app");

const app = createApp();

const port = 3001 + Math.floor(Math.random() * 1000);
const server = app.listen(port);
const baseUrl = `http://localhost:${port}`;

afterAll(() => {
  server.close();
});

describe("API Routes", () => {
  beforeEach(() => {
    mockCreate.mockClear();
    mockFindMany.mockClear();
    mockFindConversation.mockClear();
    mockCreateCompletion.mockClear();
    mockAnswerCall.mockClear();
    mockStartTranscription.mockClear();
    mockSpeak.mockClear();
    mockRedisGet.mockClear();
    mockRedisSet.mockClear();
    mockRedisDel.mockClear();
    mockRedisExpire.mockClear();
    mockRedisSend.mockClear();
    mockRedisStore.clear();
  });

  describe("GET /health", () => {
    it("should return health status with 200", async () => {
      const response = await fetch(`${baseUrl}/health`);

      expect(response.status).toBe(200);
    });
  });

  describe("POST /twilio/voice", () => {
    it("should return TwiML voice response", async () => {
      const response = await fetch(`${baseUrl}/twilio/voice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/xml");

      const xml = await response.text();
      expect(xml).toContain("<?xml version");
      expect(xml).toContain("<Response>");
      expect(xml).toContain("<Say>");
      expect(xml).toContain("Hello. Please leave a message for Automate It.");
      expect(xml).toContain("<Record");
      expect(xml).toContain("transcribe");
      expect(xml).toContain("<Hangup/>");
    });
  });

  describe("POST /twilio/transcription", () => {
    it("should save transcription and return 201", async () => {
      mockCreate.mockResolvedValueOnce({
        id: 1,
        receiver: "+15559876543",
        sender: "+15551234567",
        body: "This is a transcribed message",
        direction: "inbound",
        created: new Date(),
      });

      const response = await fetch(`${baseUrl}/twilio/transcription`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          TranscriptionText: "This is a transcribed message",
          From: "+15551234567",
          To: "+15559876543",
        }),
      });

      expect(response.status).toBe(201);
      expect(mockCreate).toHaveBeenCalledWith({
        body: "This is a transcribed message",
        receiver: "+15559876543",
        sender: "+15551234567",
        direction: "inbound",
      });
    });

    it("should return 400 when TranscriptionText is missing", async () => {
      const response = await fetch(`${baseUrl}/twilio/transcription`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          From: "+15551234567",
        }),
      });

      expect(response.status).toBe(400);
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it("should return 400 when From is missing", async () => {
      const response = await fetch(`${baseUrl}/twilio/transcription`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          TranscriptionText: "Test message",
        }),
      });

      expect(response.status).toBe(400);
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it("should return 400 when body is empty", async () => {
      const response = await fetch(`${baseUrl}/twilio/transcription`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "",
      });

      expect(response.status).toBe(400);
    });
  });

  describe("POST /twilio/sms", () => {
    it("should save SMS and return TwiML response with LLM completion", async () => {
      mockCreate.mockResolvedValueOnce({
        id: 1,
        receiver: "+15559876543",
        sender: "+15551234567",
        body: "Hello from SMS",
        direction: "inbound",
        created: new Date(),
      });

      const response = await fetch(`${baseUrl}/twilio/sms`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          Body: "Hello from SMS",
          From: "+15551234567",
          To: "+15559876543",
        }),
      });

      expect(response.status).toBe(201);
      expect(response.headers.get("content-type")).toContain("text/xml");

      const xml = await response.text();
      expect(xml).toContain("<?xml version");
      expect(xml).toContain("<Response>");
      expect(xml).toContain("<Message>");
      expect(xml).toContain("Mocked text response");

      expect(mockCreate).toHaveBeenCalledWith({
        body: "Hello from SMS",
        receiver: "+15559876543",
        sender: "+15551234567",
        direction: "inbound",
      });
      expect(mockFindConversation).toHaveBeenCalledWith(
        "+15551234567",
        "+15559876543",
        30,
      );
      expect(mockCreateCompletion).toHaveBeenCalledWith([]);
    });

    it("should return 400 when Body is missing", async () => {
      const response = await fetch(`${baseUrl}/twilio/sms`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          From: "+15551234567",
          To: "+15559876543",
        }),
      });

      expect(response.status).toBe(400);
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it("should return 400 when From is missing", async () => {
      const response = await fetch(`${baseUrl}/twilio/sms`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          Body: "Test message",
          To: "+15559876543",
        }),
      });

      expect(response.status).toBe(400);
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it("should return 400 when To is missing", async () => {
      const response = await fetch(`${baseUrl}/twilio/sms`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          Body: "Test message",
          From: "+15551234567",
        }),
      });

      expect(response.status).toBe(400);
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it("should handle special characters in SMS body", async () => {
      const specialBody = "Hello! 👋 @user #hashtag & <test>";

      mockCreate.mockResolvedValueOnce({
        id: 1,
        receiver: "+15559876543",
        sender: "+15551234567",
        body: specialBody,
        direction: "inbound",
        created: new Date(),
      });

      const response = await fetch(`${baseUrl}/twilio/sms`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          Body: specialBody,
          From: "+15551234567",
          To: "+15559876543",
        }),
      });

      expect(response.status).toBe(201);
      expect(mockCreate).toHaveBeenCalledWith({
        body: specialBody,
        sender: "+15551234567",
        receiver: "+15559876543",
        direction: "inbound",
      });
    });
  });

  describe("POST /webhooks/voice (Telnyx)", () => {
    it("should return 200 for call.initiated event", async () => {
      const response = await fetch(`${baseUrl}/webhooks/voice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: {
            id: "550e8400-e29b-41d4-a716-446655440000",
            event_type: "call.initiated",
            payload: {
              call_control_id: "test-call-control-id",
              from: "+15551234567",
              to: "+15559876543",
            },
          },
        }),
      });

      expect(response.status).toBe(200);
      expect(mockAnswerCall).toHaveBeenCalledWith("test-call-control-id");
    });

    it("should return 400 when data is missing", async () => {
      const response = await fetch(`${baseUrl}/webhooks/voice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
      expect(mockAnswerCall).not.toHaveBeenCalled();
    });

    it("should return 400 when call_control_id is missing", async () => {
      const response = await fetch(`${baseUrl}/webhooks/voice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: {
            id: "550e8400-e29b-41d4-a716-446655440001",
            event_type: "call.initiated",
            payload: {},
          },
        }),
      });

      expect(response.status).toBe(400);
      expect(mockAnswerCall).not.toHaveBeenCalled();
    });

    it("should return 400 when event_type is missing", async () => {
      const response = await fetch(`${baseUrl}/webhooks/voice`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: {
            id: "550e8400-e29b-41d4-a716-446655440002",
            payload: {
              call_control_id: "test-call-control-id",
            },
          },
        }),
      });

      expect(response.status).toBe(400);
      expect(mockAnswerCall).not.toHaveBeenCalled();
    });
  });

  describe("POST /webhooks/messaging (Telnyx)", () => {
    it("should return 200 for message.received event", async () => {
      mockCreate.mockResolvedValueOnce({
        id: 1,
        receiver: "+15559876543",
        sender: "+15551234567",
        body: "Hello from Telnyx",
        direction: "inbound",
        created: new Date(),
      });

      const response = await fetch(`${baseUrl}/webhooks/messaging`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: {
            id: "660e8400-e29b-41d4-a716-446655440000",
            event_type: "message.received",
            payload: {
              to: [{ phone_number: "+15559876543" }],
              from: { phone_number: "+15551234567" },
              text: "Hello from Telnyx",
            },
          },
        }),
      });

      expect(response.status).toBe(200);
      expect(mockCreate).toHaveBeenCalledWith({
        body: "Hello from Telnyx",
        receiver: "+15559876543",
        sender: "+15551234567",
        direction: "inbound",
      });
    });

    it("should return 400 when data is missing", async () => {
      const response = await fetch(`${baseUrl}/webhooks/messaging`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      expect(response.status).toBe(400);
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it("should return 400 when text is missing", async () => {
      const response = await fetch(`${baseUrl}/webhooks/messaging`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: {
            id: "660e8400-e29b-41d4-a716-446655440001",
            event_type: "message.received",
            payload: {
              to: [{ phone_number: "+15559876543" }],
              from: { phone_number: "+15551234567" },
            },
          },
        }),
      });

      expect(response.status).toBe(400);
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it("should return 400 when from.phone_number is missing", async () => {
      const response = await fetch(`${baseUrl}/webhooks/messaging`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: {
            id: "660e8400-e29b-41d4-a716-446655440002",
            event_type: "message.received",
            payload: {
              to: [{ phone_number: "+15559876543" }],
              from: {},
              text: "Hello",
            },
          },
        }),
      });

      expect(response.status).toBe(400);
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it("should return 400 when to array is empty", async () => {
      const response = await fetch(`${baseUrl}/webhooks/messaging`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: {
            id: "660e8400-e29b-41d4-a716-446655440003",
            event_type: "message.received",
            payload: {
              to: [],
              from: { phone_number: "+15551234567" },
              text: "Hello",
            },
          },
        }),
      });

      expect(response.status).toBe(400);
      expect(mockCreate).not.toHaveBeenCalled();
    });

    it("should handle special characters in message text", async () => {
      const specialText = "Hello! 👋 @user #hashtag & <test>";

      mockCreate.mockResolvedValueOnce({
        id: 1,
        receiver: "+15559876543",
        sender: "+15551234567",
        body: specialText,
        direction: "inbound",
        created: new Date(),
      });

      const response = await fetch(`${baseUrl}/webhooks/messaging`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: {
            id: "660e8400-e29b-41d4-a716-446655440004",
            event_type: "message.received",
            payload: {
              to: [{ phone_number: "+15559876543" }],
              from: { phone_number: "+15551234567" },
              text: specialText,
            },
          },
        }),
      });

      expect(response.status).toBe(200);
      expect(mockCreate).toHaveBeenCalledWith({
        body: specialText,
        receiver: "+15559876543",
        sender: "+15551234567",
        direction: "inbound",
      });
    });
  });

  describe("GET /messages", () => {
    it("should return all messages as JSON", async () => {
      const mockMessages: Message[] = [
        {
          id: 1,
          sender: "+15551234567",
          receiver: "+15559876543",
          body: "First message",
          direction: "inbound",
          created: new Date("2024-01-15T10:30:00Z"),
        },
        {
          id: 2,
          sender: "+15559876543",
          receiver: "+15551234567",
          body: "Second message",
          direction: "outbound",
          created: new Date("2024-01-16T10:30:00Z"),
        },
      ];

      mockFindMany.mockResolvedValueOnce(mockMessages);

      const response = await fetch(`${baseUrl}/messages`);
      const data = (await response.json()) as Message[];

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain(
        "application/json",
      );
      expect(data).toHaveLength(2);
      expect(mockFindMany).toHaveBeenCalled();
    });

    it("should return empty array when no messages", async () => {
      mockFindMany.mockResolvedValueOnce([]);

      const response = await fetch(`${baseUrl}/messages`);
      const data = (await response.json()) as Message[];

      expect(response.status).toBe(200);
      expect(data).toEqual([]);
    });
  });

  describe("404 Handler", () => {
    it("should return 404 for unknown routes", async () => {
      const response = await fetch(`${baseUrl}/unknown-route`);
      const data = (await response.json()) as { error: string };

      expect(response.status).toBe(404);
      expect(data.error).toBe("Resource not found");
    });

    it("should return 404 for POST to unknown routes", async () => {
      const response = await fetch(`${baseUrl}/unknown-route`, {
        method: "POST",
      });
      const data = (await response.json()) as { error: string };

      expect(response.status).toBe(404);
      expect(data.error).toBe("Resource not found");
    });
  });

  describe("Security Headers", () => {
    it("should include security headers from helmet", async () => {
      const response = await fetch(`${baseUrl}/health`);

      // Helmet adds various security headers
      expect(response.headers.get("x-content-type-options")).toBe("nosniff");
      expect(response.headers.get("x-frame-options")).toBe("SAMEORIGIN");
    });

    it("should include CORS headers", async () => {
      const response = await fetch(`${baseUrl}/health`, {
        headers: {
          Origin: "http://example.com",
        },
      });

      expect(response.headers.get("access-control-allow-origin")).toBe("*");
    });
  });
});
