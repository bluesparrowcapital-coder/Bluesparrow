import { Router } from 'express';
import { authenticate } from '../middleware/authMiddleware';
import { fetchPortfolio, fetchTransactions, invest } from '../controllers/portfolioController';

const router = Router();

router.get('/',             authenticate, fetchPortfolio);
router.get('/transactions', authenticate, fetchTransactions);
router.post('/invest',      authenticate, invest);

export default router;
