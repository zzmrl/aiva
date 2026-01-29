import { z } from "zod";

export const messagingSchema = {
  body: z.object({
    Body: z.string().min(1),
    From: z.string().min(1),
    To: z.string().min(1),
  }),
};

export const voiceSchema = {
  body: z.object({
    data: z.object({
      payload: z.object({
        call_control_id: z.string().min(1),
      }),
    }),
  }),
};
