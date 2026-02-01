import { z } from "zod";

const phoneNumberSchema = z.object({ phone_number: z.string().min(1) });

const messagingBodySchema = z.object({
  data: z.object({
    id: z.string().uuid(),
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

const callInitiatedDataSchema = z.object({
  id: z.uuid(),
  event_type: z.literal("call.initiated"),
  payload: z.object({
    call_control_id: z.string().min(1),
    from: z.string().min(1),
    to: z.string().min(1),
  }),
});

export type CallInitiatedWebhookData = z.infer<typeof callInitiatedDataSchema>;
export type CallInitiatedPayload = CallInitiatedWebhookData["payload"];

const callAnsweredDataSchema = z.object({
  id: z.uuid(),
  event_type: z.literal("call.answered"),
  payload: z.object({
    call_control_id: z.string().min(1),
  }),
});

export type CallAnsweredWebhookData = z.infer<typeof callAnsweredDataSchema>;
export type CallAnsweredPayload = CallAnsweredWebhookData["payload"];

const callHangupDataSchema = z.object({
  id: z.uuid(),
  event_type: z.literal("call.hangup"),
  payload: z.object({
    call_control_id: z.string().min(1),
  }),
});

export type CallHangupWebhookData = z.infer<typeof callHangupDataSchema>;
export type CallHangupPayload = CallHangupWebhookData["payload"];

const transcriptionDataSchema = z.object({
  id: z.uuid(),
  event_type: z.literal("call.transcription"),
  payload: z.object({
    call_control_id: z.string().min(1),
    transcription_data: z.object({
      transcript: z.string().default(""),
      is_final: z.boolean().default(false),
    }),
  }),
});

export type TranscriptionWebhookData = z.infer<typeof transcriptionDataSchema>;
export type TranscriptionPayload = TranscriptionWebhookData["payload"];

const voiceBodySchema = z.object({
  data: z.discriminatedUnion("event_type", [
    callInitiatedDataSchema,
    callAnsweredDataSchema,
    callHangupDataSchema,
    transcriptionDataSchema,
  ]),
});

export const voiceSchema = { body: voiceBodySchema };
export type VoiceWebhookBody = z.infer<typeof voiceBodySchema>;
export type VoicePayload = VoiceWebhookBody["data"]["payload"];
