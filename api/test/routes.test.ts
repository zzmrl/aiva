import { describe, expect, it, mock, beforeEach, afterAll } from "bun:test";
import type { Message, CreateMessageInput } from "../app/modules/message";

const fakeMessage = (o: Partial<Message> = {}): Message => ({
  id: 1,
  receiver: "",
  sender: "",
  body: "",
  direction: "inbound",
  created: new Date(),
  ...o,
});

const mockCreate = mock(async (_input: CreateMessageInput) => fakeMessage());
const mockFindMany = mock(async () => [] as Message[]);
const mockFindConversation = mock(async () => [] as Message[]);
const mockFindSystemPhones = mock(async () => [] as string[]);
const mockFindConversations = mock(async () => []);
const mockSmsCreateCompletion = mock(
  async (_messages) => "Mocked text response",
);
const mockCreateInboundAndFetchConversation = mock(
  async (_from, _to, _body) => [] as Message[],
);
const mockEnqueue = mock(async () => {});

mock.module("../app/modules/message/repository", () => ({
  create: mockCreate,
  findMany: mockFindMany,
  findConversation: mockFindConversation,
  findById: mock(() => Promise.resolve(undefined)),
  getMessagesByPhone: mock(async () => []),
  findSystemPhones: mockFindSystemPhones,
  findConversations: mockFindConversations,
  createInboundAndFetchConversation: mockCreateInboundAndFetchConversation,
}));

mock.module("../app/db", () => ({
  sql: mock(async () => []),
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
  defaultCompletion: {
    create: mock(() => Promise.resolve("")),
    stream: mock(async function* () {}),
  },
  smsCompletion: {
    create: mockSmsCreateCompletion,
    stream: mock(async function* () {}),
  },
  defineCompletion: mock(() => ({
    create: mock(() => Promise.resolve("")),
    stream: mock(async function* () {}),
  })),
}));

mock.module("../app/modules/twilio/stream", () => ({
  attachWebSocket: mock(() => {}),
}));

mock.module("../app/shared/queue", () => ({
  default: { send: mock(() => Promise.resolve("job-id")) },
}));

mock.module("../app/modules/twilio/smsWorker", () => ({
  enqueue: mockEnqueue,
}));

const { createApp } = await import("../app/factory");

const app = createApp();

const port = 3001 + Math.floor(Math.random() * 1000);
const server = app.listen(port);
const baseUrl = `http://localhost:${port}`;

afterAll(() => {
  server.close();
});

describe("API Routes", () => {
  beforeEach(() => {
    mock.clearAllMocks();
  });

  describe("GET /health", () => {
    it("should return health status with 200", async () => {
      const response = await fetch(`${baseUrl}/health`);

      expect(response.status).toBe(200);
    });
  });

  describe("POST /twilio/voice", () => {
    it("should return TwiML with ConversationRelay", async () => {
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
      expect(xml).toContain("<Connect>");
      expect(xml).toContain("<ConversationRelay");
      expect(xml).toContain("test.example.com");
      expect(xml).toContain("welcomeGreeting");
    });
  });

  describe("POST /twilio/sms", () => {
    it("should save inbound SMS, enqueue job, and return empty TwiML", async () => {
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
      expect(xml).toContain("<Response/>");

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          body: "Hello from SMS",
          sender: "+15551234567",
          receiver: "+15559876543",
          direction: "inbound",
        }),
      );
      expect(mockEnqueue).toHaveBeenCalledWith("+15559876543", "+15551234567");
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
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ body: specialBody }),
      );
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

    it("should pass systemPhone filter to repository", async () => {
      mockFindMany.mockResolvedValueOnce([]);

      const response = await fetch(
        `${baseUrl}/messages?systemPhone=%2B15559876543`,
      );

      expect(response.status).toBe(200);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ systemPhone: "+15559876543" }),
      );
    });
  });

  describe("GET /messages/system-phones", () => {
    it("should return list of system phone numbers", async () => {
      mockFindSystemPhones.mockResolvedValueOnce([
        "+15559876543",
        "+15550001111",
      ]);

      const response = await fetch(`${baseUrl}/messages/system-phones`);
      const data = (await response.json()) as string[];

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain(
        "application/json",
      );
      expect(data).toEqual(["+15559876543", "+15550001111"]);
      expect(mockFindSystemPhones).toHaveBeenCalled();
    });

    it("should return empty array when no messages exist", async () => {
      mockFindSystemPhones.mockResolvedValueOnce([]);

      const response = await fetch(`${baseUrl}/messages/system-phones`);
      const data = (await response.json()) as string[];

      expect(response.status).toBe(200);
      expect(data).toEqual([]);
    });
  });

  describe("GET /messages/conversations", () => {
    it("should return conversations", async () => {
      mockFindConversations.mockResolvedValueOnce([]);

      const response = await fetch(`${baseUrl}/messages/conversations`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual([]);
      expect(mockFindConversations).toHaveBeenCalledTimes(1);
    });

    it("should pass systemPhone to repository when provided", async () => {
      mockFindConversations.mockResolvedValueOnce([]);

      await fetch(
        `${baseUrl}/messages/conversations?systemPhone=%2B15559876543`,
      );

      expect(mockFindConversations).toHaveBeenCalledWith("+15559876543");
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
