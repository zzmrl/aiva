import type { Request } from "express";
import { type PhoneProvider } from "./phone";
import type Telnyx from "telnyx";

export class TelnyxProvider implements PhoneProvider {
  readonly name = "Telnyx";

  constructor(
    /**
     * Telnyx API client instance
     */
    private readonly client: Telnyx,
    /**
     * Voice API App ID (formerly Telnyx connection ID) used in the call.
     */
    private readonly connectionId: string,
  ) {}

  async sendSms(to: string, from: string, body: string): Promise<void> {
    await this.client.messages.send({ to, from, text: body });
  }

  async answerCall(callControlId: string, webhookUrl?: string): Promise<void> {
    await this.client.calls.actions.answer(callControlId, {
      webhook_url: webhookUrl,
      send_silence_when_idle: true,
    });

    await this.client.calls.actions.startNoiseSuppression(callControlId, {
      direction: "inbound",
    });
  }

  async initiateCall(
    to: string,
    from: string,
    webhookUrl?: string,
  ): Promise<string> {
    const { data } = await this.client.calls.dial({
      to,
      from,
      connection_id: this.connectionId,
      webhook_url: webhookUrl,
      webhook_url_method: "POST",
      answering_machine_detection: "detect",
    });

    if (!data) {
      throw new Error("Telnyx call failed");
    }

    return data.call_control_id;
  }

  async hangup(callControlId: string): Promise<void> {
    await this.client.calls.actions.hangup(callControlId, {});
  }

  async startStreaming(
    callControlId: string,
    streamUrl: string,
  ): Promise<void> {
    await this.client.calls.actions.startStreaming(callControlId, {
      stream_url: streamUrl,
      stream_track: "both_tracks",
      stream_bidirectional_mode: "rtp",
      stream_bidirectional_codec: "PCMU",
    });
  }

  async speak(callControlId: string, content: string): Promise<void> {
    await this.client.calls.actions.speak(callControlId, {
      payload: content,
      voice: "Telnyx.NaturalHD.Estelle",
    });
  }

  async startTranscription(callControlId: string): Promise<void> {
    await this.client.calls.actions.startTranscription(callControlId, {
      transcription_engine: "Telnyx",
      transcription_tracks: "inbound",
    });
  }

  validateWebhook(req: Request) {
    return this.client.webhooks.unwrap(req.body, {
      headers: req.headers as Record<string, string>,
    });
  }
}
