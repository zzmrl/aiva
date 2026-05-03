import type * as PgBoss from "pg-boss";
import boss from "../../shared/queue";
import * as messageService from "../message/service";
import twilioClient from "./client";
import appLogger from "../../shared/logger";

const logger = appLogger.child({ module: "twilio:smsWorker" });

export const SMS_QUEUE = "sms-reply";

export type SmsJobData = {
  to: string;
  from: string;
};

async function processJob(jobs: PgBoss.Job<SmsJobData>[]): Promise<void> {
  await Promise.all(jobs.map(processOne));
}

async function processOne(job: PgBoss.Job<SmsJobData>): Promise<void> {
  const { to, from } = job.data;
  logger.debug({ to, from, jobId: job.id }, "processing SMS job");

  const reply = await messageService.generateResponse(to, from);

  if (!twilioClient) {
    logger.warn({ jobId: job.id }, "outbound SMS disabled - no Twilio client");
    return;
  }

  await twilioClient.messages.create({ body: reply, from: to, to: from });
  logger.debug({ to: from, jobId: job.id }, "outbound SMS sent");
}

export async function enqueue(to: string, from: string): Promise<void> {
  await boss.send(SMS_QUEUE, { to, from }, {
    retryLimit: 5,
    retryDelay: 30,
    retryBackoff: true,
  });
}

export async function start(): Promise<void> {
  await boss.start();
  await boss.createQueue(SMS_QUEUE);
  await boss.work<SmsJobData>(SMS_QUEUE, { localConcurrency: 5 }, processJob);
  logger.info("SMS worker started");
}

export async function stop(): Promise<void> {
  await boss.stop();
  logger.info("SMS worker stopped");
}
