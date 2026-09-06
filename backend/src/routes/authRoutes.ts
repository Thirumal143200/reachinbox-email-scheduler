import { Router } from 'express';
import passport from 'passport';
import { authController } from '../controllers/authController.js';
import { config } from '../config/index.js';

const router = Router();

router.get('/me', authController.getMe);
router.post('/logout', authController.logout);

// Google OAuth routes
router.get(
  '/google',
  (req, res, next) => {
    if (!config.google.clientId) {
      return res.status(400).json({
        error: 'Google OAuth not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.',
      });
    }
    next();
  },
  passport.authenticate('google', { scope: ['profile', 'email'] })
);

router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${config.frontendUrl}/?auth=failure`,
  }),
  authController.googleCallback
);

export default router;
