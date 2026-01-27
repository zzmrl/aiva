export interface PhoneProvider {
  readonly name: string;

  /**
   * Send an SMS message
   * @param to - Recipient phone number
   * @param from - Sender phone number
   * @param body - Message content
   */
  sendSms(to: string, from: string, body: string): Promise<void>;

  /**
   * Initiate an outbound call
   * @param to - Recipient phone number
   * @param from - Sender phone number
   * @param webhookUrl
   * @returns Call control ID
   */
  initiateCall(to: string, from: string, webhookUrl?: string): Promise<string>;

  /**
   * Hangup an active call
   * @param callControlId - Unique call identifier
   */
  hangup(callControlId: string): Promise<void>;

  /**
   * Start media streaming for a call
   * @param callControlId - Unique call identifier
   * @param streamUrl - Relative or absolute URL where WebSocket connection will be established
   */
  startStreaming(callControlId: string, streamUrl: string): Promise<void>;

  /**
   * Use the phone provider's text-to-speech service to say something in a call
   * @param callControlId - Unique call identifier
   * @param content - Message to say
   */
  speak(callControlId: string, content: string): Promise<void>;

  /**
   * Start transcription for a call
   * @param callControlId - Unique call identifier
   */
  startTranscription(callControlId: string): Promise<void>;
}
