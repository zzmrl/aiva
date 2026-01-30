import { z } from "zod";

export const messagingSchema = {
  body: z.object({
    data: z.object({
      event_type: z.string().min(1),
      payload: z.object({
        to: z.array(z.object({ phone_number: z.string().min(1) })).min(1),
        from: z.object({ phone_number: z.string().min(1) }),
        text: z.string().min(1),
      }),
    }),
  }),
};

export const voiceSchema = {
  body: z.object({
    data: z.object({
      event_type: z.string().min(1),
      payload: z.object({
        call_control_id: z.string().min(1),
      }),
    }),
  }),
};
