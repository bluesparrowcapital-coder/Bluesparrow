import { Request, Response } from 'express';
import * as analyticsService from '../services/analyticsService';

export async function getAssetAllocation(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;
    const data = await analyticsService.getAssetAllocation(userId);
    return res.json({ success: true, ...data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function getReturns(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;
    const data = await analyticsService.getPortfolioReturns(userId);
    return res.json({ success: true, ...data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function getBenchmarks(_req: Request, res: Response) {
  const data = analyticsService.getBenchmarkData();
  return res.json({ success: true, benchmarks: data });
}

export async function getSipSummary(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;
    const data = await analyticsService.getSipSummary(userId);
    return res.json({ success: true, ...data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
