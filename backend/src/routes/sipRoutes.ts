import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import * as sipCtrl from '../controllers/sipController';

const router = Router();

router.use(authenticate);

router.get('/',                  sipCtrl.listSips);
router.post('/',                 sipCtrl.createSip);
router.get('/:id',               sipCtrl.getSip);
router.patch('/:id/pause',       sipCtrl.pauseSip);
router.patch('/:id/resume',      sipCtrl.resumeSip);
router.patch('/:id/cancel',      sipCtrl.cancelSip);

export default router;
