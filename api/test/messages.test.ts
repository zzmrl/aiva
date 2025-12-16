import { describe, expect, it, mock, beforeEach } from "bun:test";
import type { Message, CreateMessageInput } from "../app/db/messages";

const mockQuery = mock<() => Promise<Message | Message[]>>(() =>
  Promise.resolve([]),
);

mock.module("../app/db/client", () => ({
  sql: Object.assign(mockQuery, {
    // Tagged template literal support
    [Symbol.for("bun:sql")]: true,
  }),
}));

const { insertMessage, getAllMessages, getMessageById, getMessagesByPhone } =
  await import("../app/db/messages");

describe("Messages Module", () => {
  beforeEach(() => {
    mockQuery.mockClear();
  });

  describe("insertMessage", () => {
    it("should insert a message with phone number and body", async () => {
      const mockMessage: Message = {
        id: 1,
        phoneNumber: "+15551234567",
        body: "Hello, world!",
        createdAt: new Date("2024-01-15T10:30:00Z"),
      };

      mockQuery.mockResolvedValueOnce(mockMessage);

      const input: CreateMessageInput = {
        phoneNumber: "+15551234567",
        body: "Hello, world!",
      };

      const result = await insertMessage(input);

      expect(mockQuery).toHaveBeenCalled();
      expect(result).toEqual(mockMessage);
    });

    it("should handle empty body", async () => {
      const mockMessage: Message = {
        id: 2,
        phoneNumber: "+15551234567",
        body: "",
        createdAt: new Date(),
      };

      mockQuery.mockResolvedValueOnce(mockMessage);

      const input: CreateMessageInput = {
        phoneNumber: "+15551234567",
        body: "",
      };

      const result = await insertMessage(input);

      expect(result.body).toBe("");
    });

    it("should handle special characters in message body", async () => {
      const specialBody = "Hello! @user #tag & <script>alert('xss')</script>";
      const mockMessage: Message = {
        id: 3,
        phoneNumber: "+15551234567",
        body: specialBody,
        createdAt: new Date(),
      };

      mockQuery.mockResolvedValueOnce(mockMessage);

      const input: CreateMessageInput = {
        phoneNumber: "+15551234567",
        body: specialBody,
      };

      const result = await insertMessage(input);

      expect(result.body).toBe(specialBody);
    });
  });

  describe("getAllMessages", () => {
    it("should return all messages ordered by created_at desc", async () => {
      const mockMessages: Message[] = [
        {
          id: 2,
          phoneNumber: "+15551234567",
          body: "Newer message",
          createdAt: new Date("2024-01-16T10:30:00Z"),
        },
        {
          id: 1,
          phoneNumber: "+15559876543",
          body: "Older message",
          createdAt: new Date("2024-01-15T10:30:00Z"),
        },
      ];

      mockQuery.mockResolvedValueOnce(mockMessages);

      const result = await getAllMessages();

      expect(mockQuery).toHaveBeenCalled();
      expect(result).toEqual(mockMessages);
      expect(result).toHaveLength(2);
    });

    it("should return empty array when no messages exist", async () => {
      mockQuery.mockResolvedValueOnce([]);

      const result = await getAllMessages();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe("getMessageById", () => {
    it("should return a message when found", async () => {
      const mockMessage: Message = {
        id: 1,
        phoneNumber: "+15551234567",
        body: "Test message",
        createdAt: new Date("2024-01-15T10:30:00Z"),
      };

      mockQuery.mockResolvedValueOnce([mockMessage]);

      const result = await getMessageById(1);

      expect(mockQuery).toHaveBeenCalled();
      expect(result).toEqual(mockMessage);
    });

    it("should return null when message not found", async () => {
      mockQuery.mockResolvedValueOnce([]);

      const result = await getMessageById(999);

      expect(result).toBeNull();
    });
  });

  describe("getMessagesByPhone", () => {
    it("should return messages for a given phone number", async () => {
      const phone = "+15551234567";
      const mockMessages: Message[] = [
        {
          id: 1,
          phoneNumber: phone,
          body: "First message",
          createdAt: new Date("2024-01-15T10:30:00Z"),
        },
        {
          id: 3,
          phoneNumber: phone,
          body: "Third message from same number",
          createdAt: new Date("2024-01-17T10:30:00Z"),
        },
      ];

      mockQuery.mockResolvedValueOnce(mockMessages);

      const result = await getMessagesByPhone(phone);

      expect(mockQuery).toHaveBeenCalled();
      expect(result).toEqual(mockMessages);
      expect(result).toHaveLength(2);
      expect(result.every((m) => m.phoneNumber === phone)).toBe(true);
    });

    it("should return empty array when no messages for phone number", async () => {
      mockQuery.mockResolvedValueOnce([]);

      const result = await getMessagesByPhone("+15559999999");

      expect(result).toEqual([]);
    });
  });
});
