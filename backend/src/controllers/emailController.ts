import { Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import { prisma } from '../config/prisma.js';
import { config } from '../config/index.js';
import { enqueueEmailJob } from '../queues/emailQueue.js';
import { searchService } from '../services/searchService.js';
import { logger, logEvent } from '../utils/logger.js';

const scheduleSchema = z.object({
  recipients: z.array(z.string().email()).min(1, 'At least one valid recipient is required'),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Email body is required'),
  startTime: z.string().or(z.date()),
  delayBetweenEmailsMs: z.number().min(0).optional().default(config.worker.minDelayMs),
  hourlyLimit: z.number().positive().optional().default(config.worker.maxEmailsPerHour),
  senderId: z.string().optional(),
  senderEmail: z.string().email().optional(),
  senderName: z.string().optional(),
});

export const emailController = {
  /**
   * Schedules a batch of emails with delayed BullMQ jobs, stored in PostgreSQL first
   */
  async scheduleEmails(req: Request, res: Response) {
    try {
      const parsed = scheduleSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: parsed.error.format(),
        });
      }

      const {
        recipients,
        subject,
        body,
        startTime,
        delayBetweenEmailsMs,
        hourlyLimit,
        senderId,
        senderEmail,
        senderName,
      } = parsed.data;

      // In authenticated mode, user comes from req.user
      const userId = (req as any).user?.id || req.headers['x-user-id'] || 'default-demo-user';

      // Ensure user exists in database
      const user = await prisma.user.upsert({
        where: { id: String(userId) },
        update: {},
        create: {
          id: String(userId),
          googleId: `google_${userId}`,
          email: (req as any).user?.email || 'user@reachinbox.ai',
          name: (req as any).user?.name || 'ReachInbox User',
          avatar: (req as any).user?.avatar || null,
        },
      });

      // Ensure sender exists in database
      let resolvedSender = null;
      if (senderId) {
        resolvedSender = await prisma.sender.findUnique({ where: { id: senderId } });
      }

      if (!resolvedSender) {
        const emailToUse = senderEmail || config.smtp.fromAddress;
        const nameToUse = senderName || config.smtp.fromName;
        resolvedSender = await prisma.sender.upsert({
          where: {
            userId_email: {
              userId: user.id,
              email: emailToUse,
            },
          },
          update: { displayName: nameToUse },
          create: {
            userId: user.id,
            email: emailToUse,
            displayName: nameToUse,
          },
        });
      }

      const baseStartTime = new Date(startTime);
      const nowMs = Date.now();
      const scheduledEmails = [];

      for (let i = 0; i < recipients.length; i++) {
        const recipient = recipients[i].trim().toLowerCase();
        // Compute staggered execution time per recipient
        const scheduledTime = new Date(baseStartTime.getTime() + i * delayBetweenEmailsMs);
        const delayMs = Math.max(0, scheduledTime.getTime() - nowMs);

        // Unique idempotency key based on user, sender, recipient, subject, scheduledTime, and sequence
        const idempotencyKey = crypto
          .createHash('sha256')
          .update(`${user.id}:${resolvedSender.id}:${recipient}:${subject}:${scheduledTime.getTime()}:${i}`)
          .digest('hex');

        // 1. Transactional persistence: Save in PostgreSQL FIRST with SCHEDULED status
        const email = await prisma.email.upsert({
          where: { idempotencyKey },
          update: {},
          create: {
            userId: user.id,
            senderId: resolvedSender.id,
            recipient,
            subject,
            body,
            scheduledAt: scheduledTime,
            status: 'SCHEDULED',
            idempotencyKey,
            attempts: 0,
          },
        });

        // 2. Create delayed BullMQ job in Redis
        const job = await enqueueEmailJob(
          {
            emailId: email.id,
            userId: user.id,
            senderId: resolvedSender.id,
            senderEmail: resolvedSender.email,
            recipient: email.recipient,
            subject: email.subject,
            body: email.body,
            hourlyLimit,
            minDelayMs: delayBetweenEmailsMs,
          },
          delayMs
        );

        // Update database record with job ID
        await prisma.email.update({
          where: { id: email.id },
          data: { jobId: job.id },
        });

        // Index in Elasticsearch
        searchService.indexEmail({
          emailId: email.id,
          userId: email.userId,
          senderId: email.senderId,
          recipient: email.recipient,
          subject: email.subject,
          body: email.body,
          status: email.status,
          scheduledAt: email.scheduledAt,
          createdAt: email.createdAt,
        });

        logEvent.emailScheduled({
          emailId: email.id,
          recipient: email.recipient,
          scheduledAt: email.scheduledAt.toISOString(),
          jobId: job.id,
        });

        scheduledEmails.push({
          id: email.id,
          recipient: email.recipient,
          scheduledAt: email.scheduledAt,
          status: email.status,
          jobId: job.id,
        });
      }

      return res.status(201).json({
        message: `Successfully scheduled ${scheduledEmails.length} emails`,
        count: scheduledEmails.length,
        emails: scheduledEmails,
      });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to schedule emails');
      return res.status(500).json({ error: 'Internal server error while scheduling emails' });
    }
  },

  /**
   * Retrieves all scheduled (pending / processing) emails for the current user
   */
  async getScheduledEmails(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id || req.headers['x-user-id'] || 'default-demo-user';
      const emails = await prisma.email.findMany({
        where: {
          userId: String(userId),
          status: { in: ['SCHEDULED', 'PROCESSING'] },
        },
        include: {
          sender: { select: { email: true, displayName: true } },
        },
        orderBy: { scheduledAt: 'asc' },
      });

      return res.json({ emails });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to fetch scheduled emails');
      return res.status(500).json({ error: 'Failed to fetch scheduled emails' });
    }
  },

  /**
   * Retrieves all sent (or failed) emails for the current user
   */
  async getSentEmails(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id || req.headers['x-user-id'] || 'default-demo-user';
      const emails = await prisma.email.findMany({
        where: {
          userId: String(userId),
          status: { in: ['SENT', 'FAILED'] },
        },
        include: {
          sender: { select: { email: true, displayName: true } },
        },
        orderBy: { sentAt: 'desc' },
      });

      return res.json({ emails });
    } catch (error: any) {
      logger.error({ error: error.message }, 'Failed to fetch sent emails');
      return res.status(500).json({ error: 'Failed to fetch sent emails' });
    }
  },

  /**
   * Search emails via Elasticsearch with PostgreSQL fallback
   */
  async searchEmails(req: Request, res: Response) {
    try {
      const userId = (req as any).user?.id || req.headers['x-user-id'] || 'default-demo-user';
      const query = (req.query.q as string) || '';
      const status = req.query.status as string | undefined;

      const result = await searchService.searchEmails(String(userId), query, status);
      return res.json(result);
    } catch (error: any) {
      logger.error({ error: error.message }, 'Search emails failed');
      return res.status(500).json({ error: 'Search failed' });
    }
  },
};
