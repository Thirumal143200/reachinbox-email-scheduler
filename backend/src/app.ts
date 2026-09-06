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

  // Trust Render's reverse proxy so Express correctly reads X-Forwarded-Proto.
  // Required for req.secure = true, which express-session needs to set Secure cookies.
  if (config.env === 'production') {
    app.set('trust proxy', 1);
  }

  // CORS configuration ? credentials:true requires an explicit origin list (no wildcard).
  // In production the Vercel frontend origin must be in the allowed list.
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

  // Session configuration with Redis store fallback.
  // Production: sameSite:'none' + secure:true is required for cross-origin cookies
  //   (Vercel frontend <-> Render backend). Browsers silently drop lax cookies
  //   on cross-site requests even with credentials:include.
  // Development: sameSite:'lax' works fine for same-host localhost usage.
  const isProd = config.env === 'production';

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
        secure: isProd,           // HTTPS-only in production (requires trust proxy above)
        httpOnly: true,           // Never accessible via document.cookie
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
        sameSite: isProd ? 'none' : 'lax', // 'none' required for cross-origin (Vercel<->Render)
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
