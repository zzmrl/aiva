import { z } from "zod";

export const listMessagesSchema = {
  query: z.object({
    phone: z.string().optional(),
  }),
};

export const messageIdSchema = {
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
};

export const createMessageSchema = {
  body: z.object({
    sender: z.string().min(1),
    receiver: z.string().min(1),
    body: z.string(),
    direction: z.enum(["inbound", "outbound"]).default("inbound"),
  }),
};
