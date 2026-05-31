import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import * as svc from '../services/distributorService';
import { nseMfClient } from '../integrations/nsemf/NseMfClient';

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

// ─── Distributor Login (public) ───────────────────────────

export async function loginDistributor(req: Request, res: Response) {
  try {
    const { arnNumber, pin } = req.body;
    if (!arnNumber || !pin) {
      return res.status(400).json({ success: false, message: 'arnNumber and pin are required' });
    }
    if (!/^\d{4,6}$/.test(pin)) {
      return res.status(400).json({ success: false, message: 'PIN must be 4-6 digits' });
    }
    const deviceInfo = req.headers['user-agent'];
    const result = await svc.loginDistributorByArn(arnNumber.trim().toUpperCase(), pin, deviceInfo);
    return res.json({ success: true, message: 'Login successful', data: result });
  } catch (err: any) {
    // Use 400 for credential errors (not found / wrong PIN) so the frontend
    // auth interceptor does NOT mistake this for an expired-token 401 and
    // attempt a silent token refresh + retry.
    const status = err.message.includes('locked') ? 423
      : (err.message.includes('not found') || err.message.includes('Wrong PIN') || err.message.includes('PIN not set')) ? 400
      : 500;
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

export async function createClient(req: AuthRequest, res: Response) {
  try {
    const distributorId = await resolveDistributorId(req.user!.userId);
    const parsedBody = typeof req.body.payload === 'string' ? JSON.parse(req.body.payload) : req.body;
    const { fullName, email, phone, panNumber, profile, address, banks, nominees, verification, mobileDeclaration, mailDeclaration } = parsedBody;
    const uploadedFiles = (req.files ?? {}) as Record<string, Express.Multer.File[]>;
    const documentFieldMap: Record<string, string> = {
      panDocument: 'PAN',
      aadhaarDocument: 'AADHAAR',
      photoDocument: 'PHOTO',
      signatureDocument: 'SIGNATURE',
      bankProofDocument: 'BANK',
    };
    const documents = Object.entries(documentFieldMap)
      .map(([fieldName, docType]) => {
        const file = uploadedFiles[fieldName]?.[0];
        if (!file) return null;
        return { docType, docUrl: `/uploads/distributor/${file.filename}` };
      })
      .filter((item): item is { docType: string; docUrl: string } => Boolean(item));

    if (!fullName || !email || !phone || !panNumber || !profile || !address || !Array.isArray(banks) || banks.length === 0 || !Array.isArray(nominees) || nominees.length === 0) {
      return res.status(400).json({ success: false, message: 'fullName, email, phone, panNumber, profile, address, banks and nominees are required' });
    }
    if (!/^[6-9]\d{9}$/.test(String(phone).trim())) {
      return res.status(400).json({ success: false, message: 'Enter valid 10-digit mobile number' });
    }
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(String(panNumber).trim().toUpperCase())) {
      return res.status(400).json({ success: false, message: 'Invalid PAN format' });
    }
    if (!profile.fullNameAsPan || !profile.dob || !profile.gender || !profile.fatherOrSpouseName || !profile.occupation || !profile.taxStatus) {
      return res.status(400).json({ success: false, message: 'Complete personal profile details are required' });
    }
    if (!address.addressLine1 || !address.city || !address.state || !address.pincode) {
      return res.status(400).json({ success: false, message: 'Complete address details are required' });
    }
    if (banks.some((bank: any) => !bank.accountNumber || !bank.ifscCode || !bank.bankName || !bank.accountHolder)) {
      return res.status(400).json({ success: false, message: 'Complete bank details are required' });
    }
    if (verification && verification.termsAccepted !== true) {
      return res.status(400).json({ success: false, message: 'Terms & conditions must be accepted' });
    }

    const result = await svc.createClientForDistributor(distributorId, {
      fullName,
      email,
      phone,
      panNumber,
      mobileDeclaration,
      mailDeclaration,
      profile,
      address,
      banks,
      nominees,
      verification,
      documents,
    });
    await svc.createAuditLog(
      distributorId,
      'CLIENT_CREATE',
      'client',
      result.user.id,
      {
        phone: result.user.phone,
        panNumber: result.user.panNumber,
        mobileDeclaration,
        mailDeclaration,
        holdingType: profile.holdingType,
        countryOfBirth: profile.countryOfBirth,
        sourceOfWealth: address.sourceOfWealth,
        bankCount: banks.length,
        verificationSource: verification?.source,
        uploadedDocumentTypes: documents.map((document) => document.docType),
      },
      req.ip,
    );

    return res.status(201).json({ success: true, message: 'Client created successfully', ...result });
  } catch (err: any) {
    return res.status(err.message.includes('already') ? 409 : 400).json({ success: false, message: err.message });
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

// ─── KYC Check for a given PAN (distributor use — no user account required) ──

export async function checkPanKycStatus(req: AuthRequest, res: Response) {
  try {
    const { pan_no } = req.body;
    const pan = (pan_no ?? '').toString().trim().toUpperCase();
    if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(pan)) {
      return res.status(400).json({ success: false, message: 'Invalid PAN format' });
    }
    const result = await nseMfClient.checkKycStatus(pan);
    return res.json({ success: true, data: result });
  } catch (err: any) {
    return res.status(500).json({ success: false, message: err.message });
  }
}
