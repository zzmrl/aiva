import { describe, expect, it, mock, beforeEach, afterAll } from "bun:test";
import type { Message } from "../app";

const mockInsertMessage = mock(
  (_input: { body: string; phoneNumber: string }) =>
    Promise.resolve({
      id: 1,
      phoneNumber: "",
      body: "",
      createdAt: new Date(),
    }),
);
const mockGetAllMessages = mock(() => Promise.resolve<Message[]>([]));

mock.module("../app/entity/messages", () => ({
  insertMessage: mockInsertMessage,
  getAllMessages: mockGetAllMessages,
}));

mock.module("../app/db", () => ({
  sql: mock(() => Promise.resolve([])),
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
    mockInsertMessage.mockClear();
    mockGetAllMessages.mockClear();
  });

  describe("GET /health", () => {
    it("should return health status with 200", async () => {
      const response = await fetch(`${baseUrl}/health`);
      const data = (await response.json()) as {
        status: string;
        timestamp: string;
      };

      expect(response.status).toBe(200);
      expect(data.status).toBe("ok");
      expect(data.timestamp).toBeDefined();
    });

    it("should return valid ISO timestamp", async () => {
      const response = await fetch(`${baseUrl}/health`);
      const data = (await response.json()) as {
        status: string;
        timestamp: string;
      };

      const timestamp = new Date(data.timestamp);
      expect(timestamp.toISOString()).toBe(data.timestamp);
    });
  });

  describe("POST /voice", () => {
    it("should return TwiML voice response", async () => {
      const response = await fetch(`${baseUrl}/voice`, {
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

  describe("POST /voiceTranscribe", () => {
    it("should save transcription and return 201", async () => {
      mockInsertMessage.mockResolvedValueOnce({
        id: 1,
        phoneNumber: "+15551234567",
        body: "This is a transcribed message",
        createdAt: new Date(),
      });

      const response = await fetch(`${baseUrl}/voiceTranscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          TranscriptionText: "This is a transcribed message",
          From: "+15551234567",
        }),
      });

      expect(response.status).toBe(201);
      expect(mockInsertMessage).toHaveBeenCalledWith({
        body: "This is a transcribed message",
        phoneNumber: "+15551234567",
      });
    });

    it("should return 400 when TranscriptionText is missing", async () => {
      const response = await fetch(`${baseUrl}/voiceTranscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          From: "+15551234567",
        }),
      });

      expect(response.status).toBe(400);
      expect(mockInsertMessage).not.toHaveBeenCalled();
    });

    it("should return 400 when From is missing", async () => {
      const response = await fetch(`${baseUrl}/voiceTranscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          TranscriptionText: "Test message",
        }),
      });

      expect(response.status).toBe(400);
      expect(mockInsertMessage).not.toHaveBeenCalled();
    });

    it("should return 400 when body is empty", async () => {
      const response = await fetch(`${baseUrl}/voiceTranscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "",
      });

      expect(response.status).toBe(400);
    });
  });

  describe("POST /sms", () => {
    it("should save SMS and return TwiML response", async () => {
      mockInsertMessage.mockResolvedValueOnce({
        id: 1,
        phoneNumber: "+15551234567",
        body: "Hello from SMS",
        createdAt: new Date(),
      });

      const response = await fetch(`${baseUrl}/sms`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          Body: "Hello from SMS",
          From: "+15551234567",
        }),
      });

      expect(response.status).toBe(201);
      expect(response.headers.get("content-type")).toContain("text/xml");

      const xml = await response.text();
      expect(xml).toContain("<?xml version");
      expect(xml).toContain("<Response>");
      expect(xml).toContain("<Message>");

      expect(mockInsertMessage).toHaveBeenCalledWith({
        body: "Hello from SMS",
        phoneNumber: "+15551234567",
      });
    });

    it("should return 400 when Body is missing", async () => {
      const response = await fetch(`${baseUrl}/sms`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          From: "+15551234567",
        }),
      });

      expect(response.status).toBe(400);
      expect(mockInsertMessage).not.toHaveBeenCalled();
    });

    it("should return 400 when From is missing", async () => {
      const response = await fetch(`${baseUrl}/sms`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          Body: "Test message",
        }),
      });

      expect(response.status).toBe(400);
      expect(mockInsertMessage).not.toHaveBeenCalled();
    });

    it("should handle special characters in SMS body", async () => {
      const specialBody = "Hello! 👋 @user #hashtag & <test>";

      mockInsertMessage.mockResolvedValueOnce({
        id: 1,
        phoneNumber: "+15551234567",
        body: specialBody,
        createdAt: new Date(),
      });

      const response = await fetch(`${baseUrl}/sms`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          Body: specialBody,
          From: "+15551234567",
        }),
      });

      expect(response.status).toBe(201);
      expect(mockInsertMessage).toHaveBeenCalledWith({
        body: specialBody,
        phoneNumber: "+15551234567",
      });
    });
  });

  describe("GET /messages", () => {
    it("should return all messages as JSON", async () => {
      const mockMessages: Message[] = [
        {
          id: 1,
          phoneNumber: "+15551234567",
          body: "First message",
          createdAt: new Date("2024-01-15T10:30:00Z"),
        },
        {
          id: 2,
          phoneNumber: "+15559876543",
          body: "Second message",
          createdAt: new Date("2024-01-16T10:30:00Z"),
        },
      ];

      mockGetAllMessages.mockResolvedValueOnce(mockMessages);

      const response = await fetch(`${baseUrl}/messages`);
      const data = (await response.json()) as Message[];

      expect(response.status).toBe(200);
      expect(response.headers.get("content-type")).toContain(
        "application/json",
      );
      expect(data).toHaveLength(2);
      expect(mockGetAllMessages).toHaveBeenCalled();
    });

    it("should return empty array when no messages", async () => {
      mockGetAllMessages.mockResolvedValueOnce([]);

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
