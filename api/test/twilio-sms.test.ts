import { describe, expect, it, mock, beforeEach } from "bun:test";

const mockReplyToMessage = mock(() => Promise.resolve("Hello back!"));
const mockMessagesCreate = mock(() => Promise.resolve({ sid: "SM123" }));

mock.module("../app/modules/message/service", () => ({
  replyToMessage: mockReplyToMessage,
}));

mock.module("../app/modules/twilio/client", () => ({
  default: { messages: { create: mockMessagesCreate } },
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
    mockReplyToMessage.mockClear();
    mockMessagesCreate.mockClear();
    process.env.SMS_SYNC_TIMEOUT_MS = "10000";
  });

  describe("sync path (fast LLM)", () => {
    it("returns TwiML with the reply inline", async () => {
      mockReplyToMessage.mockResolvedValueOnce("Hey there!");

      const xml = await handleIncomingSms(TO, FROM, BODY);

      expect(xml).toContain("<Message>Hey there!</Message>");
      expect(mockMessagesCreate).not.toHaveBeenCalled();
    });

    it("passes correct args to replyToMessage", async () => {
      await handleIncomingSms(TO, FROM, BODY);

      expect(mockReplyToMessage).toHaveBeenCalledWith(TO, FROM, BODY);
    });
  });

  describe("async fallback path (slow LLM)", () => {
    function deferredReply() {
      let resolve!: (value: string) => void;
      let reject!: (err: unknown) => void;
      const promise = new Promise<string>((res, rej) => {
        resolve = res;
        reject = rej;
      });
      return { promise, resolve, reject };
    }

    it("returns 'One moment...' TwiML when LLM exceeds timeout", async () => {
      process.env.SMS_SYNC_TIMEOUT_MS = "50";
      const deferred = deferredReply();
      mockReplyToMessage.mockImplementationOnce(() => deferred.promise);

      const xml = await handleIncomingSms(TO, FROM, BODY);

      expect(xml).toContain("<Message>One moment...</Message>");

      deferred.resolve("Delayed reply");
      await new Promise((r) => setTimeout(r, 10));

      expect(mockMessagesCreate).toHaveBeenCalledWith({
        body: "Delayed reply",
        from: TO,
        to: FROM,
      });
    });

    it("does not call messagesCreate inline on the slow path", async () => {
      process.env.SMS_SYNC_TIMEOUT_MS = "50";
      const deferred = deferredReply();
      mockReplyToMessage.mockImplementationOnce(() => deferred.promise);

      await handleIncomingSms(TO, FROM, BODY);

      // messagesCreate should not have been called yet
      expect(mockMessagesCreate).not.toHaveBeenCalled();

      deferred.resolve("reply");
      await new Promise((r) => setTimeout(r, 10));
    });

    it("catches replyToMessage errors without throwing", async () => {
      process.env.SMS_SYNC_TIMEOUT_MS = "50";
      const deferred = deferredReply();
      mockReplyToMessage.mockImplementationOnce(() => deferred.promise);

      const xml = await handleIncomingSms(TO, FROM, BODY);
      expect(xml).toContain("One moment...");

      deferred.reject(new Error("LLM exploded"));
      // Should not throw
      await new Promise((r) => setTimeout(r, 10));

      expect(mockMessagesCreate).not.toHaveBeenCalled();
    });
  });
});
