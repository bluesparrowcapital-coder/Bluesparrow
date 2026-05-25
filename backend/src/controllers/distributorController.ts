import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import * as svc from '../services/distributorService';

// ─── Helper ───────────────────────────────────────────────

async function resolveDistributorId(userId: string): Promise<string> {
  const profile = await svc.getProfile(userId);
  if (!profile) throw new Error('Distributor profile not found. Please complete your profile first.');
  return profile.id;
}

// ─── Distributor Registration (public) ──────────────────

export async function registerDistributor(req: Request, res: Response) {
  try {
    const { phone, pin, fullName, email, arnNumber, firmName, euinNumber } = req.body;
    if (!phone || !pin || !fullName || !email || !arnNumber || !firmName) {
      return res.status(400).json({ success: false, message: 'phone, pin, fullName, email, arnNumber, firmName are required' });
    }
    if (!/^\d{4,6}$/.test(pin)) {
      return res.status(400).json({ success: false, message: 'PIN must be 4-6 digits' });
    }
    const user = await svc.registerDistributor({ phone, pin, fullName, email, arnNumber, firmName, euinNumber });
    return res.status(201).json({ success: true, message: 'Distributor account created. Please login.', data: user });
  } catch (err: any) {
    const status = err.message.includes('already') ? 409 : 500;
    return res.status(status).json({ success: false, message: err.message });
  }
}

// ─── Profile ──────────────────────────────────────────────

export async function getProfile(req: AuthRequest, res: Response) {
  try {
    const profile = await svc.getProfile(req.user!.userId);
    return res.json({ success: true, profile });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function upsertProfile(req: AuthRequest, res: Response) {
  try {
    const { arnNumber, euinNumber, firmName } = req.body;
    if (!arnNumber || !firmName) {
      return res.status(400).json({ success: false, message: 'arnNumber and firmName are required' });
    }
    const profile = await svc.createOrUpdateProfile(req.user!.userId, { arnNumber, euinNumber, firmName });
    return res.json({ success: true, profile });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ─── Dashboard ────────────────────────────────────────────

export async function getDashboard(req: AuthRequest, res: Response) {
  try {
    const distributorId = await resolveDistributorId(req.user!.userId);
    const stats = await svc.getDashboardStats(distributorId);

    await svc.createAuditLog(distributorId, 'DASHBOARD_VIEW', 'dashboard', undefined, undefined, req.ip);
    return res.json({ success: true, stats });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ─── Clients ──────────────────────────────────────────────

export async function listClients(req: AuthRequest, res: Response) {
  try {
    const distributorId = await resolveDistributorId(req.user!.userId);
    const { search, page, limit } = req.query;
    const result = await svc.getClients(
      distributorId,
      search as string | undefined,
      Number(page) || 1,
      Number(limit) || 20,
    );
    return res.json({ success: true, ...result });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function getClientDetail(req: AuthRequest, res: Response) {
  try {
    const distributorId = await resolveDistributorId(req.user!.userId);
    const { clientId }  = req.params;
    const detail = await svc.getClientDetail(distributorId, clientId);

    await svc.createAuditLog(distributorId, 'CLIENT_VIEW', 'client', clientId, undefined, req.ip);
    return res.json({ success: true, ...detail });
  } catch (err: any) {
    return res.status(err.message.includes('not found') ? 404 : 500).json({ success: false, message: err.message });
  }
}

// ─── Reports ──────────────────────────────────────────────

export async function getAumReport(req: AuthRequest, res: Response) {
  try {
    const distributorId = await resolveDistributorId(req.user!.userId);
    const groupBy = (req.query.groupBy as 'fund' | 'category') || 'category';
    const data    = await svc.getAumReport(distributorId, groupBy);
    return res.json({ success: true, data, groupBy });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function getSipReport(req: AuthRequest, res: Response) {
  try {
    const distributorId = await resolveDistributorId(req.user!.userId);
    const { status }    = req.query;
    const result = await svc.getSipReport(distributorId, status as string | undefined);
    return res.json({ success: true, ...result });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function getMonthlySummary(req: AuthRequest, res: Response) {
  try {
    const distributorId = await resolveDistributorId(req.user!.userId);
    const data = await svc.getMonthlySummary(distributorId);
    return res.json({ success: true, ...data });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

// ─── Model Portfolios ─────────────────────────────────────

export async function listModelPortfolios(req: AuthRequest, res: Response) {
  try {
    const distributorId = await resolveDistributorId(req.user!.userId);
    const portfolios    = await svc.getModelPortfolios(distributorId);
    return res.json({ success: true, portfolios });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}

export async function createModelPortfolio(req: AuthRequest, res: Response) {
  try {
    const distributorId = await resolveDistributorId(req.user!.userId);
    const { name, description, funds } = req.body;
    if (!name || !Array.isArray(funds) || funds.length === 0) {
      return res.status(400).json({ success: false, message: 'name and funds[] are required' });
    }
    const mp = await svc.createModelPortfolio(distributorId, { name, description, funds });
    await svc.createAuditLog(distributorId, 'MODEL_PORTFOLIO_CREATE', 'model_portfolio', mp.id, { name }, req.ip);
    return res.status(201).json({ success: true, portfolio: mp });
  } catch (err: any) {
    return res.status(400).json({ success: false, message: err.message });
  }
}

export async function updateModelPortfolio(req: AuthRequest, res: Response) {
  try {
    const distributorId = await resolveDistributorId(req.user!.userId);
    const { id }        = req.params;
    const { name, description, isActive } = req.body;
    const mp = await svc.updateModelPortfolio(distributorId, id, { name, description, isActive });
    await svc.createAuditLog(distributorId, 'MODEL_PORTFOLIO_UPDATE', 'model_portfolio', id, req.body, req.ip);
    return res.json({ success: true, portfolio: mp });
  } catch (err: any) {
    return res.status(err.message.includes('not found') ? 404 : 400).json({ success: false, message: err.message });
  }
}

export async function deleteModelPortfolio(req: AuthRequest, res: Response) {
  try {
    const distributorId = await resolveDistributorId(req.user!.userId);
    const { id }        = req.params;
    await svc.deleteModelPortfolio(distributorId, id);
    await svc.createAuditLog(distributorId, 'MODEL_PORTFOLIO_DELETE', 'model_portfolio', id, undefined, req.ip);
    return res.json({ success: true, message: 'Model portfolio deleted' });
  } catch (err: any) {
    return res.status(err.message.includes('not found') ? 404 : 400).json({ success: false, message: err.message });
  }
}

export async function assignModelPortfolio(req: AuthRequest, res: Response) {
  try {
    const distributorId = await resolveDistributorId(req.user!.userId);
    const { id }        = req.params;
    const { userId }    = req.body;
    if (!userId) return res.status(400).json({ success: false, message: 'userId is required' });

    const assignment = await svc.assignModelPortfolio(distributorId, id, userId);
    await svc.createAuditLog(distributorId, 'MODEL_PORTFOLIO_ASSIGN', 'model_portfolio', id, { userId }, req.ip);
    return res.json({ success: true, assignment });
  } catch (err: any) {
    return res.status(err.message.includes('not found') ? 404 : 400).json({ success: false, message: err.message });
  }
}

// ─── Audit Logs ───────────────────────────────────────────

export async function getAuditLogs(req: AuthRequest, res: Response) {
  try {
    const distributorId = await resolveDistributorId(req.user!.userId);
    const { page, limit } = req.query;
    const result = await svc.getAuditLogs(distributorId, Number(page) || 1, Number(limit) || 50);
    return res.json({ success: true, ...result });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
