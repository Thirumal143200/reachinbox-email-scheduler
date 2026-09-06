import { Router } from 'express';
import authRoutes from './authRoutes.js';
import emailRoutes from './emailRoutes.js';
import slackRoutes from './slackRoutes.js';

const router = Router();

router.use('/auth', authRoutes);
router.use('/emails', emailRoutes);
router.use('/slack', slackRoutes);

router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

export default router;
