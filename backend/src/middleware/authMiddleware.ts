import { Request, Response, NextFunction } from 'express';

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }

  // Support demo / development testing header if configured
  if (process.env.NODE_ENV === 'development' && req.headers['x-user-id']) {
    return next();
  }

  return res.status(401).json({
    error: 'Unauthorized',
    message: 'You must be logged in with Google to access this resource.',
  });
}
