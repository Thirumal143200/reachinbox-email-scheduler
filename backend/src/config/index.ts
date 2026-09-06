import dotenv from 'dotenv';
import path from 'path';

// Load from root .env or local .env
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config();

export const config = {
  env: process.env.NODE_ENV || 'development',
  isDev: (process.env.NODE_ENV || 'development') === 'development',
  port: parseInt(process.env.PORT || '5000', 10),
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  sessionSecret: process.env.SESSION_SECRET || 'super_secret_session_reachinbox_default_key_32',
  encryptionKey: process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef',

  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgrespassword@localhost:5432/reachinbox?schema=public',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  elasticsearch: {
    url: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
    apiKey: process.env.ELASTICSEARCH_API_KEY || '',
  },

  worker: {
    concurrency: parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
    minDelayMs: parseInt(process.env.MIN_EMAIL_DELAY_MS || '2000', 10),
    maxEmailsPerHour: parseInt(process.env.MAX_EMAILS_PER_HOUR_PER_SENDER || '100', 10),
  },

  smtp: {
    host: process.env.SMTP_HOST || 'smtp.ethereal.email',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    fromName: process.env.EMAIL_FROM_NAME || 'ReachInbox Demo',
    fromAddress: process.env.EMAIL_FROM_ADDRESS || 'demo@reachinbox.ai',
  },

  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    callbackUrl: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback',
  },

  slack: {
    clientId: process.env.SLACK_CLIENT_ID || '',
    clientSecret: process.env.SLACK_CLIENT_SECRET || '',
    redirectUri: process.env.SLACK_REDIRECT_URI || 'http://localhost:5000/api/slack/callback',
  },
};
