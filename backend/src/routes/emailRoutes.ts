import { Router } from 'express';
import { emailController } from '../controllers/emailController.js';
import { requireAuth } from '../middleware/authMiddleware.js';

const router = Router();

// Apply auth middleware to protect email actions
router.use(requireAuth);

router.post('/schedule', emailController.scheduleEmails);
router.get('/scheduled', emailController.getScheduledEmails);
router.get('/sent', emailController.getSentEmails);
router.get('/search', emailController.searchEmails);

export default router;
