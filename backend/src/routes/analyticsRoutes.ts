import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import * as analyticsCtrl from '../controllers/analyticsController';

const router = Router();

router.use(authenticate);

router.get('/allocation',     analyticsCtrl.getAssetAllocation);
router.get('/returns',        analyticsCtrl.getReturns);
router.get('/benchmarks',     analyticsCtrl.getBenchmarks);
router.get('/sip-summary',    analyticsCtrl.getSipSummary);

export default router;
