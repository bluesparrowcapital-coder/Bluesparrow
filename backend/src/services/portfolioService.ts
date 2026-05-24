import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

// ─── Portfolio Summary ──────────────────────────────────────

export async function getPortfolioSummary(userId: string) {
  const holdings = await prisma.portfolio.findMany({
    where:   { userId },
    include: { fund: { select: { id: true, schemeName: true, fundHouse: true, category: true, nav: true, navDate: true, riskLevel: true } } },
    orderBy: { investedAmount: 'desc' },
  });

  // Refresh current values from live NAV
  const enriched = holdings.map((h) => {
    const currentValue    = h.fund.nav ? h.unitsHeld * h.fund.nav : h.currentValue;
    const absoluteReturn  = currentValue - h.investedAmount;
    const returnPct       = h.investedAmount > 0
      ? ((currentValue - h.investedAmount) / h.investedAmount) * 100
      : 0;
    return {
      id:             h.id,
      fundId:         h.fundId,
      fundName:       h.fund.schemeName,
      fundHouse:      h.fund.fundHouse,
      category:       h.fund.category,
      riskLevel:      h.fund.riskLevel,
      folioNumber:    h.folioNumber,
      unitsHeld:      h.unitsHeld,
      avgNav:         h.avgNav,
      currentNav:     h.fund.nav,
      navDate:        h.fund.navDate,
      investedAmount: h.investedAmount,
      currentValue,
      absoluteReturn,
      returnPct:      Math.round(returnPct * 100) / 100,
    };
  });

  const totalInvested = enriched.reduce((s, h) => s + h.investedAmount, 0);
  const totalCurrent  = enriched.reduce((s, h) => s + h.currentValue, 0);
  const totalReturn   = totalCurrent - totalInvested;
  const totalReturnPct = totalInvested > 0
    ? ((totalReturn / totalInvested) * 100)
    : 0;

  return {
    holdings: enriched,
    summary: {
      totalInvested:   Math.round(totalInvested * 100) / 100,
      currentValue:    Math.round(totalCurrent * 100) / 100,
      totalReturn:     Math.round(totalReturn * 100) / 100,
      totalReturnPct:  Math.round(totalReturnPct * 100) / 100,
      totalFunds:      enriched.length,
    },
  };
}

// ─── Transactions ──────────────────────────────────────────

export async function getTransactions(userId: string, limit = 50) {
  return prisma.transaction.findMany({
    where:   { userId },
    include: { fund: { select: { schemeName: true, fundHouse: true, category: true } } },
    orderBy: { txnDate: 'desc' },
    take:    limit,
  });
}

// ─── Place Lumpsum Order (mock — real BSE integration in Phase 3) ──

export interface LumpsumOrderInput {
  fundId:    string;
  amount:    number;
  userId:    string;
}

export async function placeLumpsumOrder(input: LumpsumOrderInput) {
  const { fundId, amount, userId } = input;

  const fund = await prisma.fund.findUnique({ where: { id: fundId } });
  if (!fund)          throw new Error('Fund not found');
  if (!fund.isActive) throw new Error('Fund is not active');
  if (amount < fund.minLumpsum) {
    throw new Error(`Minimum lumpsum for this fund is ₹${fund.minLumpsum}`);
  }
  if (!fund.nav || fund.nav <= 0) throw new Error('NAV not available for this fund');

  const units = Math.round((amount / fund.nav) * 1000) / 1000; // 3 decimal places

  // Create transaction
  const txn = await prisma.transaction.create({
    data: {
      id:       crypto.randomUUID(),
      userId,
      fundId,
      type:     'BUY',
      status:   'PROCESSING',
      amount,
      units,
      navAtTxn: fund.nav,
      txnDate:  new Date(),
      remarks:  'Lumpsum order — pending settlement',
      updatedAt: new Date(),
    },
  });

  // Upsert portfolio record
  const existingPortfolio = await prisma.portfolio.findFirst({
    where: { userId, fundId, folioNumber: null },
  });

  if (existingPortfolio) {
    const newUnits      = existingPortfolio.unitsHeld + units;
    const newInvested   = existingPortfolio.investedAmount + amount;
    const newAvgNav     = newInvested / newUnits;
    const newCurrent    = newUnits * fund.nav;

    await prisma.portfolio.update({
      where: { id: existingPortfolio.id },
      data: {
        unitsHeld:      newUnits,
        avgNav:         newAvgNav,
        investedAmount: newInvested,
        currentValue:   newCurrent,
        lastUpdated:    new Date(),
      },
    });

    await prisma.transaction.update({
      where: { id: txn.id },
      data:  { portfolioId: existingPortfolio.id, status: 'COMPLETED', settlementDate: new Date(), updatedAt: new Date() },
    });
  } else {
    const currentValue = units * fund.nav;
    const portfolio = await prisma.portfolio.create({
      data: {
        id:             crypto.randomUUID(),
        userId,
        fundId,
        unitsHeld:      units,
        avgNav:         fund.nav,
        investedAmount: amount,
        currentValue,
        lastUpdated:    new Date(),
        createdAt:      new Date(),
      },
    });

    await prisma.transaction.update({
      where: { id: txn.id },
      data:  { portfolioId: portfolio.id, status: 'COMPLETED', settlementDate: new Date(), updatedAt: new Date() },
    });
  }

  return {
    transactionId: txn.id,
    fundName:      fund.schemeName,
    amount,
    units,
    nav:           fund.nav,
    status:        'COMPLETED',
  };
}

// ─── Update portfolio current values (run after NAV refresh) ──

export async function refreshPortfolioValues() {
  const portfolios = await prisma.portfolio.findMany({
    include: { fund: { select: { nav: true } } },
  });

  for (const p of portfolios) {
    if (p.fund.nav && p.fund.nav > 0) {
      await prisma.portfolio.update({
        where: { id: p.id },
        data:  { currentValue: p.unitsHeld * p.fund.nav, lastUpdated: new Date() },
      });
    }
  }
}
