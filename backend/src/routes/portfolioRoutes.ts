import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { fetchPortfolio, fetchTransactions, invest, redeem, switchHolding } from '../controllers/portfolioController';

const router = Router();

router.get('/',             authenticate, fetchPortfolio);
router.get('/transactions', authenticate, fetchTransactions);
router.post('/invest',      authenticate, invest);
router.post('/redeem',      authenticate, redeem);
router.post('/switch',      authenticate, switchHolding);

export default router;
