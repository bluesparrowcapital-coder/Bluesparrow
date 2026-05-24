import { Request, Response } from 'express';
import * as notifService from '../services/notificationService';

export async function listNotifications(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;
    const page   = parseInt((req.query.page as string) ?? '1', 10);
    const limit  = parseInt((req.query.limit as string) ?? '20', 10);
    const data   = await notifService.getUserNotifications(userId, page, limit);
    return res.json({ success: true, ...data });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function markRead(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;
    const notif  = await notifService.markAsRead(req.params.id, userId);
    return res.json({ success: true, notification: notif });
  } catch (err: any) {
    const code = err.message === 'Notification not found' ? 404 : 500;
    return res.status(code).json({ error: err.message });
  }
}

export async function markAllRead(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;
    const result = await notifService.markAllRead(userId);
    return res.json({ success: true, ...result });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}

export async function deleteNotification(req: Request, res: Response) {
  try {
    const userId = (req as any).user.userId;
    await notifService.deleteNotification(req.params.id, userId);
    return res.json({ success: true, message: 'Notification deleted' });
  } catch (err: any) {
    const code = err.message === 'Notification not found' ? 404 : 500;
    return res.status(code).json({ error: err.message });
  }
}
