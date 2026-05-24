import { PrismaClient, SipStatus, TransactionType, TransactionStatus } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

export interface CreateSipInput {
  userId:     string;
  fundId:     string;
  amount:     number;
  frequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
  sipDate:    number;   // Day-of-month 1–28
  startDate:  string;   // ISO date string
  endDate?:   string;
  totalInstallments?: number;
  goalId?:    string;
}

function nextExecution(sipDate: number, from: Date): Date {
  const d = new Date(from);
  d.setDate(sipDate);
  if (d <= from) d.setMonth(d.getMonth() + 1);
  return d;
}

// ─── Create SIP ───────────────────────────────────────────

export async function createSip(input: CreateSipInput) {
  const fund = await prisma.fund.findUnique({ where: { id: input.fundId } });
  if (!fund) throw new Error('Fund not found');
  if (!fund.isActive) throw new Error('Fund is not active');
  if (input.amount < fund.minSipAmount)
    throw new Error(`Minimum SIP amount is ₹${fund.minSipAmount}`);
  if (input.sipDate < 1 || input.sipDate > 28)
    throw new Error('SIP date must be between 1 and 28');

  const startDate = new Date(input.startDate);
  const nextDate  = nextExecution(input.sipDate, new Date());

  const sip = await prisma.sipMandate.create({
    data: {
      userId:             input.userId,
      fundId:             input.fundId,
      amount:             input.amount,
      frequency:          input.frequency ?? 'MONTHLY',
      sipDate:            input.sipDate,
      startDate,
      endDate:            input.endDate ? new Date(input.endDate) : null,
      nextExecutionDate:  nextDate,
      totalInstallments:  input.totalInstallments ?? null,
      status:             SipStatus.ACTIVE,
    },
    include: { fund: { select: { schemeName: true, fundHouse: true, category: true } } },
  });

  // If linked to a goal, add SIP ID to goal.linkedSipIds
  if (input.goalId) {
    const goal = await prisma.goal.findFirst({ where: { id: input.goalId, userId: input.userId } });
    if (goal) {
      await prisma.goal.update({
        where: { id: input.goalId },
        data:  { linkedSipIds: [...goal.linkedSipIds, sip.id] },
      });
    }
  }

  // Create in-app notification
  await prisma.notification.create({
    data: {
      userId: input.userId,
      title:  'SIP Created',
      body:   `Your ₹${input.amount}/mo SIP in ${fund.schemeName} starts on ${nextDate.toDateString()}.`,
      type:   'SIP',
    },
  });

  return sip;
}

// ─── Get SIPs for a user ──────────────────────────────────

export async function getUserSips(userId: string) {
  const sips = await prisma.sipMandate.findMany({
    where:   { userId },
    orderBy: { createdAt: 'desc' },
    include: { fund: { select: { schemeName: true, fundHouse: true, category: true, nav: true } } },
  });

  return sips.map((s) => ({
    ...s,
    totalInvested: s.amount * s.installmentsDone,
    nextDateFormatted: s.nextExecutionDate
      ? s.nextExecutionDate.toISOString().split('T')[0]
      : null,
  }));
}

// ─── Get SIP by ID ─────────────────────────────────────────

export async function getSipById(id: string, userId: string) {
  const sip = await prisma.sipMandate.findFirst({
    where:   { id, userId },
    include: {
      fund: { select: { schemeName: true, fundHouse: true, category: true, nav: true, minSipAmount: true } },
    },
  });
  if (!sip) throw new Error('SIP not found');

  // Fetch related transactions via userId + fundId
  const transactions = await prisma.transaction.findMany({
    where:   { userId, fundId: sip.fundId },
    orderBy: { txnDate: 'desc' },
    take:    24,
    select:  { id: true, amount: true, units: true, navAtTxn: true, status: true, txnDate: true },
  });

  return { ...sip, transactions };
}

// ─── Pause SIP ────────────────────────────────────────────

export async function pauseSip(id: string, userId: string) {
  const sip = await prisma.sipMandate.findFirst({ where: { id, userId } });
  if (!sip) throw new Error('SIP not found');
  if (sip.status !== SipStatus.ACTIVE) throw new Error('Only active SIPs can be paused');

  return prisma.sipMandate.update({
    where: { id },
    data:  { status: SipStatus.PAUSED },
    include: { fund: { select: { schemeName: true } } },
  });
}

// ─── Resume SIP ───────────────────────────────────────────

