import { Request, Response } from 'express';
import * as sipService from '../services/sipService';

export async function createSip(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;
    const { fundId, amount, frequency, sipDate, startDate, endDate, totalInstallments, goalId } = req.body;

    if (!fundId || !amount || !sipDate || !startDate) {
      return res.status(400).json({ error: 'fundId, amount, sipDate and startDate are required' });
    }
    if (typeof amount !== 'number' || amount <= 0) return res.status(400).json({ error: 'Invalid amount' });
    if (typeof sipDate !== 'number') return res.status(400).json({ error: 'sipDate must be a number' });

    const sip = await sipService.createSip({ userId, fundId, amount, frequency, sipDate, startDate, endDate, totalInstallments, goalId });
    return res.status(201).json({ success: true, sip });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
}

export async function listSips(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;
    const sips = await sipService.getUserSips(userId);
    return res.json({ success: true, sips });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function getSip(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;
    const sip = await sipService.getSipById(req.params.id, userId);
    return res.json({ success: true, sip });
  } catch (err: any) {
    const code = err.message === 'SIP not found' ? 404 : 500;
    return res.status(code).json({ error: err.message });
  }
}

export async function pauseSip(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;
    const sip = await sipService.pauseSip(req.params.id, userId);
    return res.json({ success: true, sip });
  } catch (err: any) {
    const code = err.message.includes('not found') ? 404 : 400;
    return res.status(code).json({ error: err.message });
  }
}

export async function resumeSip(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;
    const sip = await sipService.resumeSip(req.params.id, userId);
    return res.json({ success: true, sip });
  } catch (err: any) {
    const code = err.message.includes('not found') ? 404 : 400;
    return res.status(code).json({ error: err.message });
  }
}

export async function cancelSip(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;
    const sip = await sipService.cancelSip(req.params.id, userId);
    return res.json({ success: true, sip });
  } catch (err: any) {
    const code = err.message.includes('not found') ? 404 : 400;
    return res.status(code).json({ error: err.message });
  }
}
