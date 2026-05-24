import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import * as goalCtrl from '../controllers/goalController';

const router = Router();

router.use(authenticate);

router.get('/',                  goalCtrl.listGoals);
router.post('/',                 goalCtrl.createGoal);
router.get('/calculator',        goalCtrl.calculateSip);
router.get('/:id',               goalCtrl.getGoal);
router.put('/:id',               goalCtrl.updateGoal);
router.delete('/:id',            goalCtrl.deleteGoal);
router.post('/:id/link-sip',     goalCtrl.linkSip);

export default router;
