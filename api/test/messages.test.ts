import { describe, expect, it, mock, beforeEach } from "bun:test";
import type { Message, InsertMessageInput } from "../app/entity/messages";

const mockQuery = mock<() => Promise<Message | Message[]>>(() =>
  Promise.resolve([]),
);

mock.module("../app/db", () => ({
  sql: Object.assign(mockQuery, {
    // Tagged template literal support
    [Symbol.for("bun:sql")]: true,
  }),
}));

const { insertMessage, getAllMessages, getMessageById, getMessagesByPhone } =
  await import("../app/entity/messages");

describe("Messages Module", () => {
  beforeEach(() => {
    mockQuery.mockClear();
  });

  describe("insertMessage", () => {
    it("should insert a message with to, from, and body", async () => {
      const mockMessage: Message = {
        id: 1,
        receiver: "+15551234567",
        sender: "+15559876543",
        body: "Hello, world!",
        created: new Date("2024-01-15T10:30:00Z"),
      };

      mockQuery.mockResolvedValueOnce(mockMessage);

      const input: InsertMessageInput = {
        receiver: "+15551234567",
        sender: "+15559876543",
        body: "Hello, world!",
      };

      const result = await insertMessage(input);

      expect(mockQuery).toHaveBeenCalled();
      expect(result).toEqual(mockMessage);
    });

    it("should handle empty body", async () => {
      const mockMessage: Message = {
        id: 2,
        receiver: "+15551234567",
        sender: "+15559876543",
        body: "",
        created: new Date(),
      };

      mockQuery.mockResolvedValueOnce(mockMessage);

      const input: InsertMessageInput = {
        receiver: "+15551234567",
        sender: "+15559876543",
        body: "",
      };

      const result = await insertMessage(input);

      expect(result.body).toBe("");
    });

    it("should handle special characters in message body", async () => {
      const specialBody = "Hello! @user #tag & <script>alert('xss')</script>";
      const mockMessage: Message = {
        id: 3,
        receiver: "+15551234567",
        sender: "+15559876543",
        body: specialBody,
        created: new Date(),
      };

      mockQuery.mockResolvedValueOnce(mockMessage);

      const input: InsertMessageInput = {
        receiver: "+15551234567",
        sender: "+15559876543",
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
          receiver: "+15551234567",
          sender: "+15559876543",
          body: "Newer message",
          created: new Date("2024-01-16T10:30:00Z"),
        },
        {
          id: 1,
          receiver: "+15559876543",
          sender: "+15551234567",
          body: "Older message",
          created: new Date("2024-01-15T10:30:00Z"),
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
        receiver: "+15551234567",
        sender: "+15559876543",
        body: "Test message",
        created: new Date("2024-01-15T10:30:00Z"),
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
          receiver: "+15551234567",
          sender: "+15559876543",
          body: "First message",
          created: new Date("2024-01-15T10:30:00Z"),
        },
        {
          id: 3,
          receiver: "+15551234567",
          sender: "+15559876543",
          body: "Third message from same number",
          created: new Date("2024-01-17T10:30:00Z"),
        },
      ];

      mockQuery.mockResolvedValueOnce(mockMessages);

      const result = await getMessagesByPhone(phone);

      expect(mockQuery).toHaveBeenCalled();
      expect(result).toEqual(mockMessages);
      expect(result).toHaveLength(2);
      expect(result.every((m) => m.receiver === "+15551234567")).toBe(true);
    });

    it("should return empty array when no messages for phone number", async () => {
      mockQuery.mockResolvedValueOnce([]);

      const result = await getMessagesByPhone("+15559999999");

      expect(result).toEqual([]);
    });
  });
});