export async function resumeSip(id: string, userId: string) {
  const sip = await prisma.sipMandate.findFirst({ where: { id, userId } });
  if (!sip) throw new Error('SIP not found');
  if (sip.status !== SipStatus.PAUSED) throw new Error('Only paused SIPs can be resumed');

  const nextDate = nextExecution(sip.sipDate, new Date());
  return prisma.sipMandate.update({
    where: { id },
    data:  { status: SipStatus.ACTIVE, nextExecutionDate: nextDate },
    include: { fund: { select: { schemeName: true } } },
  });
}

// ─── Cancel SIP ───────────────────────────────────────────

export async function cancelSip(id: string, userId: string) {
  const sip = await prisma.sipMandate.findFirst({ where: { id, userId } });
  if (!sip) throw new Error('SIP not found');
  if (sip.status === SipStatus.CANCELLED) throw new Error('SIP already cancelled');

  const updated = await prisma.sipMandate.update({
    where: { id },
    data:  { status: SipStatus.CANCELLED, nextExecutionDate: null },
    include: { fund: { select: { schemeName: true } } },
  });

  await prisma.notification.create({
    data: {
      userId,
      title: 'SIP Cancelled',
      body:  `Your SIP in ${updated.fund.schemeName} has been cancelled.`,
      type:  'SIP',
    },
  });

  return updated;
}

// ─── Execute due SIPs (called by cron) ────────────────────

export async function executeDueSips(): Promise<{ executed: number; failed: number }> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  const dueSips = await prisma.sipMandate.findMany({
    where: {
      status:             SipStatus.ACTIVE,
      nextExecutionDate: { gte: today, lt: tomorrow },
    },
    include: { fund: true },
  });

  let executed = 0;
  let failed   = 0;

  for (const sip of dueSips) {
    try {
      const nav  = sip.fund.nav ?? 1;
      const units = sip.amount / nav;

      // Create transaction
      const txn = await prisma.transaction.create({
        data: {
          userId:    sip.userId,
          fundId:    sip.fundId,
          type:      TransactionType.BUY,
          status:    TransactionStatus.COMPLETED,
          amount:    sip.amount,
          units,
          navAtTxn:  nav,
          txnDate:   new Date(),
          remarks:   `SIP installment #${sip.installmentsDone + 1}`,
        },
      });

      // Upsert portfolio
      const existing = await prisma.portfolio.findFirst({
        where: { userId: sip.userId, fundId: sip.fundId },
      });

      if (existing) {
        const newUnits     = existing.unitsHeld + units;
        const newInvested  = existing.investedAmount + sip.amount;
        const newAvgNav    = newInvested / newUnits;
        await prisma.portfolio.update({
          where: { id: existing.id },
          data: {
            unitsHeld:      newUnits,
            investedAmount: newInvested,
            avgNav:         newAvgNav,
            currentValue:   newUnits * nav,
            portfolioId:    txn.id,
            lastUpdated:    new Date(),
          },
        });
      } else {
        const portfolio = await prisma.portfolio.create({
          data: {
            userId:         sip.userId,
            fundId:         sip.fundId,
            unitsHeld:      units,
            investedAmount: sip.amount,
            avgNav:         nav,
            currentValue:   units * nav,
            lastUpdated:    new Date(),
          },
        });
        await prisma.transaction.update({ where: { id: txn.id }, data: { portfolioId: portfolio.id } });
      }

      // Advance SIP
      const newDone = sip.installmentsDone + 1;
      const isDone  = sip.totalInstallments != null && newDone >= sip.totalInstallments;
      const nextDate = isDone ? null : nextExecution(sip.sipDate, new Date());

      await prisma.sipMandate.update({
        where: { id: sip.id },
        data: {
          installmentsDone:  newDone,
          nextExecutionDate: nextDate,
          status: isDone ? SipStatus.COMPLETED : SipStatus.ACTIVE,
        },
      });

      // Notify
      await prisma.notification.create({
        data: {
          userId: sip.userId,
          title:  'SIP Executed',
          body:   `₹${sip.amount} SIP in ${sip.fund.schemeName} processed (${units.toFixed(4)} units @ ₹${nav}).`,
          type:   'SIP',
        },
      });

      executed++;
    } catch (err) {
      logger.error(`[SIP] Failed to execute SIP ${sip.id}:`, err);
      failed++;
    }
  }

  return { executed, failed };
}
