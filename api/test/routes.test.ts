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

mock.module("../app/config", () => ({
  default: {
    NODE_ENV: "test",
    PORT: 3000,
    PUBLIC_HOST: "test.example.com",
    VENICE_API_KEY: "test-key",
    DATABASE_URL: "postgres://test:test@localhost:5432/test",
  },
}));

mock.module("../app/modules/llm/client", () => ({
  default: {},
}));

mock.module("../app/modules/llm/completions", () => ({
  createCompletion: mockCreateCompletion,
  streamCompletion: mock(async function* () {}),
}));

mock.module("../app/modules/twilio/stream", () => ({
  attachWebSocket: mock(() => {}),
  sendAudio: mock(() => {}),
  clearAudio: mock(() => {}),
}));

mock.module("../app/modules/twilio/tts", () => ({
  textToSpeech: mock(() =>
    Promise.resolve({ pcm: Buffer.alloc(0), sampleRate: 24000 }),
  ),
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
  });

  describe("GET /health", () => {
    it("should return health status with 200", async () => {
      const response = await fetch(`${baseUrl}/health`);

      expect(response.status).toBe(200);
    });
  });

  describe("POST /twilio/voice", () => {
    it("should return TwiML with transcription and stream", async () => {
      const response = await fetch(`${baseUrl}/twilio/voice`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          From: "+15551234567",
          To: "+15559876543",
        }),
      });

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain("text/xml");

      const xml = await response.text();
      expect(xml).toContain("<?xml version");
      expect(xml).toContain("<Response>");
      expect(xml).toContain("<Start>");
      expect(xml).toContain("<Transcription");
      expect(xml).toContain("<Say>");
      expect(xml).toContain("Hey it's Aiva! How can I help you today?");
      expect(xml).toContain("<Connect>");
      expect(xml).toContain("<Stream");
      expect(xml).toContain("test.example.com");
    });
  });

  describe("POST /twilio/transcription-events", () => {
    it("should return 200 for transcription-content event", async () => {
      const response = await fetch(`${baseUrl}/twilio/transcription-events`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          CallSid: "CA1234567890abcdef",
          TranscriptionEvent: "transcription-content",
          TranscriptionText: "Hello there",
        }),
      });

      expect(response.status).toBe(200);
    });

    it("should return 200 for non-content events", async () => {
      const response = await fetch(`${baseUrl}/twilio/transcription-events`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          CallSid: "CA1234567890abcdef",
          TranscriptionEvent: "transcription-started",
        }),
      });

      expect(response.status).toBe(200);
    });

    it("should return 400 when CallSid is missing", async () => {
      const response = await fetch(`${baseUrl}/twilio/transcription-events`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          TranscriptionEvent: "transcription-content",
          TranscriptionText: "Hello",
        }),
      });

      expect(response.status).toBe(400);
    });

    it("should return 400 when TranscriptionEvent is missing", async () => {
      const response = await fetch(`${baseUrl}/twilio/transcription-events`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          CallSid: "CA1234567890abcdef",
        }),
      });

      expect(response.status).toBe(400);
    });

    it("should return 400 when body is empty", async () => {
      const response = await fetch(`${baseUrl}/twilio/transcription-events`, {
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
