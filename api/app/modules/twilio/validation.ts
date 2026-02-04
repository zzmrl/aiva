import { z } from "zod";

export const smsWebhookSchema = {
  body: z.object({
    Body: z.string().min(1),
    From: z.string().min(1),
    To: z.string().min(1),
  }),
};

export type SmsWebhookRequest = {
  body: z.infer<typeof smsWebhookSchema.body>;
};

export const transcriptionSchema = {
  body: z.object({
    CallSid: z.string().min(1),
    TranscriptionEvent: z.string().min(1),
    TranscriptionText: z.string().optional(),
  }),
};

export type TranscriptionRequest = {
  body: z.infer<typeof transcriptionSchema.body>;
};
