import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface FundSearchParams {
  q?:        string;
  category?: string;
  risk?:     string;
  sortBy?:   'nav' | 'schemeName' | 'aum';
  order?:    'asc' | 'desc';
  page?:     number;
  limit?:    number;
}

export async function searchFunds(params: FundSearchParams) {
  const {
    q, category, risk,
    sortBy = 'schemeName', order = 'asc',
    page = 1, limit = 20,
  } = params;

  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { isActive: true };

  if (q) {
    where.OR = [
      { schemeName: { contains: q, mode: 'insensitive' } },
      { fundHouse:  { contains: q, mode: 'insensitive' } },
    ];
  }
  if (category) where.category = category;
  if (risk)     where.riskLevel = risk;

  const [funds, total] = await Promise.all([
    prisma.fund.findMany({
      where,
      skip,
      take: limit,
      orderBy: { [sortBy]: order },
      select: {
        id: true, schemeCode: true, schemeName: true, fundHouse: true,
        category: true, subCategory: true, riskLevel: true,
        nav: true, navDate: true, aum: true, expenseRatio: true,
        minSipAmount: true, minLumpsum: true, exitLoad: true,
      },
    }),
    prisma.fund.count({ where }),
  ]);

  return { funds, total, page, limit, pages: Math.ceil(total / limit) };
}

export async function getFundById(id: string) {
  return prisma.fund.findUnique({
    where: { id },
    include: {
      navHistory: {
        orderBy: { navDate: 'desc' },
        take: 365,
      },
    },
  });
}

export async function getFundCategories(): Promise<string[]> {
  const result = await prisma.fund.findMany({
    where: { isActive: true },
    select: { category: true },
    distinct: ['category'],
    orderBy: { category: 'asc' },
  });
  return result.map((r) => r.category);
}
