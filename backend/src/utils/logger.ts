import pino from 'pino';
import { config } from '../config/index.js';

export const logger = pino({
  level: config.isDev ? 'debug' : 'info',
  transport: config.isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});

// Structured event logger helpers
export const logEvent = {
  emailScheduled: (data: { emailId: string; recipient: string; scheduledAt: string; jobId?: string }) => {
    logger.info({ event: 'EMAIL_SCHEDULED', ...data }, `[EMAIL_SCHEDULED] Email queued for ${data.recipient}`);
  },
  emailProcessing: (data: { emailId: string; jobId?: string; senderId: string; recipient: string }) => {
    logger.info({ event: 'EMAIL_PROCESSING', ...data }, `[EMAIL_PROCESSING] Processing email ${data.emailId}`);
  },
  emailSent: (data: { emailId: string; recipient: string; etherealUrl?: string | null }) => {
    logger.info({ event: 'EMAIL_SENT', ...data }, `[EMAIL_SENT] Successfully sent to ${data.recipient}`);
  },
  emailFailed: (data: { emailId: string; recipient: string; error: string; attempts: number }) => {
    logger.error({ event: 'EMAIL_FAILED', ...data }, `[EMAIL_FAILED] Failed sending to ${data.recipient}: ${data.error}`);
  },
  rateLimitReached: (data: { senderId: string; hourWindow: string; currentCount: number; limit: number }) => {
    logger.warn({ event: 'RATE_LIMIT_REACHED', ...data }, `[RATE_LIMIT_REACHED] Hourly limit (${data.limit}) reached for sender ${data.senderId}`);
  },
  emailRescheduled: (data: { emailId: string; senderId: string; newScheduledAt: string }) => {
    logger.info({ event: 'EMAIL_RESCHEDULED', ...data }, `[EMAIL_RESCHEDULED] Email ${data.emailId} rescheduled to ${data.newScheduledAt}`);
  },
  slackNotificationSent: (data: { userId: string; senderId: string; channel?: string }) => {
    logger.info({ event: 'SLACK_NOTIFICATION_SENT', ...data }, `[SLACK_NOTIFICATION_SENT] Rate limit warning sent to Slack`);
  },
  slackNotificationSkipped: (data: { userId: string; reason: string }) => {
    logger.info({ event: 'SLACK_NOTIFICATION_SKIPPED', ...data }, `[SLACK_NOTIFICATION_SKIPPED] Slack notification skipped: ${data.reason}`);
  },
  elasticsearchIndexed: (data: { emailId: string; status: string }) => {
    logger.debug({ event: 'ELASTICSEARCH_INDEXED', ...data }, `[ELASTICSEARCH_INDEXED] Indexed email ${data.emailId} in ES`);
  },
};
