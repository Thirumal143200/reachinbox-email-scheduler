import { WebClient } from '@slack/web-api';
import { prisma } from '../config/prisma.js';
import { decryptToken } from '../utils/encryption.js';
import { logger, logEvent } from '../utils/logger.js';

export const slackService = {
  /**
   * Sends a rate limit warning message to the user's connected Slack workspace/channel
   */
  async notifyRateLimitReached(params: {
    userId: string;
    senderId: string;
    senderEmail: string;
    limit: number;
    hourWindow: string;
  }): Promise<boolean> {
    const { userId, senderId, senderEmail, limit, hourWindow } = params;

    try {
      const connection = await prisma.slackConnection.findUnique({
        where: { userId },
      });

      if (!connection || connection.status !== 'CONNECTED') {
        logEvent.slackNotificationSkipped({
          userId,
          reason: 'No active Slack connection found for user',
        });
        return false;
      }

      const accessToken = decryptToken(connection.encryptedAccessToken);
      if (!accessToken) {
        logEvent.slackNotificationSkipped({
          userId,
          reason: 'Failed to decrypt Slack access token',
        });
        return false;
      }

      const client = new WebClient(accessToken);

      // Determine target channel: either configured channel or default to primary user DM / general
      const channel = connection.slackChannelId || '#general';

      const messageText = `⚠️ *Rate Limit Exceeded — ReachInbox*\nSender \`${senderEmail}\` reached the hourly send limit of *${limit} emails/hour* for window \`${hourWindow}\`. Remaining queued emails have been automatically rescheduled to the next available hour window.`;

      await client.chat.postMessage({
        channel,
        text: messageText,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '⚠️ Hourly Rate Limit Warning',
              emoji: true,
            },
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Sender:*\n${senderEmail}`,
              },
              {
                type: 'mrkdwn',
                text: `*Configured Limit:*\n${limit} emails/hour`,
              },
              {
                type: 'mrkdwn',
                text: `*Time Window:*\n${hourWindow}`,
              },
              {
                type: 'mrkdwn',
                text: `*Status:*\nRescheduled to next window`,
              },
            ],
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: 'Emails are preserved in Redis queue and will resume automatically without data loss.',
              },
            ],
          },
        ],
      });

      logEvent.slackNotificationSent({
        userId,
        senderId,
        channel,
      });

      return true;
    } catch (error: any) {
      logger.error({ error: error.message, userId, senderId }, 'Failed to send Slack rate limit alert');
      return false;
    }
  },
};
