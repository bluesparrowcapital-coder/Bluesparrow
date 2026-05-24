import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface CreateGoalInput {
  userId:       string;
  goalName:     string;
  targetAmount: number;
  targetDate:   string; // ISO date
  icon?:        string; // emoji shorthand e.g. 🏠 🎓 ✈️
}

// ─── Create Goal ──────────────────────────────────────────

export async function createGoal(input: CreateGoalInput) {
  const target = new Date(input.targetDate);
  if (target <= new Date()) throw new Error('Target date must be in the future');

  return prisma.goal.create({
    data: {
      userId:        input.userId,
      goalName:      input.goalName,
      targetAmount:  input.targetAmount,
      targetDate:    target,
      currentAmount: 0,
      linkedSipIds:  [],
    },
  });
}

// ─── List Goals ───────────────────────────────────────────

export async function getUserGoals(userId: string) {
  const goals = await prisma.goal.findMany({
    where:   { userId },
    orderBy: { createdAt: 'asc' },
  });

  // For each goal, sum invested amount of linked SIPs
  return Promise.all(
    goals.map(async (g) => {
      const sipStats = await getSipStatsForGoal(g.linkedSipIds);
      const progressPct = g.targetAmount > 0
        ? Math.min(100, (sipStats.totalInvested / g.targetAmount) * 100)
        : 0;
      const daysLeft  = Math.max(0, Math.ceil((g.targetDate.getTime() - Date.now()) / 86_400_000));
      return { ...g, sipStats, progressPct: parseFloat(progressPct.toFixed(2)), daysLeft };
    })
  );
}

// ─── Get Goal by ID ───────────────────────────────────────

export async function getGoalById(id: string, userId: string) {
  const goal = await prisma.goal.findFirst({ where: { id, userId } });
  if (!goal) throw new Error('Goal not found');
  const sipStats = await getSipStatsForGoal(goal.linkedSipIds);
  const sips = goal.linkedSipIds.length > 0
    ? await prisma.sipMandate.findMany({
        where:   { id: { in: goal.linkedSipIds } },
        include: { fund: { select: { schemeName: true, fundHouse: true } } },
      })
    : [];
  const progressPct = goal.targetAmount > 0
    ? Math.min(100, (sipStats.totalInvested / goal.targetAmount) * 100)
    : 0;
  const daysLeft = Math.max(0, Math.ceil((goal.targetDate.getTime() - Date.now()) / 86_400_000));
  return { ...goal, sipStats, sips, progressPct: parseFloat(progressPct.toFixed(2)), daysLeft };
}

// ─── Update Goal ──────────────────────────────────────────

export async function updateGoal(
  id: string,
  userId: string,
  data: Partial<Pick<CreateGoalInput, 'goalName' | 'targetAmount' | 'targetDate'>>
) {
  const goal = await prisma.goal.findFirst({ where: { id, userId } });
  if (!goal) throw new Error('Goal not found');

  return prisma.goal.update({
    where: { id },
    data: {
      ...(data.goalName     && { goalName: data.goalName }),
      ...(data.targetAmount && { targetAmount: data.targetAmount }),
      ...(data.targetDate   && { targetDate: new Date(data.targetDate) }),
    },
  });
}

// ─── Delete Goal ──────────────────────────────────────────

export async function deleteGoal(id: string, userId: string) {
  const goal = await prisma.goal.findFirst({ where: { id, userId } });
  if (!goal) throw new Error('Goal not found');
  return prisma.goal.delete({ where: { id } });
}

// ─── Link SIP to Goal ─────────────────────────────────────

export async function linkSipToGoal(goalId: string, sipId: string, userId: string) {
  const [goal, sip] = await Promise.all([
    prisma.goal.findFirst({ where: { id: goalId, userId } }),
    prisma.sipMandate.findFirst({ where: { id: sipId, userId } }),
  ]);
  if (!goal) throw new Error('Goal not found');
  if (!sip)  throw new Error('SIP not found');
  if (goal.linkedSipIds.includes(sipId)) throw new Error('SIP already linked to this goal');

  return prisma.goal.update({
    where: { id: goalId },
    data:  { linkedSipIds: [...goal.linkedSipIds, sipId] },
  });
}

// ─── SIP Calculator ───────────────────────────────────────

export function calculateSipForGoal(targetAmount: number, targetDateIso: string, expectedReturnPct = 12) {
  const months    = monthsUntil(new Date(targetDateIso));
  if (months <= 0) return { monthlySip: 0, months: 0 };

  const r = expectedReturnPct / 100 / 12; // monthly rate
  // SIP = FV * r / [(1+r)^n - 1]
  const fvFactor  = Math.pow(1 + r, months) - 1;
  const monthlySip = fvFactor > 0 ? Math.ceil((targetAmount * r) / fvFactor) : Math.ceil(targetAmount / months);

  return { monthlySip, months };
}

// ─── Helpers ──────────────────────────────────────────────

async function getSipStatsForGoal(sipIds: string[]) {
  if (sipIds.length === 0) return { activeSips: 0, totalMonthly: 0, totalInvested: 0 };
  const sips = await prisma.sipMandate.findMany({ where: { id: { in: sipIds } } });
  const activeSips    = sips.filter((s) => s.status === 'ACTIVE').length;
  const totalMonthly  = sips.filter((s) => s.status === 'ACTIVE').reduce((a, s) => a + s.amount, 0);
  const totalInvested = sips.reduce((a, s) => a + s.amount * s.installmentsDone, 0);
  return { activeSips, totalMonthly, totalInvested };
}

function monthsUntil(date: Date): number {
  const now = new Date();
  return (date.getFullYear() - now.getFullYear()) * 12 + (date.getMonth() - now.getMonth());
}
