import { createApp } from './app.js';
import { config } from './config/index.js';
import { initEmailWorker } from './workers/emailWorker.js';
import { initElasticsearchIndex } from './config/elasticsearch.js';
import { prisma } from './config/prisma.js';
import { redisClient } from './config/redis.js';
import { emailQueue } from './queues/emailQueue.js';
import { logger } from './utils/logger.js';

async function bootstrap() {
  try {
    logger.info('Initializing ReachInbox Backend Services...');

    // 1. Initialize Elasticsearch index
    await initElasticsearchIndex();

    // 2. Initialize BullMQ email worker
    const worker = initEmailWorker();
    logger.info(`BullMQ Worker initialized with concurrency: ${config.worker.concurrency}`);

    // 3. Create Express app
    const app = createApp();

    // 4. Start HTTP Server
    const server = app.listen(config.port, () => {
      logger.info(`ReachInbox Backend API listening on http://localhost:${config.port}`);
      logger.info(`BullMQ Live Dashboard: http://localhost:${config.port}/admin/queues`);
      logger.info(`Frontend URL: ${config.frontendUrl}`);
    });

    // Graceful Shutdown
    const shutdown = async (signal: string) => {
      logger.info(`Received ${signal}. Shutting down gracefully...`);
      server.close(async () => {
        logger.info('HTTP server closed.');
        try {
          await worker.close();
          logger.info('BullMQ worker closed.');
          await emailQueue.close();
          logger.info('BullMQ emailQueue closed.');
          await redisClient.quit();
          logger.info('Redis connection closed.');
          await prisma.$disconnect();
          logger.info('Prisma disconnected.');
          process.exit(0);
        } catch (error) {
          logger.error({ error }, 'Error during graceful shutdown');
          process.exit(1);
        }
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (error) {
    logger.fatal({ error }, 'Fatal error bootstrapping server');
    process.exit(1);
  }
}

bootstrap();
