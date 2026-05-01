import { Router } from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { getMyNotifications, markNotificationRead } from '../controllers/notificationController.js';

const router = Router();

router.get('/', protect, getMyNotifications);
router.patch('/:id/read', protect, markNotificationRead);

export default router;
