import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';
import { checkAndAutoSubmitToNse } from './clientProfileService';
import { nseMfClient } from '../integrations/nsemf/NseMfClient';

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

  // Also fetch eKYC link if any
  const profile = await prisma.clientProfile.findUnique({
    where:  { userId },
    select: { nseKycStatus: true, nseKycRemark: true, nseEkycLink: true, nseEkycLinkSentAt: true },
  });

  return {
    status:          user.kycStatus,
    verifiedAt:      user.kycVerifiedAt,
    panNumber:       user.panNumber,
    statusLabel:     kycStatusLabel(user.kycStatus),
    statusColor:     kycStatusColor(user.kycStatus),
    nextAction:      kycNextAction(user.kycStatus),
    nseKycStatus:    profile?.nseKycStatus ?? null,
    nseKycRemark:    profile?.nseKycRemark ?? null,
    ekycLink:        profile?.nseEkycLink ?? null,
    ekycLinkSentAt:  profile?.nseEkycLinkSentAt ?? null,
    logs:            logs.map((l) => ({
      ...l,
      kraLabel: l.kraName ? KRA_LABELS[l.kraName.toUpperCase()] ?? l.kraName : null,
    })),
    documents,
  };
}

// ─── CHECK KYC FROM NSE KYC_CHECK API ─────────────────────
// Replaces the old mock-based KRA check — now calls real NSE API

export async function checkKycFromKra(userId: string) {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { id: true, panNumber: true, kycStatus: true },
  });
  if (!user?.panNumber) throw new Error('PAN number not found. Complete profile first');

  // Call real NSE KYC_CHECK API
  const nseResult = await nseMfClient.checkKycStatus(user.panNumber);

  const oldStatus = user.kycStatus;
  let newStatus   = oldStatus;

  // Treat 'S' as verified; null/F/KYC_CHECK_SERVICE_DOWN as not verified
  const isVerified = nseResult.isVerified;
  const isServiceDown = nseResult.kycStatusRemark === 'KYC_CHECK_SERVICE_DOWN';

  if (isVerified) {
    newStatus = 'VERIFIED';
    await prisma.user.update({
      where: { id: userId },
      data:  { kycStatus: 'VERIFIED', kycVerifiedAt: new Date(), onboardingStep: 'KYC_VERIFIED' },
    });
    // Save NSE KYC status to client profile if it exists
    await prisma.clientProfile.updateMany({
      where: { userId },
      data:  { nseKycStatus: nseResult.kycStatus, nseKycRemark: nseResult.kycStatusRemark },
    });
  } else if (!isServiceDown) {
    newStatus = 'PENDING';
    await prisma.clientProfile.updateMany({
      where: { userId },
      data:  { nseKycStatus: nseResult.kycStatus ?? 'F', nseKycRemark: nseResult.kycStatusRemark },
    });
  }
  // If service down, keep current status unchanged (don't penalize the user)

  // Log the status change
  if (oldStatus !== newStatus) {
    await prisma.kycStatusLog.create({
      data: {
        userId,
        oldStatus: oldStatus as any,
        newStatus: newStatus as any,
        source:    'KRA',
        kraName:   nseResult.kraName?.toUpperCase() ?? null,
        remark:    isVerified
                     ? `KYC verified via NSE (${nseResult.kycStatusRemark ?? ''})`
                     : `KYC not verified: ${nseResult.kycStatusRemark ?? 'Unknown'}`,
        updatedBy: 'SYSTEM',
      },
    });
    logger.info(`KYC status updated for user ${userId}: ${oldStatus} → ${newStatus}`);
  }

  // Auto-submit to NSE MF if KYC now verified and all other steps complete
  if (isVerified) {
    setImmediate(() => checkAndAutoSubmitToNse(userId));
  }

  return {
    isKycDone:       isVerified,
    status:          newStatus,
    nseKycStatus:    nseResult.kycStatus,
    nseKycRemark:    nseResult.kycStatusRemark,
    kraName:         nseResult.kraName ? KRA_LABELS[nseResult.kraName.toUpperCase()] ?? nseResult.kraName : null,
    serviceDown:     isServiceDown,
    message:         isServiceDown
                       ? 'KYC check service is temporarily unavailable. Please try again later.'
                       : isVerified
                         ? 'KYC verified successfully'
                         : `KYC not verified: ${nseResult.kycStatusRemark ?? 'Not registered'}`,
  };
}

// ─── INITIATE eKYC (fresh register when KYC not done) ─────

export async function initiateEkyc(userId: string) {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { id: true, panNumber: true, phone: true, email: true, kycStatus: true },
  });
  if (!user) throw new Error('User not found');
  if (user.kycStatus === 'VERIFIED') throw new Error('KYC already verified');
  if (!user.panNumber) throw new Error('Complete client profile first');
  if (!user.phone) throw new Error('Mobile number not found. Complete profile first');
  if (!user.email) throw new Error('Email not found. Complete profile first');

  // Call NSE eKYC fresh registration API
  const ekycResult = await nseMfClient.freshRegisterKyc(user.panNumber, user.phone, user.email);

  if (!ekycResult.success) {
    throw new Error(ekycResult.message ?? 'eKYC registration failed');
  }

  // Save the eKYC link to the client profile
  await prisma.clientProfile.updateMany({
    where: { userId },
    data:  { nseEkycLink: ekycResult.link, nseEkycLinkSentAt: new Date() },
  });

  // Update user onboarding step
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
      remark:    'eKYC registration initiated via NSE EKYCREG API',
      updatedBy: 'SYSTEM',
    },
  });

  logger.info(`eKYC initiated for user: ${userId}`);
  return {
    success:  true,
    ekycLink: ekycResult.link,
    message:  ekycResult.message ?? 'eKYC registration initiated. Please complete KYC using the link provided.',
  };
}

// ─── SUBMIT KYC (legacy — kept for backwards compatibility) ──

export async function submitKycRequest(userId: string) {
  // Delegate to the new eKYC initiation flow
  return initiateEkyc(userId);
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
    PENDING:   'Check KYC status via NSE or initiate eKYC registration',
    SUBMITTED: 'KYC in progress. Complete the eKYC link sent to your email/phone',
    VERIFIED:  'KYC complete. You can now invest',
    REJECTED:  'KYC rejected. Please re-submit with correct documents',
  };
  return actions[status] ?? '';
}

