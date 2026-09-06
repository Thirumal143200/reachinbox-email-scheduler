import { Worker, Job } from 'bullmq';
import { EMAIL_QUEUE_NAME, rescheduleEmailJob } from '../queues/emailQueue.js';
import { createRedisConnection, redisClient } from '../config/redis.js';
import { config } from '../config/index.js';
import { prisma } from '../config/prisma.js';
import { emailService } from '../services/emailService.js';
import { rateLimitService } from '../services/rateLimitService.js';
import { slackService } from '../services/slackService.js';
import { searchService } from '../services/searchService.js';
import { EmailJobData } from '../types/index.js';
import { logger, logEvent } from '../utils/logger.js';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function initEmailWorker(): Worker<EmailJobData> {
  const worker = new Worker<EmailJobData>(
    EMAIL_QUEUE_NAME,
    async (job: Job<EmailJobData>) => {
      const {
        emailId,
        userId,
        senderId,
        senderEmail,
        recipient,
        subject,
        body,
        hourlyLimit,
        minDelayMs,
      } = job.data;

      logEvent.emailProcessing({
        emailId,
        jobId: job.id,
        senderId,
        recipient,
      });

      // 1. Idempotency Verification from PostgreSQL
      const emailRecord = await prisma.email.findUnique({
        where: { id: emailId },
      });

      if (!emailRecord) {
        logger.warn({ emailId }, 'Email record not found in database. Skipping job.');
        return { status: 'skipped', reason: 'record_not_found' };
      }

      // If already sent, do NOT send again (Idempotency guarantee)
      if (emailRecord.status === 'SENT') {
        logger.info({ emailId, recipient }, 'Email has already been sent previously. Skipping duplicate send.');
        return { status: 'skipped', reason: 'already_sent' };
      }

      // 2. Distributed Hourly Rate Limiting Check
      const rateLimit = await rateLimitService.checkAndIncrement(
        senderId,
        hourlyLimit || config.worker.maxEmailsPerHour
      );

      if (!rateLimit.allowed) {
        // Limit reached: Do not drop! Reschedule to next hour window
        logger.warn(
          {
            emailId,
            senderId,
            currentCount: rateLimit.currentCount,
            limit: rateLimit.limit,
            nextWindowDelayMs: rateLimit.nextWindowDelayMs,
          },
          'Sender exceeded hourly rate limit. Rescheduling job to next window.'
        );

        // Check if Slack notification should be sent (only once per hour window)
        const shouldNotify = await rateLimitService.shouldNotifySlack(senderId, rateLimit.hourWindow);
        if (shouldNotify) {
          await slackService.notifyRateLimitReached({
            userId,
            senderId,
            senderEmail,
            limit: rateLimit.limit,
            hourWindow: rateLimit.hourWindow,
          });
        }

        // Update database scheduledAt timestamp to the start of the next hour
        await prisma.email.update({
          where: { id: emailId },
          data: {
            scheduledAt: rateLimit.nextWindowStartTime,
            status: 'SCHEDULED',
          },
        });

        // Enqueue delayed job for next window
        const rescheduled = await rescheduleEmailJob(job.data, rateLimit.nextWindowDelayMs);

        logEvent.emailRescheduled({
          emailId,
          senderId,
          newScheduledAt: rateLimit.nextWindowStartTime.toISOString(),
        });

        return {
          status: 'rescheduled',
          rescheduledJobId: rescheduled.id,
          nextWindowStartTime: rateLimit.nextWindowStartTime,
        };
      }

      // 3. Distributed Minimum Delay between individual sends
      const effectiveDelay = minDelayMs || config.worker.minDelayMs;
      const lastSentKey = `email-sender-last-sent:${senderId}`;
      const lastSentTimeStr = await redisClient.get(lastSentKey);

      if (lastSentTimeStr) {
        const elapsed = Date.now() - parseInt(lastSentTimeStr, 10);
        if (elapsed < effectiveDelay) {
          const waitNeeded = effectiveDelay - elapsed;
          await sleep(waitNeeded);
        }
      }

      // Mark current dispatch time in Redis
      await redisClient.set(lastSentKey, Date.now().toString(), 'EX', 300);

      // 4. Mark status as PROCESSING in Database
      await prisma.email.update({
        where: { id: emailId },
        data: {
          status: 'PROCESSING',
          jobId: job.id,
          attempts: { increment: 1 },
        },
      });

      // 5. Dispatch email via Ethereal SMTP
      const sendResult = await emailService.sendEmail({
        to: recipient,
        subject,
        body,
        from: senderEmail,
      });

      // 6. State Transition: SENT or FAILED
      if (sendResult.success) {
        const updated = await prisma.email.update({
          where: { id: emailId },
          data: {
            status: 'SENT',
            sentAt: new Date(),
            etherealPreviewUrl: sendResult.etherealPreviewUrl,
            error: null,
          },
        });

        logEvent.emailSent({
          emailId,
          recipient,
          etherealUrl: sendResult.etherealPreviewUrl,
        });

        // Update Elasticsearch index asynchronously
        await searchService.indexEmail({
          emailId: updated.id,
          userId: updated.userId,
          senderId: updated.senderId,
          recipient: updated.recipient,
          subject: updated.subject,
          body: updated.body,
          status: updated.status,
          scheduledAt: updated.scheduledAt,
          sentAt: updated.sentAt,
          createdAt: updated.createdAt,
        });

        return {
          status: 'sent',
          messageId: sendResult.messageId,
          previewUrl: sendResult.etherealPreviewUrl,
        };
      } else {
        const updated = await prisma.email.update({
          where: { id: emailId },
          data: {
            status: 'FAILED',
            error: sendResult.error,
          },
        });

        logEvent.emailFailed({
          emailId,
          recipient,
          error: sendResult.error || 'Send failed',
          attempts: updated.attempts,
        });

        // Update Elasticsearch index
        await searchService.indexEmail({
          emailId: updated.id,
          userId: updated.userId,
          senderId: updated.senderId,
          recipient: updated.recipient,
          subject: updated.subject,
          body: updated.body,
          status: updated.status,
          scheduledAt: updated.scheduledAt,
          sentAt: updated.sentAt,
          createdAt: updated.createdAt,
        });

        throw new Error(`Email dispatch failed: ${sendResult.error}`);
      }
    },
    {
      connection: createRedisConnection(),
      concurrency: config.worker.concurrency,
      limiter: {
        max: 50,
        duration: 1000,
      },
    }
  );

  worker.on('completed', (job) => {
    logger.debug({ jobId: job.id }, 'BullMQ job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, error: err.message }, 'BullMQ job failed');
  });

  worker.on('error', (err) => {
    logger.error({ error: err }, 'BullMQ worker error');
  });

  return worker;
}
