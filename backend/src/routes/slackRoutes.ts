import { Router } from 'express';
import { slackController } from '../controllers/slackController.js';

const router = Router();

router.get('/status', slackController.getStatus);
router.get('/connect', slackController.connect);
router.get('/callback', slackController.callback);
router.post('/disconnect', slackController.disconnect);

export default router;
