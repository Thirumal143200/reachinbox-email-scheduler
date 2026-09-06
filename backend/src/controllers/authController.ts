import { Request, Response } from 'express';
import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';

export const authController = {
  /**
   * Returns authenticated user profile or 401
   */
  async getMe(req: Request, res: Response) {
    if (req.isAuthenticated && req.isAuthenticated() && req.user) {
      return res.json({ user: req.user });
    }

    // In dev mode, if x-user-id header is provided
    if (config.isDev && req.headers['x-user-id']) {
      return res.json({
        user: {
          id: req.headers['x-user-id'],
          email: 'demo@reachinbox.ai',
          name: 'Developer Mode',
          avatar: null,
        },
      });
    }

    return res.status(401).json({ user: null });
  },

  /**
   * Completes Google OAuth login and redirects to frontend dashboard
   */
  googleCallback(req: Request, res: Response) {
    logger.info({ user: (req.user as any)?.email }, 'Google OAuth callback successful');
    res.redirect(`${config.frontendUrl}/?auth=success`);
  },

  /**
   * Destroys session and logs out user
   */
  logout(req: Request, res: Response) {
    req.logout((err) => {
      if (err) {
        logger.error({ err }, 'Error during logout');
        return res.status(500).json({ error: 'Failed to logout' });
      }
      req.session.destroy(() => {
        const isProd = config.env === 'production';
        res.clearCookie('connect.sid', {
          secure: isProd,
          httpOnly: true,
          sameSite: isProd ? 'none' : 'lax',
        });
        return res.json({ message: 'Logged out successfully' });
      });
    });
  },
};
