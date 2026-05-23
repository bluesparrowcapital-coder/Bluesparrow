import { Response } from 'express';
import { z } from 'zod';
import {
  addBankAccount,
  getBankAccounts,
  setDefaultBankAccount,
  deleteBankAccount,
} from '../services/bankService';
import { bankAccountSchema } from '../utils/bankValidators';
import type { AuthRequest } from '../middleware/authMiddleware';

function badRequest(res: Response, errors: z.ZodIssue[]) {
  res.status(400).json({
    success: false,
    message: 'Validation error',
    errors:  errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
  });
}

// ─── POST /bank ───────────────────────────────────────────
export async function addBankHandler(req: AuthRequest, res: Response) {
  const parsed = bankAccountSchema.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error.issues);

  try {
    const account = await addBankAccount(req.user!.userId, parsed.data);
    res.status(201).json({ success: true, message: 'Bank account added', data: account });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

// ─── GET /bank ────────────────────────────────────────────
export async function getBankHandler(req: AuthRequest, res: Response) {
  try {
    const accounts = await getBankAccounts(req.user!.userId);
    res.json({ success: true, data: accounts });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

// ─── PATCH /bank/:id/default ──────────────────────────────
export async function setDefaultHandler(req: AuthRequest, res: Response) {
  try {
    await setDefaultBankAccount(req.user!.userId, req.params.id);
    res.json({ success: true, message: 'Default bank account updated' });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

// ─── DELETE /bank/:id ─────────────────────────────────────
export async function deleteBankHandler(req: AuthRequest, res: Response) {
  try {
    await deleteBankAccount(req.user!.userId, req.params.id);
    res.json({ success: true, message: 'Bank account removed' });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}
