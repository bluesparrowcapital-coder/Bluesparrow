import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import {
  getPortfolioSummary,
  getTransactions,
  placeLumpsumOrder,
} from '../services/portfolioService';

// GET /api/portfolio
export async function fetchPortfolio(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const data   = await getPortfolioSummary(userId);
    res.json({ success: true, data });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch portfolio' });
  }
}

// GET /api/portfolio/transactions
export async function fetchTransactions(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const limit  = Math.min(100, parseInt((req.query.limit as string) || '50'));
    const txns   = await getTransactions(userId, limit);
    res.json({ success: true, data: txns });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch transactions' });
  }
}

// POST /api/portfolio/invest
export async function invest(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { fundId, amount } = req.body;

    if (!fundId || typeof fundId !== 'string') {
      res.status(400).json({ success: false, message: 'fundId is required' });
      return;
    }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      res.status(400).json({ success: false, message: 'Valid amount is required' });
      return;
    }

    const result = await placeLumpsumOrder({ userId, fundId, amount: amt });
    res.json({ success: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Investment failed';
    res.status(400).json({ success: false, message });
  }
}
