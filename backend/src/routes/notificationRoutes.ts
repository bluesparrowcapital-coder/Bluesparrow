import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import * as notifCtrl from '../controllers/notificationController';

const router = Router();

router.use(authenticate);

router.get('/',                    notifCtrl.listNotifications);
router.patch('/read-all',          notifCtrl.markAllRead);
router.patch('/:id/read',          notifCtrl.markRead);
router.delete('/:id',              notifCtrl.deleteNotification);

export default router;
