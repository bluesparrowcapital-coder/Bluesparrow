import { PrismaClient, TransactionStatus, TransactionType } from '@prisma/client';
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
      type:     TransactionType.BUY,
      status:   TransactionStatus.PROCESSING,
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
      data:  { portfolioId: existingPortfolio.id, status: TransactionStatus.COMPLETED, settlementDate: new Date(), updatedAt: new Date() },
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
      data:  { portfolioId: portfolio.id, status: TransactionStatus.COMPLETED, settlementDate: new Date(), updatedAt: new Date() },
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

// ─── Redeem Units ─────────────────────────────────────────

export interface RedeemInput {
  userId:          string;
  portfolioId:     string;
  units?:          number;  // if not provided, redeem all
  isFullRedemption: boolean;
}

export async function redeemUnits(input: RedeemInput) {
  const portfolio = await prisma.portfolio.findFirst({
    where:   { id: input.portfolioId, userId: input.userId },
    include: { fund: true },
  });
  if (!portfolio)              throw new Error('Portfolio holding not found');
  if (portfolio.unitsHeld <= 0) throw new Error('No units to redeem');
  if (!portfolio.fund.nav)     throw new Error('NAV not available');

  const redeemUnitsCount = input.isFullRedemption ? portfolio.unitsHeld : (input.units ?? 0);
  if (redeemUnitsCount <= 0)   throw new Error('Units to redeem must be greater than 0');
  if (redeemUnitsCount > portfolio.unitsHeld)
    throw new Error(`Cannot redeem ${redeemUnitsCount} units — only ${portfolio.unitsHeld.toFixed(4)} held`);

  const nav          = portfolio.fund.nav;
  const redeemAmount = Math.round(redeemUnitsCount * nav * 100) / 100;

  const txn = await prisma.transaction.create({
    data: {
      userId:        input.userId,
      fundId:        portfolio.fundId,
      portfolioId:   portfolio.id,
      type:          TransactionType.SELL,
      status:        TransactionStatus.COMPLETED,
      amount:        redeemAmount,
      units:         redeemUnitsCount,
      navAtTxn:      nav,
      txnDate:       new Date(),
      settlementDate: new Date(Date.now() + 3 * 86_400_000), // T+3 settlement
      remarks:       input.isFullRedemption ? 'Full redemption' : `Partial redemption — ${redeemUnitsCount} units`,
    },
  });

  const remaining = portfolio.unitsHeld - redeemUnitsCount;
  if (remaining < 0.001) {
    // Close out the holding
    await prisma.portfolio.update({
      where: { id: portfolio.id },
      data:  { unitsHeld: 0, currentValue: 0, lastUpdated: new Date() },
    });
  } else {
    // Adjust invested amount proportionally
    const newInvested = (portfolio.investedAmount * remaining) / portfolio.unitsHeld;
    await prisma.portfolio.update({
      where: { id: portfolio.id },
      data: {
        unitsHeld:      remaining,
        investedAmount: Math.round(newInvested * 100) / 100,
        currentValue:   Math.round(remaining * nav * 100) / 100,
        lastUpdated:    new Date(),
      },
    });
  }

  await prisma.notification.create({
    data: {
      userId: input.userId,
      title:  'Redemption Placed',
      body:   `Redeemed ${redeemUnitsCount.toFixed(4)} units of ${portfolio.fund.schemeName} for ₹${redeemAmount}. Amount credited in T+3 days.`,
      type:   'TXN',
    },
  });

  return {
    transactionId:  txn.id,
    fundName:       portfolio.fund.schemeName,
    unitsRedeemed:  redeemUnitsCount,
    nav,
    redeemAmount,
    settlementDate: txn.settlementDate,
    status:         'COMPLETED',
  };
}

// ─── Switch Fund ─────────────────────────────────────────

export interface SwitchInput {
  userId:          string;
  fromPortfolioId: string;
  toFundId:        string;
  units?:          number;
  isFullSwitch:    boolean;
}

