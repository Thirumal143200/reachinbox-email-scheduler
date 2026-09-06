import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

export const prisma = new PrismaClient({
  log: [
    { emit: 'event', level: 'error' },
    { emit: 'event', level: 'warn' },
  ],
});

// @ts-ignore
prisma.$on('error', (e: any) => {
  logger.error({ e }, 'Prisma database error');
});

// @ts-ignore
prisma.$on('warn', (e: any) => {
  logger.warn({ e }, 'Prisma database warning');
});
