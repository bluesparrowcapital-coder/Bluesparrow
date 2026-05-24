import { Request, Response } from 'express';
import * as goalService from '../services/goalService';

export async function createGoal(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;
    const { goalName, targetAmount, targetDate } = req.body;

    if (!goalName || !targetAmount || !targetDate) {
      return res.status(400).json({ error: 'goalName, targetAmount and targetDate are required' });
    }
    if (typeof targetAmount !== 'number' || targetAmount <= 0)
      return res.status(400).json({ error: 'Invalid targetAmount' });

    const goal = await goalService.createGoal({ userId, goalName, targetAmount, targetDate });
    return res.status(201).json({ success: true, goal });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
}

export async function listGoals(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;
    const goals = await goalService.getUserGoals(userId);
    return res.json({ success: true, goals });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function getGoal(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;
    const goal = await goalService.getGoalById(req.params.id, userId);
    return res.json({ success: true, goal });
  } catch (err: any) {
    const code = err.message === 'Goal not found' ? 404 : 500;
    return res.status(code).json({ error: err.message });
  }
}

export async function updateGoal(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;
    const goal = await goalService.updateGoal(req.params.id, userId, req.body);
    return res.json({ success: true, goal });
  } catch (err: any) {
    const code = err.message === 'Goal not found' ? 404 : 400;
    return res.status(code).json({ error: err.message });
  }
}

export async function deleteGoal(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;
    await goalService.deleteGoal(req.params.id, userId);
    return res.json({ success: true, message: 'Goal deleted' });
  } catch (err: any) {
    const code = err.message === 'Goal not found' ? 404 : 400;
    return res.status(code).json({ error: err.message });
  }
}

export async function linkSip(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;
    const { sipId } = req.body;
    if (!sipId) return res.status(400).json({ error: 'sipId is required' });
    const goal = await goalService.linkSipToGoal(req.params.id, sipId, userId);
    return res.json({ success: true, goal });
  } catch (err: any) {
    const code = err.message.includes('not found') ? 404 : 400;
    return res.status(code).json({ error: err.message });
  }
}

export async function calculateSip(req: Request, res: Response) {
  try {
    const { targetAmount, targetDate, expectedReturn } = req.query;
    if (!targetAmount || !targetDate)
      return res.status(400).json({ error: 'targetAmount and targetDate are required' });

    const result = goalService.calculateSipForGoal(
      parseFloat(targetAmount as string),
      targetDate as string,
      expectedReturn ? parseFloat(expectedReturn as string) : 12,
    );
    return res.json({ success: true, ...result });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
}
