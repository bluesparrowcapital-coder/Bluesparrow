import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { listFunds, listCategories, getFund } from '../controllers/fundController';

const router = Router();

router.get('/',            authenticate, listFunds);
router.get('/categories',  authenticate, listCategories);
router.get('/:id',         authenticate, getFund);

export default router;
