import { Response } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import {
  createClientProfile,
  getClientProfile,
  saveAddress,
  getAddresses,
  saveNominees,
  submitNseMfOnboarding,
  getOnboardingStatus,
} from '../services/clientProfileService';
import {
  getKycStatus,
  checkKycFromKra,
  submitKycRequest,
} from '../services/kycService';
import {
  clientProfileSchema,
  addressSchema,
  nomineeSchema,
} from '../utils/onboardingValidators';
import type { AuthRequest } from '../middleware/authMiddleware';

const prisma = new PrismaClient();

function badRequest(res: Response, errors: z.ZodIssue[]) {
  res.status(400).json({
    success: false,
    message: 'Validation error',
    errors:  errors.map((e) => ({ field: e.path.join('.'), message: e.message })),
  });
}

// ─── GET /onboarding/status ───────────────────────────────
export async function onboardingStatus(req: AuthRequest, res: Response) {
  try {
    const data = await getOnboardingStatus(req.user!.userId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

// ─── POST /onboarding/profile ─────────────────────────────
export async function createProfile(req: AuthRequest, res: Response) {
  const parsed = clientProfileSchema.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error.issues);

  try {
    const profile = await createClientProfile(req.user!.userId, parsed.data);
    res.status(201).json({ success: true, message: 'Profile saved', data: profile });
  } catch (err: any) {
    res.status(409).json({ success: false, message: err.message });
  }
}

// ─── GET /onboarding/profile ──────────────────────────────
export async function fetchProfile(req: AuthRequest, res: Response) {
  try {
    const profile = await getClientProfile(req.user!.userId);
    res.json({ success: true, data: profile });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

// ─── POST /onboarding/address ─────────────────────────────
export async function saveAddressHandler(req: AuthRequest, res: Response) {
  const parsed = addressSchema.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error.issues);

  try {
    const address = await saveAddress(req.user!.userId, parsed.data);
    res.json({ success: true, message: 'Address saved', data: address });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

// ─── GET /onboarding/address ──────────────────────────────
export async function fetchAddresses(req: AuthRequest, res: Response) {
  try {
    const addresses = await getAddresses(req.user!.userId);
    res.json({ success: true, data: addresses });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

// ─── POST /onboarding/nominees ────────────────────────────
export async function saveNomineesHandler(req: AuthRequest, res: Response) {
  const parsed = nomineeSchema.safeParse(req.body);
  if (!parsed.success) return badRequest(res, parsed.error.issues);

  try {
    const nominees = await saveNominees(req.user!.userId, parsed.data);
    res.json({ success: true, message: 'Nominees saved', data: nominees });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

// ─── POST /onboarding/nse-submit ─────────────────────────
export async function nseSubmit(req: AuthRequest, res: Response) {
  try {
    const result = await submitNseMfOnboarding(req.user!.userId);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

// ─── GET /kyc/status ─────────────────────────────────────
export async function kycStatus(req: AuthRequest, res: Response) {
  try {
    const data = await getKycStatus(req.user!.userId);
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

// ─── POST /kyc/check-kra ─────────────────────────────────
export async function kycCheckKra(req: AuthRequest, res: Response) {
  try {
    const result = await checkKycFromKra(req.user!.userId);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

// ─── POST /kyc/submit ────────────────────────────────────
export async function kycSubmit(req: AuthRequest, res: Response) {
  try {
    const result = await submitKycRequest(req.user!.userId);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}

// ─── GET /onboarding/prefill ─────────────────────────────
// Returns user's registration data to pre-fill the profile form
export async function getPrefillData(req: AuthRequest, res: Response) {
  try {
    const user = await prisma.user.findUnique({
      where:  { id: req.user!.userId },
      select: { fullName: true, panNumber: true, email: true, phone: true },
    });
    res.json({ success: true, data: user });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message });
  }
}
