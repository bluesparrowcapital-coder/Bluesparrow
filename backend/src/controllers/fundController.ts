import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { searchFunds, getFundById, getFundCategories } from '../services/fundService';

// GET /api/funds — search & browse
export async function listFunds(req: AuthRequest, res: Response): Promise<void> {
  try {
    const {
      q, category, risk, sortBy, order,
      page = '1', limit = '20',
    } = req.query as Record<string, string>;

    const result = await searchFunds({
      q, category, risk,
      sortBy:  (sortBy as 'nav' | 'schemeName' | 'aum') || 'schemeName',
      order:   (order as 'asc' | 'desc') || 'asc',
      page:    Math.max(1, parseInt(page) || 1),
      limit:   Math.min(50, Math.max(1, parseInt(limit) || 20)),
    });

    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch funds' });
  }
}

// GET /api/funds/categories
export async function listCategories(_req: AuthRequest, res: Response): Promise<void> {
  try {
    const categories = await getFundCategories();
    res.json({ success: true, data: categories });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch categories' });
  }
}

// GET /api/funds/:id
export async function getFund(req: AuthRequest, res: Response): Promise<void> {
  try {
    const fund = await getFundById(req.params.id);
    if (!fund) {
      res.status(404).json({ success: false, message: 'Fund not found' });
      return;
    }
    res.json({ success: true, data: fund });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to fetch fund' });
  }
}
