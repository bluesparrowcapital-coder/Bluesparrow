/**
 * AMFI Service — downloads daily NAV file from AMFI India and
 * upserts Fund + NavHistory records into the database.
 *
 * AMFI NAV file format (NAVAll.txt):
 * Scheme Code;ISIN Div Payout/IDCW;ISIN Div Reinvestment;Scheme Name;Net Asset Value;Date
 * 100033;INF209K01157;INF209K01165;Aditya Birla Sun Life ...;47.5410;25-May-2026
 */

import axios from 'axios';
import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

const prisma = new PrismaClient();

const AMFI_NAV_URL = 'https://www.amfiindia.com/spages/NAVAll.txt';

// Map AMFI category keywords → our category labels
function mapCategory(schemeName: string): string {
  const n = schemeName.toLowerCase();
  if (n.includes('liquid'))                        return 'Liquid';
  if (n.includes('overnight'))                     return 'Overnight';
  if (n.includes('ultra short') || n.includes('ultra-short')) return 'Ultra Short';
  if (n.includes('money market'))                  return 'Money Market';
  if (n.includes('short duration') || n.includes('short term')) return 'Short Duration';
  if (n.includes('medium duration') || n.includes('medium term')) return 'Medium Duration';
  if (n.includes('long duration') || n.includes('long term'))   return 'Long Duration';
  if (n.includes('dynamic bond'))                  return 'Dynamic Bond';
  if (n.includes('corporate bond'))                return 'Corporate Bond';
  if (n.includes('credit risk'))                   return 'Credit Risk';
  if (n.includes('gilt'))                          return 'Gilt';
  if (n.includes('debt') || n.includes('income'))  return 'Debt';
  if (n.includes('elss') || n.includes('tax saver') || n.includes('tax saving')) return 'ELSS';
  if (n.includes('index') || n.includes('nifty') || n.includes('sensex') || n.includes('nse')) return 'Index';
  if (n.includes('etf'))                           return 'ETF';
  if (n.includes('international') || n.includes('global') || n.includes('overseas')) return 'International';
  if (n.includes('small cap'))                     return 'Small Cap';
  if (n.includes('mid cap'))                       return 'Mid Cap';
  if (n.includes('large & mid') || n.includes('large and mid')) return 'Large & Mid Cap';
  if (n.includes('large cap'))                     return 'Large Cap';
  if (n.includes('multi cap') || n.includes('multicap'))        return 'Multi Cap';
  if (n.includes('flexi cap') || n.includes('flexicap'))        return 'Flexi Cap';
  if (n.includes('focused'))                       return 'Focused';
  if (n.includes('value') || n.includes('contra')) return 'Value/Contra';
  if (n.includes('dividend yield'))                return 'Dividend Yield';
  if (n.includes('sectoral') || n.includes('sector') || n.includes('thematic')) return 'Sectoral/Thematic';
  if (n.includes('balanced advantage') || n.includes('dynamic asset')) return 'Balanced Advantage';
  if (n.includes('aggressive hybrid') || n.includes('equity hybrid')) return 'Aggressive Hybrid';
  if (n.includes('conservative hybrid'))           return 'Conservative Hybrid';
  if (n.includes('arbitrage'))                     return 'Arbitrage';
  if (n.includes('hybrid'))                        return 'Hybrid';
  if (n.includes('equity'))                        return 'Equity';
  return 'Other';
}

function mapRisk(category: string): string {
  const c = category.toLowerCase();
  if (['liquid', 'overnight', 'money market'].includes(c))                         return 'LOW';
  if (['ultra short', 'short duration'].includes(c))                               return 'MODERATE_LOW';
  if (['medium duration', 'corporate bond', 'dynamic bond', 'debt', 'income'].includes(c)) return 'MODERATE';
  if (['large cap', 'balanced advantage', 'aggressive hybrid', 'hybrid'].includes(c))      return 'MODERATE_HIGH';
  if (['mid cap', 'large & mid cap', 'flexi cap', 'multi cap', 'focused'].includes(c))     return 'HIGH';
  if (['small cap', 'sectoral/thematic', 'international', 'elss', 'credit risk'].includes(c)) return 'VERY_HIGH';
  return 'MODERATE';
}

