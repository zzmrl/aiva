import Telnyx from "telnyx";

const telnyx = new Telnyx();

export async function answerCall(callControlId: string): Promise<void> {
  await telnyx.calls.actions.answer(callControlId, {
    send_silence_when_idle: true,
  });

  await telnyx.calls.actions.startNoiseSuppression(callControlId, {
    direction: "inbound",
  });
}

export async function speak(
  callControlId: string,
  content: string,
): Promise<void> {
  await telnyx.calls.actions.speak(callControlId, {
    payload: content,
    voice: "Telnyx.NaturalHD.Estelle",
  });
}

export async function startTranscription(
  callControlId: string,
): Promise<void> {
  await telnyx.calls.actions.startTranscription(callControlId, {
    transcription_engine: "Telnyx",
    transcription_tracks: "inbound",
  });
}

export async function sendSms(
  to: string,
  from: string,
  body: string,
): Promise<void> {
  await telnyx.messages.send({ to, from, text: body });
}
