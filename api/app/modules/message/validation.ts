import { z } from "zod";

export const listMessagesSchema = {
  query: z.object({
    phone: z.string().optional(),
    systemPhone: z.string().optional(),
  }),
};

export const messageIdSchema = {
  params: z.object({
    id: z.coerce.number().int().positive(),
  }),
};

