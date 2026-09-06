import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import session from 'express-session';
import { RedisStore } from 'connect-redis';
import passport from 'passport';
import { config } from './config/index.js';
import { redisClient } from './config/redis.js';
import { configurePassport } from './auth/passport.js';
import apiRouter from './routes/index.js';
import { setupBullBoard } from './queues/bullBoard.js';
import { logger } from './utils/logger.js';

export function createApp() {
  const app = express();

  // CORS configuration
  app.use(
    cors({
      origin: [config.frontendUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'x-user-id'],
    })
  );

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // Session configuration with Redis store fallback
  let sessionStore;
  try {
    sessionStore = new RedisStore({
      client: redisClient,
      prefix: 'reachinbox:sess:',
    });
  } catch (err) {
    logger.warn({ err }, 'Redis session store creation failed, using memory store');
  }

  app.use(
    session({
      store: sessionStore,
      secret: config.sessionSecret,
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: config.env === 'production',
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        sameSite: 'lax',
      },
    })
  );

  // Passport authentication
  configurePassport();
  app.use(passport.initialize());
  app.use(passport.session());

  // Bull Board Queue Dashboard
  const bullBoardAdapter = setupBullBoard();
  app.use('/admin/queues', bullBoardAdapter.getRouter());

  // API Routes
  app.use('/api', apiRouter);

  // Centralized Error Handling Middleware
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    logger.error(
      {
        path: req.path,
        method: req.method,
        error: err.message,
        stack: config.isDev ? err.stack : undefined,
      },
      'Unhandled Application Error'
    );

    const statusCode = err.status || err.statusCode || 500;
    res.status(statusCode).json({
      error: 'An unexpected error occurred',
      message: config.isDev ? err.message : 'Internal Server Error',
    });
  });

  return app;
}
