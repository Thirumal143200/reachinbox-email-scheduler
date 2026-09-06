import { Redis } from 'ioredis';
import { config } from './index.js';
import { logger } from '../utils/logger.js';

// Standard Redis client for application caching & rate limiting
export const redisClient = new Redis(config.redis.url, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  retryStrategy(times) {
    const delay = Math.min(times * 100, 3000);
    return delay;
  },
});

redisClient.on('connect', () => {
  logger.info('Connected to Redis');
});

redisClient.on('error', (err) => {
  logger.error({ err }, 'Redis connection error');
});

/**
 * Creates an isolated Redis instance suitable for BullMQ
 */
export function createRedisConnection(): Redis {
  return new Redis(config.redis.url, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    retryStrategy(times) {
      return Math.min(times * 100, 3000);
    },
  });
}
