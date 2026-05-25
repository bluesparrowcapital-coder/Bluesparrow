import { PrismaClient, SipStatus } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Dashboard Stats ──────────────────────────────────────

export async function getDashboardStats(distributorId: string) {
  const [portfolios, allSips, newClientsRaw] = await Promise.all([
    prisma.portfolio.findMany({
      where: { distributorId },
      select: { userId: true, currentValue: true, investedAmount: true },
    }),
    prisma.sipMandate.findMany({
      where: { portfolio: { distributorId } },
      select: { userId: true, amount: true, status: true },
    }),
    prisma.portfolio.findMany({
      where: {
        distributorId,
        createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
      select: { userId: true },
      distinct: ['userId'],
    }),
  ]);

  const uniqueClients = new Set(portfolios.map((p) => p.userId)).size;
  const totalAUM      = portfolios.reduce((s, p) => s + p.currentValue, 0);
  const totalInvested = portfolios.reduce((s, p) => s + p.investedAmount, 0);
  const activeSips    = allSips.filter((s) => s.status === SipStatus.ACTIVE);
  const sipBookValue  = activeSips.reduce((s, sip) => s + sip.amount, 0);

  return {
    totalClients:        uniqueClients,
    newClientsThisMonth: newClientsRaw.length,
    activeSipCount:      activeSips.length,
    sipBookMonthlyValue: sipBookValue,
    totalAUM,
    totalInvested,
    absoluteReturn:      totalAUM - totalInvested,
    returnPct:           totalInvested > 0 ? ((totalAUM - totalInvested) / totalInvested) * 100 : 0,
  };
}

// ─── Client Management ────────────────────────────────────

export async function getClients(
  distributorId: string,
  search?: string,
  page = 1,
  limit = 20,
) {
  const portfolioRows = await prisma.portfolio.findMany({
    where: { distributorId },
    select: { userId: true, currentValue: true, investedAmount: true },
  });

  const userIds = [...new Set(portfolioRows.map((p) => p.userId))];

  const users = await prisma.user.findMany({
    where: {
      id: { in: userIds },
      ...(search
        ? {
            OR: [
              { fullName:  { contains: search, mode: 'insensitive' } },
              { phone:     { contains: search } },
              { email:     { contains: search, mode: 'insensitive' } },
              { panNumber: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    select: {
      id: true, fullName: true, email: true, phone: true,
      panNumber: true, kycStatus: true, onboardingStep: true, createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    skip: (page - 1) * limit,
    take: limit,
  });

  const aums = portfolioRows.reduce<Record<string, { aum: number; invested: number }>>((acc, p) => {
    if (!acc[p.userId]) acc[p.userId] = { aum: 0, invested: 0 };
    acc[p.userId].aum      += p.currentValue;
    acc[p.userId].invested += p.investedAmount;
    return acc;
  }, {});

  return {
    clients: users.map((u) => ({ ...u, aum: aums[u.id]?.aum ?? 0, invested: aums[u.id]?.invested ?? 0 })),
    total:   userIds.length,
    page,
    limit,
  };
}

export async function getClientDetail(distributorId: string, clientUserId: string) {
  const check = await prisma.portfolio.findFirst({
    where: { distributorId, userId: clientUserId },
  });
  if (!check) throw new Error('Client not found under this distributor');

  const [user, portfolios, sips, transactions, goals] = await Promise.all([
    prisma.user.findUnique({
      where: { id: clientUserId },
      select: {
        id: true, fullName: true, email: true, phone: true,
        panNumber: true, kycStatus: true, onboardingStep: true, createdAt: true,
        clientProfile: { select: { mobile: true, occupation: true } },
        bankAccounts:  { where: { isDefault: true }, select: { bankName: true, accountNumber: true, isVerified: true }, take: 1 },
      },
    }),
    prisma.portfolio.findMany({
      where: { distributorId, userId: clientUserId },
      include: { fund: { select: { schemeName: true, fundHouse: true, category: true, nav: true } } },
    }),
    prisma.sipMandate.findMany({
      where: { userId: clientUserId, portfolio: { distributorId } },
      include: { fund: { select: { schemeName: true, category: true } } },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
    prisma.transaction.findMany({
      where: { userId: clientUserId },
      include: { fund: { select: { schemeName: true, fundHouse: true } } },
      orderBy: { txnDate: 'desc' },
      take: 20,
    }),
    prisma.goal.findMany({ where: { userId: clientUserId }, orderBy: { createdAt: 'desc' } }),
  ]);

  const totalAUM      = portfolios.reduce((s, p) => s + p.currentValue, 0);
  const totalInvested = portfolios.reduce((s, p) => s + p.investedAmount, 0);

  return {
    user, portfolios, sips, transactions, goals,
    summary: {
      totalAUM, totalInvested,
      returnPct:  totalInvested > 0 ? ((totalAUM - totalInvested) / totalInvested) * 100 : 0,
      activeSips: sips.filter((s) => s.status === SipStatus.ACTIVE).length,
    },
  };
}

// ─── Business Reports ─────────────────────────────────────

export async function getAumReport(
  distributorId: string,
  groupBy: 'fund' | 'category' = 'category',
) {
  const portfolios = await prisma.portfolio.findMany({
    where: { distributorId },
    include: { fund: { select: { schemeName: true, fundHouse: true, category: true } } },
  });

  if (groupBy === 'category') {
    const grouped: Record<string, { category: string; aum: number; invested: number; count: number }> = {};
    for (const p of portfolios) {
      const cat = p.fund.category;
      if (!grouped[cat]) grouped[cat] = { category: cat, aum: 0, invested: 0, count: 0 };
      grouped[cat].aum      += p.currentValue;
      grouped[cat].invested += p.investedAmount;
      grouped[cat].count    += 1;
    }
    return Object.values(grouped);
  }

  // groupBy === 'fund'
  const grouped: Record<string, { fundName: string; fundHouse: string; category: string; aum: number; invested: number; folioCount: number }> = {};
  for (const p of portfolios) {
    if (!grouped[p.fundId]) {
      grouped[p.fundId] = {
        fundName: p.fund.schemeName, fundHouse: p.fund.fundHouse, category: p.fund.category,
        aum: 0, invested: 0, folioCount: 0,
      };
    }
    grouped[p.fundId].aum       += p.currentValue;
    grouped[p.fundId].invested  += p.investedAmount;
    grouped[p.fundId].folioCount += 1;
  }
  return Object.values(grouped).sort((a, b) => b.aum - a.aum);
}

export async function getSipReport(distributorId: string, status?: string) {
  const sips = await prisma.sipMandate.findMany({
    where: {
      portfolio: { distributorId },
      ...(status ? { status: status as SipStatus } : {}),
    },
    include: {
      user: { select: { fullName: true, phone: true } },
      fund: { select: { schemeName: true, category: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  const summary = {
    active:           sips.filter((s) => s.status === 'ACTIVE').length,
    paused:           sips.filter((s) => s.status === 'PAUSED').length,
    cancelled:        sips.filter((s) => s.status === 'CANCELLED').length,
    completed:        sips.filter((s) => s.status === 'COMPLETED').length,
    totalMonthly:     sips.filter((s) => s.status === 'ACTIVE').reduce((a, s) => a + s.amount, 0),
  };
  return { sips, summary };
}

export async function getMonthlySummary(distributorId: string) {
  const now             = new Date();
  const startOfMonth    = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth  = new Date(now.getFullYear(), now.getMonth(), 0);

  const [portfolios, lastMonthTxns, newSips, cancelledSips] = await Promise.all([
    prisma.portfolio.findMany({
      where: { distributorId },
      select: { currentValue: true, investedAmount: true },
    }),
    prisma.transaction.findMany({
      where: {
        txnDate:  { gte: startOfLastMonth, lte: endOfLastMonth },
        portfolio: { distributorId },
        status:   'COMPLETED',
      },
      select: { type: true, amount: true },
    }),
    prisma.sipMandate.count({ where: { portfolio: { distributorId }, createdAt: { gte: startOfMonth } } }),
    prisma.sipMandate.count({ where: { portfolio: { distributorId }, status: 'CANCELLED', updatedAt: { gte: startOfMonth } } }),
  ]);

  const totalAUM = portfolios.reduce((s, p) => s + p.currentValue, 0);
  const inflows  = lastMonthTxns.filter((t) => t.type === 'BUY').reduce((s, t) => s + t.amount, 0);
  const outflows = lastMonthTxns.filter((t) => t.type === 'SELL').reduce((s, t) => s + t.amount, 0);

  return {
    totalAUM, inflows, outflows,
    netFlow: inflows - outflows,
    newSipsThisMonth:       newSips,
    cancelledSipsThisMonth: cancelledSips,
    month: now.toLocaleString('en-IN', { month: 'long', year: 'numeric' }),
  };
}

// ─── Model Portfolios ─────────────────────────────────────

export async function getModelPortfolios(distributorId: string) {
  return prisma.modelPortfolio.findMany({
    where: { distributorId },
    include: {
      funds: {
        include: { fund: { select: { schemeName: true, fundHouse: true, category: true, nav: true } } },
      },
      _count: { select: { assignments: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
}

export async function createModelPortfolio(
  distributorId: string,
  data: { name: string; description?: string; funds: { fundId: string; allocationPct: number }[] },
) {
  const total = data.funds.reduce((s, f) => s + f.allocationPct, 0);
  if (Math.abs(total - 100) > 0.1) throw new Error('Fund allocations must sum to 100%');

  return prisma.modelPortfolio.create({
    data: {
      distributorId,
      name: data.name,
      description: data.description,
      funds: { create: data.funds.map((f) => ({ fundId: f.fundId, allocationPct: f.allocationPct })) },
    },
    include: {
      funds: {
        include: { fund: { select: { schemeName: true, fundHouse: true, category: true } } },
      },
    },
  });
}

export async function updateModelPortfolio(
  distributorId: string,
  id: string,
  data: { name?: string; description?: string; isActive?: boolean },
) {
  const mp = await prisma.modelPortfolio.findFirst({ where: { id, distributorId } });
  if (!mp) throw new Error('Model portfolio not found');
  return prisma.modelPortfolio.update({ where: { id }, data });
}

export async function assignModelPortfolio(
  distributorId: string,
  modelPortfolioId: string,
  userId: string,
) {
  const mp = await prisma.modelPortfolio.findFirst({ where: { id: modelPortfolioId, distributorId } });
  if (!mp) throw new Error('Model portfolio not found');

  return prisma.modelPortfolioAssign.upsert({
    where:  { modelPortfolioId_userId: { modelPortfolioId, userId } },
    update: { distributorId },
    create: { modelPortfolioId, userId, distributorId },
  });
}

export async function deleteModelPortfolio(distributorId: string, id: string) {
  const mp = await prisma.modelPortfolio.findFirst({ where: { id, distributorId } });
  if (!mp) throw new Error('Model portfolio not found');
  return prisma.modelPortfolio.delete({ where: { id } });
}

// ─── Distributor Profile ──────────────────────────────────

export async function getProfile(userId: string) {
  return prisma.distributor.findUnique({
    where: { userId },
    include: { user: { select: { fullName: true, email: true, phone: true, createdAt: true } } },
  });
}

export async function createOrUpdateProfile(
  userId: string,
  data: { arnNumber: string; euinNumber?: string; firmName: string },
) {
  return prisma.distributor.upsert({
    where:  { userId },
    update: data,
    create: { userId, ...data },
  });
}

// ─── Audit Log ────────────────────────────────────────────

export async function createAuditLog(
  distributorId: string,
  action: string,
  entityType: string,
  entityId?: string,
  details?: object,
  ipAddress?: string,
) {
  return prisma.auditLog.create({
    data: { distributorId, action, entityType, entityId, details, ipAddress },
  });
}

export async function getAuditLogs(distributorId: string, page = 1, limit = 50) {
  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where:   { distributorId },
      orderBy: { createdAt: 'desc' },
      skip:    (page - 1) * limit,
      take:    limit,
    }),
    prisma.auditLog.count({ where: { distributorId } }),
  ]);
  return { logs, total, page, limit };
}
