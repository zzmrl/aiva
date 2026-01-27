import { type PhoneProvider } from "./phone";
import { type Twilio } from "twilio";

export class TwilioProvider implements PhoneProvider {
  readonly name = "Twilio";

  constructor(
    /**
     * Twilio API client instance
     */
    private readonly client: Twilio,
  ) {}

  async sendSms(to: string, from: string, body: string): Promise<void> {
    await this.client.messages.create({ to, from, body });
  }

  async initiateCall(
    to: string,
    from: string,
    webhookUrl?: string,
  ): Promise<string> {
    const call = await this.client.calls.create({
      to,
      from,
      url: webhookUrl,
      statusCallback: webhookUrl,
      statusCallbackEvent: ["initiated", "ringing", "answered", "completed"],
      machineDetection: "Enable",
      machineDetectionTimeout: 5,
    });
    return call.sid;
  }

  async hangup(callControlId: string): Promise<void> {
    await this.client.calls(callControlId).update({ status: "completed" });
  }

  async startStreaming(
    callControlId: string,
    streamUrl: string,
  ): Promise<void> {
    await this.client.calls(callControlId).streams.create({
      url: streamUrl,
    });
  }

  async speak(callControlId: string, content: string): Promise<void> {
    await this.client
      .calls(callControlId)
      .update({ twiml: `<Response><Say>${content}</Say></Response>` });
  }

  async startTranscription(callControlId: string): Promise<void> {
    await this.client
      .calls(callControlId)
      .transcriptions.create({ track: "inbound_track" });
  }
}
