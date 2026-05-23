import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import type { ClientProfileInput, AddressInput, NomineeInput } from '../utils/onboardingValidators';
import { nseMfClient } from '../integrations/nsemf/NseMfClient';

const prisma = new PrismaClient();

// ─── STEP 2: Create Client Profile ────────────────────────

export async function createClientProfile(userId: string, data: ClientProfileInput) {
  // PAN duplicate check (another user may have same PAN)
  const existingPan = await prisma.clientProfile.findUnique({
    where: { panNumber: data.panNumber },
  });
  if (existingPan && existingPan.userId !== userId) {
    throw new Error('PAN already registered with another account');
  }

  const profile = await prisma.clientProfile.upsert({
    where:  { userId },
    create: {
      userId,
      email:  (await prisma.user.findUnique({ where: { id: userId }, select: { email: true } }))!.email,
      mobile: (await prisma.user.findUnique({ where: { id: userId }, select: { phone: true } }))!.phone,
      ...data,
      dob: new Date(data.dob),
    },
    update: {
      ...data,
      dob: new Date(data.dob),
    },
  });

  // Also update panNumber on User model
  await prisma.user.update({
    where: { id: userId },
    data:  { panNumber: data.panNumber, dob: new Date(data.dob), gender: data.gender },
  });

  logger.info(`Client profile created/updated for user: ${userId}`);
  return profile;
}

export async function getClientProfile(userId: string) {
  return prisma.clientProfile.findUnique({
    where: { userId },
    include: {
      user: { select: { id: true, fullName: true, email: true, phone: true, onboardingStep: true, kycStatus: true } },
    },
  });
}

// ─── STEP 2b: Save Address ─────────────────────────────────

export async function saveAddress(userId: string, data: AddressInput) {
  const address = await prisma.address.upsert({
    where:  { userId_type: { userId, type: data.type as any } },
    create: { userId, ...data, type: data.type as any },
    update: { ...data },
  });

  // If both addresses saved (or same as permanent), check if step can advance
  const addresses = await prisma.address.findMany({ where: { userId } });
  if (addresses.length >= 1) {
    await advanceOnboardingStep(userId, 'PROFILE_CREATED');
  }

  return address;
}

export async function getAddresses(userId: string) {
  return prisma.address.findMany({ where: { userId } });
}

// ─── STEP 2c: Save Nominees ────────────────────────────────

export async function saveNominees(userId: string, data: NomineeInput) {
  // Delete existing nominees and re-create (simpler than update logic)
  await prisma.nominee.deleteMany({ where: { userId } });

  const nominees = await prisma.nominee.createMany({
    data: data.nominees.map((n) => ({
      userId,
      fullName:     n.fullName,
      relationship: n.relationship,
      dob:          n.dob ? new Date(n.dob) : null,
      percentage:   n.percentage,
      guardianName: n.guardianName,
      guardianRel:  n.guardianRel,
      docType:      n.docType,
      docNumber:    n.docNumber,
    })),
  });

  return prisma.nominee.findMany({ where: { userId } });
}

// ─── NSE MF ONBOARDING ────────────────────────────────────

/**
 * Assemble all onboarding data and submit to NSE NMF II.
 * Called explicitly (manual submit button) OR auto-triggered
 * by checkAndAutoSubmitToNse() once all required steps complete.
 */
export async function submitNseMfOnboarding(userId: string) {
  const user      = await prisma.user.findUnique({ where: { id: userId }, select: { kycStatus: true } });
  const profile   = await prisma.clientProfile.findUnique({ where: { userId } });
  const addresses = await prisma.address.findMany({ where: { userId } });
  const banks     = await prisma.bankAccount.findMany({
    where:   { userId },
    orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
  });
  const nominees = await prisma.nominee.findMany({ where: { userId, isActive: true } });

  if (!profile)               throw new Error('Client profile not found. Complete profile first.');
  if (addresses.length === 0) throw new Error('Address not found. Add address first.');
  if (banks.length === 0)     throw new Error('No bank account found. Add a bank account first.');

  // Skip if already registered
  if (profile.nseOnboardingStatus === 'REGISTERED') {
    return { status: 'REGISTERED', clientCode: profile.nseClientCode, message: 'Already registered on NSE MF.' };
  }

  // Mark as SUBMITTED while the API call runs
  await prisma.clientProfile.update({
    where: { userId },
    data:  { nseOnboardingStatus: 'SUBMITTED' },
  });

  const permanentAddr = addresses.find((a) => a.type === 'PERMANENT') ?? addresses[0];
  const bank          = banks[0];

  const payload = {
    panNumber:          profile.panNumber,
    fullNameAsPan:      profile.fullNameAsPan,
    dob:                profile.dob,
    gender:             profile.gender,
    fatherOrSpouseName: profile.fatherOrSpouseName,
    occupation:         profile.occupation,
    taxStatus:          profile.taxStatus,
    email:              profile.email,
    mobile:             profile.mobile,
    isPep:              profile.isPep,
    kycStatus:          user?.kycStatus === 'VERIFIED' ? ('Y' as const) : ('N' as const),
    addressLine1:       permanentAddr.addressLine1,
    addressLine2:       permanentAddr.addressLine2,
    city:               permanentAddr.city,
    state:              permanentAddr.state,
    pincode:            permanentAddr.pincode,
    bankIfsc:           bank.ifscCode,
    bankAccountNumber:  bank.accountNumber,
    bankName:           bank.bankName,
    accountHolder:      bank.accountHolder,
    accountType:        (bank as any).accountType ?? 'SB',
    annualIncome:       profile.annualIncome ?? 'BELOW_1L',
    nominees: nominees.map((n) => ({
      fullName:     n.fullName,
      relationship: n.relationship,
      percentage:   n.percentage,
      dob:          n.dob,
      guardianName: n.guardianName,
      docType:      n.docType  ?? undefined,
      docNumber:    n.docNumber ?? undefined,
    })),
  };

  const clientCode = nseMfClient.generateClientCode();
  const result     = await nseMfClient.registerClient(payload, clientCode);

  if (result.success) {
    await prisma.clientProfile.update({
      where: { userId },
      data:  {
        nseClientCode:       result.clientCode ?? clientCode,
        nseOnboardingStatus: 'REGISTERED',
        nseOnboardedAt:      new Date(),
        nseRawResponse:      result.rawResponse as any,
      },
    });
    await advanceOnboardingStep(userId, 'NSE_ONBOARDED');
    logger.info(`NSE MF registered for user ${userId} — clientCode: ${result.clientCode}`);
    return { status: 'REGISTERED', clientCode: result.clientCode, message: result.message };
  } else {
    // Revert to FAILED so user/system can retry
    await prisma.clientProfile.update({
      where: { userId },
      data:  { nseOnboardingStatus: 'FAILED', nseRawResponse: result.rawResponse as any },
    });
    logger.error(`NSE MF registration failed for user ${userId}: ${result.message}`);
    throw new Error(`NSE registration failed: ${result.message}`);
  }
}

