import { describe, expect, it, beforeEach } from "bun:test";
import * as sessions from "../app/modules/twilio/sessions";

const mockWs = {
  send: () => {},
  on: () => {},
  close: () => {},
} as unknown as import("ws").WebSocket;

describe("sessions", () => {
  beforeEach(() => {
    // Clean up any existing sessions
    sessions.remove("test-call-1");
    sessions.remove("test-call-2");
  });

  describe("create and get", () => {
    it("should store and retrieve a session", () => {
      sessions.create("test-call-1", {
        ws: mockWs,
        streamSid: "stream-1",
        callSid: "test-call-1",
        from: "+15551234567",
        to: "+15559876543",
        messages: [],
      });

      const session = sessions.get("test-call-1");
      expect(session).toBeDefined();
      expect(session?.callSid).toBe("test-call-1");
      expect(session?.from).toBe("+15551234567");
      expect(session?.to).toBe("+15559876543");
      expect(session?.streamSid).toBe("stream-1");
      expect(session?.messages).toEqual([]);
    });

    it("should return undefined for non-existent session", () => {
      const session = sessions.get("non-existent");
      expect(session).toBeUndefined();
    });
  });

  describe("appendMessage", () => {
    it("should append a message and return all messages", () => {
      sessions.create("test-call-1", {
        ws: mockWs,
        streamSid: "stream-1",
        callSid: "test-call-1",
        from: "+15551234567",
        to: "+15559876543",
        messages: [],
      });

      const messages = sessions.appendMessage("test-call-1", {
        role: "user",
        content: "Hello",
      });

      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual({ role: "user", content: "Hello" });
    });

    it("should accumulate messages", () => {
      sessions.create("test-call-1", {
        ws: mockWs,
        streamSid: "stream-1",
        callSid: "test-call-1",
        from: "+15551234567",
        to: "+15559876543",
        messages: [],
      });

      sessions.appendMessage("test-call-1", {
        role: "user",
        content: "Hello",
      });
      const messages = sessions.appendMessage("test-call-1", {
        role: "assistant",
        content: "Hi there!",
      });

      expect(messages).toHaveLength(2);
    });

    it("should return empty array for non-existent session", () => {
      const messages = sessions.appendMessage("non-existent", {
        role: "user",
        content: "Hello",
      });
      expect(messages).toEqual([]);
    });
  });

  describe("remove", () => {
    it("should remove and return the session", () => {
      sessions.create("test-call-1", {
        ws: mockWs,
        streamSid: "stream-1",
        callSid: "test-call-1",
        from: "+15551234567",
        to: "+15559876543",
        messages: [],
      });

      const removed = sessions.remove("test-call-1");
      expect(removed).toBeDefined();
      expect(removed?.callSid).toBe("test-call-1");

      const session = sessions.get("test-call-1");
      expect(session).toBeUndefined();
    });

    it("should return undefined when removing non-existent session", () => {
      const removed = sessions.remove("non-existent");
      expect(removed).toBeUndefined();
    });
  });
});