function parseNavDate(raw: string): Date | null {
  // Formats: "25-May-2026" or "25/05/2026"
  try {
    if (raw.includes('-')) {
      const parts = raw.split('-');
      if (parts.length === 3) {
        const months: Record<string, string> = {
          Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06',
          Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12',
        };
        const month = months[parts[1]] || parts[1].padStart(2, '0');
        return new Date(`${parts[2]}-${month}-${parts[0].padStart(2, '0')}T00:00:00.000Z`);
      }
    }
    return new Date(raw);
  } catch { return null; }
}

export async function fetchAndSeedAmfiNav(): Promise<{ updated: number; skipped: number }> {
  logger.info('AMFI NAV sync started');

  const response = await axios.get<string>(AMFI_NAV_URL, {
    timeout: 60000,
    responseType: 'text',
  });

  const lines = response.data.split('\n');
  let currentFundHouse = '';
  let updated = 0;
  let skipped = 0;

  const batchSize = 100;
  const batch: Array<{
    schemeCode: string; isinGrowth: string | null; isinDividend: string | null;
    schemeName: string; fundHouse: string; nav: number; navDate: Date; category: string;
  }> = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    // Fund house header line — no semicolons, ends with word chars
    if (!line.includes(';')) {
      currentFundHouse = line.replace(/\s+/g, ' ').trim();
      continue;
    }

    const parts = line.split(';');
    if (parts.length < 6) continue;

    const [schemeCodeRaw, isin1, isin2, schemeName, navRaw, dateRaw] = parts;
    const schemeCode = schemeCodeRaw.trim();
    const nav = parseFloat(navRaw.trim());
    const navDate = parseNavDate(dateRaw.trim());

    if (!schemeCode || isNaN(nav) || nav <= 0 || !navDate) { skipped++; continue; }
    if (!schemeName.trim()) { skipped++; continue; }

    batch.push({
      schemeCode,
      isinGrowth:   isin1.trim() || null,
      isinDividend: isin2.trim() || null,
      schemeName:   schemeName.trim(),
      fundHouse:    currentFundHouse,
      nav,
      navDate,
      category:     mapCategory(schemeName),
    });

    if (batch.length >= batchSize) {
      await processBatch(batch);
      updated += batch.length;
      batch.length = 0;
    }
  }

  if (batch.length > 0) {
    await processBatch(batch);
    updated += batch.length;
  }

  logger.info(`AMFI NAV sync complete: updated=${updated} skipped=${skipped}`);
  return { updated, skipped };
}

async function processBatch(items: typeof [] extends never ? never : Array<{
  schemeCode: string; isinGrowth: string | null; isinDividend: string | null;
  schemeName: string; fundHouse: string; nav: number; navDate: Date; category: string;
}>) {
  for (const item of items) {
    try {
      const category = item.category;
      const riskLevel = mapRisk(category) as
        'LOW' | 'MODERATE_LOW' | 'MODERATE' | 'MODERATE_HIGH' | 'HIGH' | 'VERY_HIGH';

      const fund = await prisma.fund.upsert({
        where:  { schemeCode: item.schemeCode },
        create: {
          id:          require('crypto').randomUUID(),
          schemeCode:  item.schemeCode,
          isinGrowth:  item.isinGrowth,
          isinDividend: item.isinDividend,
          schemeName:  item.schemeName,
          fundHouse:   item.fundHouse,
          category,
          schemeType:  'Open-ended',
          riskLevel,
          nav:         item.nav,
          navDate:     item.navDate,
          isActive:    true,
        },
        update: {
          nav:         item.nav,
          navDate:     item.navDate,
          schemeName:  item.schemeName,
          isinGrowth:  item.isinGrowth,
          isinDividend: item.isinDividend,
          updatedAt:   new Date(),
        },
      });

      // Upsert NAV history record
      await prisma.navHistory.upsert({
        where:  { fundId_navDate: { fundId: fund.id, navDate: item.navDate } },
        create: { id: require('crypto').randomUUID(), fundId: fund.id, nav: item.nav, navDate: item.navDate },
        update: { nav: item.nav },
      });
    } catch (e) {
      // Skip individual fund errors (e.g. duplicate ISIN)
    }
  }
}
