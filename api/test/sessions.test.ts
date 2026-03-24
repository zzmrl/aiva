import { describe, expect, it, afterEach, beforeEach } from "bun:test";
import * as sessions from "../app/modules/twilio/sessionStore";

const mockWs = {
  send: () => {},
  on: () => {},
  close: () => {},
} as unknown as import("ws").WebSocket;

const mockWs2 = {
  send: () => {},
  on: () => {},
  close: () => {},
} as unknown as import("ws").WebSocket;

const mockWsUnknown = {
  send: () => {},
  on: () => {},
  close: () => {},
} as unknown as import("ws").WebSocket;

describe("sessions", () => {
  beforeEach(() => {
    sessions.remove(mockWs);
    sessions.remove(mockWs2);
  });

  afterEach(() => {
    sessions.stopCleanup();
  });

  describe("create and get", () => {
    it("should store and retrieve a session", () => {
      sessions.create(mockWs, {
        ws: mockWs,
        abortController: null,
        callSid: "test-call-1",
        from: "+15551234567",
        to: "+15559876543",
        messages: [],
      });

      const session = sessions.get(mockWs);
      expect(session).toBeDefined();
      expect(session?.callSid).toBe("test-call-1");
      expect(session?.from).toBe("+15551234567");
      expect(session?.to).toBe("+15559876543");
      expect(session?.abortController).toBeNull();
      expect(session?.messages).toEqual([]);
    });

    it("should return undefined for non-existent session", () => {
      const session = sessions.get(mockWsUnknown);
      expect(session).toBeUndefined();
    });
  });

  describe("appendMessage", () => {
    it("should append a message and return all messages", () => {
      sessions.create(mockWs, {
        ws: mockWs,
        abortController: null,
        callSid: "test-call-1",
        from: "+15551234567",
        to: "+15559876543",
        messages: [],
      });

      const messages = sessions.appendMessage(mockWs, {
        role: "user",
        content: "Hello",
      });

      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual({ role: "user", content: "Hello" });
    });

    it("should accumulate messages", () => {
      sessions.create(mockWs, {
        ws: mockWs,
        abortController: null,
        callSid: "test-call-1",
        from: "+15551234567",
        to: "+15559876543",
        messages: [],
      });

      sessions.appendMessage(mockWs, { role: "user", content: "Hello" });
      const messages = sessions.appendMessage(mockWs, {
        role: "assistant",
        content: "Hi there!",
      });

      expect(messages).toHaveLength(2);
    });

    it("should return empty array for non-existent session", () => {
      const messages = sessions.appendMessage(mockWsUnknown, {
        role: "user",
        content: "Hello",
      });
      expect(messages).toEqual([]);
    });
  });

  describe("remove", () => {
    it("should remove and return the session", () => {
      sessions.create(mockWs, {
        ws: mockWs,
        abortController: null,
        callSid: "test-call-1",
        from: "+15551234567",
        to: "+15559876543",
        messages: [],
      });

      const removed = sessions.remove(mockWs);
      expect(removed).toBeDefined();
      expect(removed?.callSid).toBe("test-call-1");
      expect(sessions.get(mockWs)).toBeUndefined();
    });

    it("should return undefined when removing non-existent session", () => {
      const removed = sessions.remove(mockWsUnknown);
      expect(removed).toBeUndefined();
    });

    it("should only remove the matching session", () => {
      sessions.create(mockWs, {
        ws: mockWs,
        abortController: null,
        callSid: "test-call-1",
        from: "+15551234567",
        to: "+15559876543",
        messages: [],
      });
      sessions.create(mockWs2, {
        ws: mockWs2,
        abortController: null,
        callSid: "test-call-2",
        from: "+15551111111",
        to: "+15552222222",
        messages: [],
      });

      sessions.remove(mockWs);
      expect(sessions.get(mockWs)).toBeUndefined();
      expect(sessions.get(mockWs2)).toBeDefined();
    });
  });

  describe("cleanup", () => {
    it("should remove sessions older than 30 minutes", () => {
      sessions.create(mockWs, {
        ws: mockWs,
        abortController: null,
        callSid: "test-call-1",
        from: "+15551234567",
        to: "+15559876543",
        messages: [],
      });

      const session = sessions.get(mockWs);
      expect(session).toBeDefined();
      if (!session) return;
      session.createdAt = Date.now() - 31 * 60 * 1000;

      const removed = sessions.cleanup();
      expect(removed).toBe(1);
      expect(sessions.get(mockWs)).toBeUndefined();
    });

    it("should not remove sessions younger than 30 minutes", () => {
      sessions.create(mockWs, {
        ws: mockWs,
        abortController: null,
        callSid: "test-call-1",
        from: "+15551234567",
        to: "+15559876543",
        messages: [],
      });

      const removed = sessions.cleanup();
      expect(removed).toBe(0);
      expect(sessions.get(mockWs)).toBeDefined();
    });

    it("should only remove expired sessions", () => {
      sessions.create(mockWs, {
        ws: mockWs,
        abortController: null,
        callSid: "test-call-1",
        from: "+15551234567",
        to: "+15559876543",
        messages: [],
      });
      sessions.create(mockWs2, {
        ws: mockWs2,
        abortController: null,
        callSid: "test-call-2",
        from: "+15551111111",
        to: "+15552222222",
        messages: [],
      });

      const session = sessions.get(mockWs);
      expect(session).toBeDefined();
      if (!session) return;
      session.createdAt = Date.now() - 31 * 60 * 1000;

      const removed = sessions.cleanup();
      expect(removed).toBe(1);
      expect(sessions.get(mockWs)).toBeUndefined();
      expect(sessions.get(mockWs2)).toBeDefined();
    });
  });

  describe("createdAt", () => {
    it("should automatically set createdAt on create", () => {
      const before = Date.now();
      sessions.create(mockWs, {
        ws: mockWs,
        abortController: null,
        callSid: "test-call-1",
        from: "+15551234567",
        to: "+15559876543",
        messages: [],
      });
      const after = Date.now();

      const session = sessions.get(mockWs);
      expect(session?.createdAt).toBeGreaterThanOrEqual(before);
      expect(session?.createdAt).toBeLessThanOrEqual(after);
    });
  });
});
