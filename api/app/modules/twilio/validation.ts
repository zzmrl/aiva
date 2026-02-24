import { z } from "zod";

export const voiceWebhookSchema = {
  body: z.object({
    From: z.string().min(1),
    To: z.string().min(1),
  }),
};

export type VoiceWebhookRequest = {
  body: z.infer<typeof voiceWebhookSchema.body>;
};

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
