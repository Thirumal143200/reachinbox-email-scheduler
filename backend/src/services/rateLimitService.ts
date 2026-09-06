import { redisClient } from '../config/redis.js';
import { logEvent } from '../utils/logger.js';

export interface RateLimitCheckResult {
  allowed: boolean;
  currentCount: number;
  limit: number;
  hourWindow: string;
  nextWindowDelayMs: number;
  nextWindowStartTime: Date;
}

export const rateLimitService = {
  /**
   * Returns standard hour window string: YYYY-MM-DD-HH
   */
  getHourWindow(date: Date = new Date()): string {
    const y = date.getUTCFullYear();
    const m = String(date.getUTCMonth() + 1).padStart(2, '0');
    const d = String(date.getUTCDate()).padStart(2, '0');
    const h = String(date.getUTCHours()).padStart(2, '0');
    return `${y}-${m}-${d}-${h}`;
  },

  /**
   * Computes the exact timestamp when the next hour begins
   */
  getNextHourStartTime(date: Date = new Date()): Date {
    const next = new Date(date);
    next.setUTCMinutes(0, 0, 0);
    next.setUTCHours(next.getUTCHours() + 1);
    return next;
  },

  /**
   * Atomically checks and consumes 1 email credit for senderId in current hour window.
   * If limit is exceeded, does not drop job; returns allowed: false with delay to next window.
   */
  async checkAndIncrement(senderId: string, limit: number): Promise<RateLimitCheckResult> {
    const now = new Date();
    const hourWindow = this.getHourWindow(now);
    const key = `email-rate-limit:${senderId}:${hourWindow}`;

    // Atomic INCR with TTL guarantee
    const pipeline = redisClient.pipeline();
    pipeline.incr(key);
    pipeline.ttl(key);
    const results = await pipeline.exec();

    const currentCount = (results?.[0]?.[1] as number) || 1;
    const ttl = (results?.[1]?.[1] as number) || -1;

    // Set TTL of 2 hours if key newly created or without expiry
    if (ttl === -1 || currentCount === 1) {
      await redisClient.expire(key, 7200);
    }

    const nextStartTime = this.getNextHourStartTime(now);
    const nextWindowDelayMs = Math.max(1000, nextStartTime.getTime() - now.getTime());

    if (currentCount > limit) {
      logEvent.rateLimitReached({
        senderId,
        hourWindow,
        currentCount,
        limit,
      });

      return {
        allowed: false,
        currentCount,
        limit,
        hourWindow,
        nextWindowDelayMs,
        nextWindowStartTime: nextStartTime,
      };
    }

    return {
      allowed: true,
      currentCount,
      limit,
      hourWindow,
      nextWindowDelayMs,
      nextWindowStartTime: nextStartTime,
    };
  },

  /**
   * Ensures only ONE Slack notification is sent per sender per hour window
   */
  async shouldNotifySlack(senderId: string, hourWindow: string): Promise<boolean> {
    const key = `slack-rate-limit-notified:${senderId}:${hourWindow}`;
    // SET key value EX 7200 NX returns "OK" if set, null if key already existed
    const result = await redisClient.set(key, '1', 'EX', 7200, 'NX');
    return result === 'OK';
  },
};
