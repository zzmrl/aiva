import { z } from "zod";

const phoneNumberSchema = z.object({ phone_number: z.string().min(1) });

const messagingBodySchema = z.object({
  data: z.object({
    event_type: z.string().min(1),
    payload: z.object({
      to: z.tuple([phoneNumberSchema]).rest(phoneNumberSchema),
      from: phoneNumberSchema,
      text: z.string().min(1),
    }),
  }),
});

export const messagingSchema = { body: messagingBodySchema };
export type MessagingWebhookBody = z.infer<typeof messagingBodySchema>;
export type MessagingPayload = MessagingWebhookBody["data"]["payload"];

const voiceBodySchema = z.object({
  data: z.object({
    event_type: z.string().min(1),
    payload: z.object({
      call_control_id: z.string().min(1),
    }),
  }),
});

export const voiceSchema = { body: voiceBodySchema };
export type VoiceWebhookBody = z.infer<typeof voiceBodySchema>;
export type VoicePayload = VoiceWebhookBody["data"]["payload"];
