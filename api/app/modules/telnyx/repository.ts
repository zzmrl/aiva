import client from "./client";

export async function answerCall(callControlId: string): Promise<void> {
  await client.calls.actions.answer(callControlId, {
    send_silence_when_idle: true,
  });

  await client.calls.actions.startNoiseSuppression(callControlId, {
    direction: "inbound",
  });
}

export async function speak(
  callControlId: string,
  payload: string,
): Promise<void> {
  await client.calls.actions.speak(callControlId, {
    payload,
    voice: "Telnyx.NaturalHD.Estelle",
  });
}

export async function startTranscription(callControlId: string): Promise<void> {
  await client.calls.actions.startTranscription(callControlId, {
    transcription_engine: "Telnyx",
    transcription_tracks: "inbound",
  });
}

export async function sendSms(
  to: string,
  from: string,
  text: string,
): Promise<void> {
  await client.messages.send({ to, from, text });
}
