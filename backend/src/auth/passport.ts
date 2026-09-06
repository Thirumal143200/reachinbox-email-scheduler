import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { prisma } from '../config/prisma.js';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export function configurePassport() {
  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await prisma.user.findUnique({ where: { id } });
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });

  if (config.google.clientId && config.google.clientSecret) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: config.google.clientId,
          clientSecret: config.google.clientSecret,
          callbackURL: config.google.callbackUrl,
          scope: ['profile', 'email'],
        },
        async (accessToken, refreshToken, profile, done) => {
          try {
            const googleId = profile.id;
            const email = profile.emails?.[0]?.value;
            const name = profile.displayName || profile.name?.givenName || 'Google User';
            const avatar = profile.photos?.[0]?.value || null;

            if (!email) {
              return done(new Error('No email found in Google profile'), undefined);
            }

            const user = await prisma.user.upsert({
              where: { googleId },
              update: { name, avatar, email },
              create: {
                googleId,
                email,
                name,
                avatar,
              },
            });

            // Ensure a default sender exists for this user
            await prisma.sender.upsert({
              where: {
                userId_email: {
                  userId: user.id,
                  email: user.email,
                },
              },
              update: {},
              create: {
                userId: user.id,
                email: user.email,
                displayName: user.name,
              },
            });

            logger.info({ userId: user.id, email: user.email }, 'User authenticated with Google OAuth');
            return done(null, user);
          } catch (error) {
            logger.error({ error }, 'Error in Google OAuth verify callback');
            return done(error as Error, undefined);
          }
        }
      )
    );
    logger.info('Google OAuth 2.0 strategy registered');
  } else {
    logger.warn('Google OAuth credentials not yet configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to enable Google login.');
  }
}
