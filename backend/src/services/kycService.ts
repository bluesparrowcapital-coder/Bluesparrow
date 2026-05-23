import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

// KRA names for display
const KRA_LABELS: Record<string, string> = {
  CAMSKRA:  'CAMS KRA',
  CVLKRA:   'CVL KRA (CDSL)',
  NDMLKRA:  'NDML KRA',
  KARVYKRA: 'Karvy KRA',
};

// ─── GET KYC STATUS ───────────────────────────────────────

export async function getKycStatus(userId: string) {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { id: true, fullName: true, panNumber: true, kycStatus: true, kycVerifiedAt: true },
  });
  if (!user) throw new Error('User not found');

  const logs = await prisma.kycStatusLog.findMany({
    where:   { userId },
    orderBy: { createdAt: 'desc' },
    take:    10,
  });

  const documents = await prisma.kycDocument.findMany({
    where:  { userId },
    select: { id: true, docType: true, isVerified: true, verifiedAt: true, rejectionReason: true, createdAt: true },
  });

  return {
    status:      user.kycStatus,
    verifiedAt:  user.kycVerifiedAt,
    panNumber:   user.panNumber,
    statusLabel: kycStatusLabel(user.kycStatus),
    statusColor: kycStatusColor(user.kycStatus),
    nextAction:  kycNextAction(user.kycStatus),
    logs:        logs.map((l) => ({
      ...l,
      kraLabel: l.kraName ? KRA_LABELS[l.kraName] ?? l.kraName : null,
    })),
    documents,
  };
}

// ─── CHECK KYC FROM KRA (PAN lookup) ──────────────────────
// Called when user submits profile — check if KYC already done via PAN

export async function checkKycFromKra(userId: string) {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { id: true, panNumber: true, kycStatus: true },
  });
  if (!user?.panNumber) throw new Error('PAN number not found. Complete profile first');

  // TODO: Real KRA API call in Phase 2
  // const kraResult = await KraClient.checkKyc(user.panNumber);

  // Simulate KRA response for now
  const mockResult = await simulateKraCheck(user.panNumber);

  const oldStatus = user.kycStatus;
  let newStatus   = oldStatus;

  if (mockResult.isKycDone) {
    newStatus = 'VERIFIED';
    await prisma.user.update({
      where: { id: userId },
      data:  { kycStatus: 'VERIFIED', kycVerifiedAt: new Date(), onboardingStep: 'KYC_VERIFIED' },
    });
  } else {
    newStatus = 'PENDING';
  }

  // Log the status change
  if (oldStatus !== newStatus) {
    await prisma.kycStatusLog.create({
      data: {
        userId,
        oldStatus: oldStatus as any,
        newStatus: newStatus as any,
        source:    'KRA',
        kraName:   mockResult.kraName,
        remark:    mockResult.isKycDone ? 'KYC verified via KRA' : 'KYC not found in KRA records',
        updatedBy: 'SYSTEM',
      },
    });
    logger.info(`KYC status updated for user ${userId}: ${oldStatus} → ${newStatus}`);
  }

  return {
    isKycDone:  mockResult.isKycDone,
    status:     newStatus,
    kraName:    mockResult.kraName ? KRA_LABELS[mockResult.kraName] ?? mockResult.kraName : null,
    message:    mockResult.isKycDone
                  ? 'KYC verified successfully via KRA'
                  : 'KYC not found. Please submit KYC documents',
  };
}

// ─── SUBMIT KYC (when KYC not done) ───────────────────────

export async function submitKycRequest(userId: string) {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { kycStatus: true, panNumber: true },
  });
  if (!user) throw new Error('User not found');
  if (user.kycStatus === 'VERIFIED') throw new Error('KYC already verified');
  if (!user.panNumber) throw new Error('Complete client profile first');

  const oldStatus = user.kycStatus;
  await prisma.user.update({
    where: { id: userId },
    data:  { kycStatus: 'SUBMITTED', onboardingStep: 'KYC_SUBMITTED' },
  });

  await prisma.kycStatusLog.create({
    data: {
      userId,
      oldStatus: oldStatus as any,
      newStatus: 'SUBMITTED',
      source:    'KRA',
      remark:    'KYC submission initiated by user',
      updatedBy: 'SYSTEM',
    },
  });

  logger.info(`KYC submitted for user: ${userId}`);
  return { status: 'SUBMITTED', message: 'KYC submitted. Verification usually takes 1-2 business days' };
}

// ─── Helpers ──────────────────────────────────────────────

function kycStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING:   'KYC Pending',
    SUBMITTED: 'KYC Under Review',
    VERIFIED:  'KYC Verified',
    REJECTED:  'KYC Rejected',
  };
  return labels[status] ?? status;
}

function kycStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PENDING:   'yellow',
    SUBMITTED: 'blue',
    VERIFIED:  'green',
    REJECTED:  'red',
  };
  return colors[status] ?? 'gray';
}

function kycNextAction(status: string): string {
  const actions: Record<string, string> = {
    PENDING:   'Check KYC status or submit KYC documents',
    SUBMITTED: 'KYC is under review. No action needed',
    VERIFIED:  'KYC complete. You can now invest',
    REJECTED:  'KYC rejected. Please re-submit with correct documents',
  };
  return actions[status] ?? '';
}

// Placeholder until real KRA API integration in Phase 2
async function simulateKraCheck(pan: string) {
  // In dev/test: treat PAN starting with 'A' as KYC done
  const isKycDone = pan.startsWith('A');
  return {
    isKycDone,
    kraName: isKycDone ? 'CAMSKRA' : null,
  };
}