/**
 * Auto-trigger NSE submission once ALL required steps are complete.
 * Call this from kycService (after KYC verified) and bankService (after bank added).
 */
export async function checkAndAutoSubmitToNse(userId: string): Promise<void> {
  try {
    const user    = await prisma.user.findUnique({ where: { id: userId }, select: { kycStatus: true } });
    const profile = await prisma.clientProfile.findUnique({
      where:  { userId },
      select: { nseOnboardingStatus: true },
    });

    // Already submitted/registered — nothing to do
    if (!profile || profile.nseOnboardingStatus === 'REGISTERED' || profile.nseOnboardingStatus === 'SUBMITTED') return;

    // All required steps must be complete
    if (user?.kycStatus !== 'VERIFIED') return;

    const addrCount = await prisma.address.count({ where: { userId } });
    const bankCount = await prisma.bankAccount.count({ where: { userId } });
    if (addrCount === 0 || bankCount === 0) return;

    logger.info(`All steps complete for user ${userId} — auto-submitting to NSE MF`);
    await submitNseMfOnboarding(userId);
  } catch (err: any) {
    // Log but do not crash the calling flow
    logger.error(`checkAndAutoSubmitToNse failed for user ${userId}: ${err.message}`);
  }
}

// ─── ONBOARDING STATUS ────────────────────────────────────

export async function getOnboardingStatus(userId: string) {
  const user = await prisma.user.findUnique({
    where:   { id: userId },
    select:  { id: true, fullName: true, onboardingStep: true, kycStatus: true, panNumber: true },
    });
  if (!user) throw new Error('User not found');

  const profile  = await prisma.clientProfile.findUnique({ where: { userId } });
  const addresses = await prisma.address.findMany({ where: { userId } });
  const nominees = await prisma.nominee.findMany({ where: { userId, isActive: true } });
  const banks    = await prisma.bankAccount.findMany({ where: { userId } });

  const steps = {
    registration:    { done: true,                          label: 'Account Created' },
    profileCreated:  { done: !!profile,                     label: 'Client Profile' },
    addressAdded:    { done: addresses.length > 0,          label: 'Address Details' },
    nomineeAdded:    { done: nominees.length > 0,           label: 'Nominee Details' },
    bankAdded:       { done: banks.length > 0,              label: 'Bank Account' },
    kycVerified:     { done: user.kycStatus === 'VERIFIED', label: 'KYC Verification' },
    nseOnboarded:    { done: user.onboardingStep === 'NSE_ONBOARDED', label: 'NSE MF Registration' },
  };

  // Next pending step
  const nextStep = Object.entries(steps).find(([, v]) => !v.done)?.[0] ?? 'COMPLETE';

  return { user, profile, steps, nextStep };
}

// ─── Internal helper ──────────────────────────────────────

async function advanceOnboardingStep(userId: string, step: string) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { onboardingStep: true } });
  if (!user) return;

  const order = ['REGISTERED', 'PROFILE_CREATED', 'KYC_SUBMITTED', 'KYC_VERIFIED', 'NSE_ONBOARDED'];
  const currentIdx = order.indexOf(user.onboardingStep);
  const newIdx     = order.indexOf(step);

  if (newIdx > currentIdx) {
    await prisma.user.update({ where: { id: userId }, data: { onboardingStep: step as any } });
  }
}
