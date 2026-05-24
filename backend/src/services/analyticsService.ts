import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Asset Allocation ─────────────────────────────────────
// Group holdings by fund category and return % breakdown

export async function getAssetAllocation(userId: string) {
  const holdings = await prisma.portfolio.findMany({
    where:   { userId, unitsHeld: { gt: 0 } },
    include: { fund: { select: { category: true, nav: true } } },
  });

  const totals: Record<string, number> = {};
  let grand = 0;
  for (const h of holdings) {
    const val = h.currentValue > 0 ? h.currentValue : h.unitsHeld * (h.fund.nav ?? h.avgNav);
    const cat = normalizeCategory(h.fund.category);
    totals[cat] = (totals[cat] ?? 0) + val;
    grand += val;
  }

  if (grand === 0) return { allocation: [], totalValue: 0 };

  const allocation = Object.entries(totals).map(([category, value]) => ({
    category,
    value: parseFloat(value.toFixed(2)),
    pct:   parseFloat(((value / grand) * 100).toFixed(2)),
  })).sort((a, b) => b.value - a.value);

  return { allocation, totalValue: parseFloat(grand.toFixed(2)) };
}

// ─── Portfolio Returns ────────────────────────────────────
// XIRR-style: compare total current value vs total invested with time-weighted return

export async function getPortfolioReturns(userId: string) {
  const holdings = await prisma.portfolio.findMany({
    where:   { userId, unitsHeld: { gt: 0 } },
  });

  const totalInvested    = holdings.reduce((a, h) => a + h.investedAmount, 0);
  const totalCurrentVal  = holdings.reduce((a, h) => a + h.currentValue, 0);
  const absoluteReturn   = totalCurrentVal - totalInvested;
  const absoluteReturnPct = totalInvested > 0
    ? parseFloat(((absoluteReturn / totalInvested) * 100).toFixed(2))
    : 0;

  // Estimate CAGR using earliest transaction date
  const earliest = await prisma.transaction.findFirst({
    where:   { userId },
    orderBy: { txnDate: 'asc' },
    select:  { txnDate: true },
  });

  let cagrPct = 0;
  if (earliest && totalInvested > 0 && totalCurrentVal > 0) {
    const years = (Date.now() - earliest.txnDate.getTime()) / (365.25 * 24 * 3600 * 1000);
    if (years > 0.05) {
      cagrPct = parseFloat((( Math.pow(totalCurrentVal / totalInvested, 1 / years) - 1 ) * 100).toFixed(2));
    }
  }

  // Monthly NAV growth (last 12 months from nav_history for each fund)
  const chartData = await getMonthlyChart(userId);

  return {
    totalInvested:    parseFloat(totalInvested.toFixed(2)),
    totalCurrentVal:  parseFloat(totalCurrentVal.toFixed(2)),
    absoluteReturn:   parseFloat(absoluteReturn.toFixed(2)),
    absoluteReturnPct,
    cagrPct,
    chartData,
  };
}

// ─── Benchmark Comparison ─────────────────────────────────

export function getBenchmarkData() {
  // Static reference benchmarks (approximate 1Y, 3Y, 5Y, 10Y returns)
  return [
    { name: 'Your Portfolio',   color: '#3b82f6', returns: { '1Y': null, '3Y': null, '5Y': null } },
    { name: 'Nifty 50',         color: '#10b981', returns: { '1Y': 24.0, '3Y': 18.5, '5Y': 16.0 } },
    { name: 'Nifty Next 50',    color: '#6366f1', returns: { '1Y': 30.2, '3Y': 20.1, '5Y': 14.8 } },
    { name: 'Fixed Deposit',    color: '#f59e0b', returns: { '1Y':  7.0, '3Y':  7.0, '5Y':  6.8 } },
    { name: 'Savings Account',  color: '#ef4444', returns: { '1Y':  3.5, '3Y':  3.5, '5Y':  3.5 } },
  ];
}

// ─── SIP Summary ─────────────────────────────────────────

export async function getSipSummary(userId: string) {
  const sips = await prisma.sipMandate.findMany({ where: { userId } });
  const active    = sips.filter((s) => s.status === 'ACTIVE');
  const paused    = sips.filter((s) => s.status === 'PAUSED');
  const cancelled = sips.filter((s) => s.status === 'CANCELLED');

  const monthlyCommitment = active.reduce((a, s) => a + s.amount, 0);
  const totalInstalled    = sips.reduce((a, s) => a + s.amount * s.installmentsDone, 0);

  return {
    total:              sips.length,
    active:             active.length,
    paused:             paused.length,
    cancelled:          cancelled.length,
    monthlyCommitment:  parseFloat(monthlyCommitment.toFixed(2)),
    totalInstalled:     parseFloat(totalInstalled.toFixed(2)),
  };
}

// ─── Helpers ─────────────────────────────────────────────

function normalizeCategory(cat: string): string {
  const c = cat.toLowerCase();
  if (c.includes('equity') || c.includes('elss') || c.includes('flexi')) return 'Equity';
  if (c.includes('debt') || c.includes('liquid') || c.includes('gilt') || c.includes('bond')) return 'Debt';
  if (c.includes('hybrid') || c.includes('balanced')) return 'Hybrid';
  if (c.includes('gold') || c.includes('commodity')) return 'Commodity';
  return 'Other';
}

async function getMonthlyChart(userId: string) {
  // Return last 12 months of portfolio value snapshots via transactions
  const txns = await prisma.transaction.findMany({
    where:   { userId, status: 'COMPLETED' },
    orderBy: { txnDate: 'asc' },
    select:  { txnDate: true, amount: true, type: true },
  });

  const months: Record<string, number> = {};
  let cumulative = 0;
  for (const t of txns) {
    const key = t.txnDate.toISOString().slice(0, 7); // 'YYYY-MM'
    const delta = t.type === 'BUY' || t.type === 'SWITCH_IN' ? t.amount : -t.amount;
    cumulative += delta;
    months[key] = parseFloat(cumulative.toFixed(2));
  }

  return Object.entries(months)
    .slice(-12)
    .map(([month, value]) => ({ month, value }));
}
