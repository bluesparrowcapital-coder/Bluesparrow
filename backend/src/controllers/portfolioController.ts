import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import {
  getPortfolioSummary,
  getTransactions,
  placeLumpsumOrder,
  redeemUnits,
  switchFund,
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

// POST /api/portfolio/redeem
export async function redeem(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { portfolioId, units, isFullRedemption } = req.body;
    if (!portfolioId) { res.status(400).json({ success: false, message: 'portfolioId is required' }); return; }

    const result = await redeemUnits({ userId, portfolioId, units: units ? parseFloat(units) : undefined, isFullRedemption: !!isFullRedemption });
    res.json({ success: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Redemption failed';
    res.status(400).json({ success: false, message });
  }
}

// POST /api/portfolio/switch
export async function switchHolding(req: AuthRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { fromPortfolioId, toFundId, units, isFullSwitch } = req.body;
    if (!fromPortfolioId || !toFundId) {
      res.status(400).json({ success: false, message: 'fromPortfolioId and toFundId are required' }); return;
    }

    const result = await switchFund({ userId, fromPortfolioId, toFundId, units: units ? parseFloat(units) : undefined, isFullSwitch: !!isFullSwitch });
    res.json({ success: true, data: result });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Switch failed';
    res.status(400).json({ success: false, message });
  }
}
