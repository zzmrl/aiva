import { z } from "zod";

export const smsWebhookSchema = {
  body: z.object({
    Body: z.string().min(1),
    From: z.string().min(1),
    To: z.string().min(1),
  }),
};

export const transcriptionSchema = {
  body: z.object({
    TranscriptionText: z.string().min(1),
    From: z.string().min(1),
    To: z.string().min(1),
  }),
};