export async function switchFund(input: SwitchInput) {
  const fromPortfolio = await prisma.portfolio.findFirst({
    where:   { id: input.fromPortfolioId, userId: input.userId },
    include: { fund: true },
  });
  if (!fromPortfolio)              throw new Error('Source holding not found');
  if (fromPortfolio.unitsHeld <= 0) throw new Error('No units to switch');
  if (!fromPortfolio.fund.nav)      throw new Error('NAV not available for source fund');

  const toFund = await prisma.fund.findUnique({ where: { id: input.toFundId } });
  if (!toFund || !toFund.isActive) throw new Error('Target fund not found or inactive');
  if (!toFund.nav)                  throw new Error('NAV not available for target fund');

  const switchUnits  = input.isFullSwitch ? fromPortfolio.unitsHeld : (input.units ?? 0);
  if (switchUnits <= 0) throw new Error('Units to switch must be greater than 0');
  if (switchUnits > fromPortfolio.unitsHeld) throw new Error('Insufficient units');

  const switchAmount = Math.round(switchUnits * fromPortfolio.fund.nav * 100) / 100;
  const toUnits      = Math.round((switchAmount / toFund.nav) * 10000) / 10000;

  // SWITCH_OUT from source
  await prisma.transaction.create({
    data: {
      userId: input.userId, fundId: fromPortfolio.fundId, portfolioId: fromPortfolio.id,
      type: TransactionType.SWITCH_OUT, status: TransactionStatus.COMPLETED,
      amount: switchAmount, units: switchUnits, navAtTxn: fromPortfolio.fund.nav,
      txnDate: new Date(), remarks: `Switch to ${toFund.schemeName}`,
    },
  });

  // Update source portfolio
  const remaining = fromPortfolio.unitsHeld - switchUnits;
  const newInvested = remaining < 0.001 ? 0 : (fromPortfolio.investedAmount * remaining) / fromPortfolio.unitsHeld;
  await prisma.portfolio.update({
    where: { id: fromPortfolio.id },
    data: {
      unitsHeld: remaining < 0.001 ? 0 : remaining,
      investedAmount: Math.round(newInvested * 100) / 100,
      currentValue: Math.round(remaining * fromPortfolio.fund.nav * 100) / 100,
      lastUpdated: new Date(),
    },
  });

  // SWITCH_IN to target — upsert target portfolio
  const existing = await prisma.portfolio.findFirst({ where: { userId: input.userId, fundId: input.toFundId } });
  let toPortfolio;
  if (existing) {
    const newUnits    = existing.unitsHeld + toUnits;
    const newInvested2 = existing.investedAmount + switchAmount;
    toPortfolio = await prisma.portfolio.update({
      where: { id: existing.id },
      data: { unitsHeld: newUnits, investedAmount: Math.round(newInvested2 * 100) / 100,
              avgNav: newInvested2 / newUnits, currentValue: Math.round(newUnits * toFund.nav * 100) / 100, lastUpdated: new Date() },
    });
  } else {
    toPortfolio = await prisma.portfolio.create({
      data: { userId: input.userId, fundId: input.toFundId, unitsHeld: toUnits, investedAmount: switchAmount,
              avgNav: toFund.nav, currentValue: Math.round(toUnits * toFund.nav * 100) / 100, lastUpdated: new Date() },
    });
  }

  await prisma.transaction.create({
    data: {
      userId: input.userId, fundId: input.toFundId, portfolioId: toPortfolio.id,
      type: TransactionType.SWITCH_IN, status: TransactionStatus.COMPLETED,
      amount: switchAmount, units: toUnits, navAtTxn: toFund.nav,
      txnDate: new Date(), remarks: `Switch from ${fromPortfolio.fund.schemeName}`,
    },
  });

  await prisma.notification.create({
    data: {
      userId: input.userId,
      title: 'Switch Placed',
      body: `Switched ${switchUnits} units from ${fromPortfolio.fund.schemeName} → ${toFund.schemeName}.`,
      type: 'TXN',
    },
  });

  return {
    fromFund:     fromPortfolio.fund.schemeName,
    toFund:       toFund.schemeName,
    switchAmount,
    switchUnits,
    toUnits,
    status:       'COMPLETED',
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
