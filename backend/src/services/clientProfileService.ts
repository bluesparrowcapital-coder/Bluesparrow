import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import type { ClientProfileInput, AddressInput, NomineeInput } from '../utils/onboardingValidators';

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
    })),
  });

  return prisma.nominee.findMany({ where: { userId } });
}

// ─── NSE MF ONBOARDING ────────────────────────────────────

export async function submitNseMfOnboarding(userId: string) {
  const profile  = await prisma.clientProfile.findUnique({ where: { userId } });
  const addresses = await prisma.address.findMany({ where: { userId } });
  const banks    = await prisma.bankAccount.findMany({ where: { userId, isVerified: true } });

  if (!profile)                  throw new Error('Client profile not found. Complete profile first');
  if (addresses.length === 0)    throw new Error('Address not found. Add address first');
  if (banks.length === 0)        throw new Error('No verified bank account. Add bank account first');

  // Update NSE onboarding status to SUBMITTED
  await prisma.clientProfile.update({
    where: { userId },
    data:  { nseOnboardingStatus: 'SUBMITTED' },
  });

  // TODO: Actual NSE MF API integration (Phase 2)
  // const nseResponse = await NseMfClient.registerClient({ profile, addresses, banks });
  // await prisma.clientProfile.update({ where: { userId }, data: { nseClientCode: nseResponse.clientCode, nseOnboardingStatus: 'REGISTERED', nseOnboardedAt: new Date(), nseRawResponse: nseResponse } });

  logger.info(`NSE MF onboarding submitted for user: ${userId}`);
  return { status: 'SUBMITTED', message: 'NSE MF registration submitted. Client code will be generated shortly.' };
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
