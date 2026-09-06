import { Queue } from 'bullmq';
import { createRedisConnection } from '../config/redis.js';
import { EmailJobData } from '../types/index.js';
import { logger } from '../utils/logger.js';

export const EMAIL_QUEUE_NAME = 'email-queue';

export const emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
  connection: createRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: {
      age: 24 * 3600, // keep for 24 hours in completed set
      count: 5000,
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // keep failed for 7 days
    },
  },
});

emailQueue.on('error', (err) => {
  logger.error({ err }, 'BullMQ emailQueue error');
});

/**
 * Adds an email send job to BullMQ with a specific delay in milliseconds
 */
export async function enqueueEmailJob(data: EmailJobData, delayMs: number, jobId?: string) {
  const job = await emailQueue.add('send-email', data, {
    delay: Math.max(0, delayMs),
    jobId: jobId || `email_${data.emailId}`,
  });
  return job;
}

/**
 * Reschedules an existing email job to a future delay (e.g. after rate limit)
 */
export async function rescheduleEmailJob(data: EmailJobData, delayMs: number) {
  const newJobId = `email_${data.emailId}_rescheduled_${Date.now()}`;
  const job = await emailQueue.add('send-email', data, {
    delay: Math.max(1000, delayMs),
    jobId: newJobId,
  });
  return job;
}
