import api from './api';

// ─── Types ────────────────────────────────────────────────

export interface Fund {
  id:           string;
  schemeCode:   string;
  schemeName:   string;
  fundHouse:    string;
  category:     string;
  subCategory:  string | null;
  riskLevel:    string;
  nav:          number | null;
  navDate:      string | null;
  aum:          number | null;
  expenseRatio: number | null;
  minSipAmount: number;
  minLumpsum:   number;
  exitLoad:     string | null;
  navHistory?:  { nav: number; navDate: string }[];
}

export interface FundsResponse {
  funds:  Fund[];
  total:  number;
  page:   number;
  limit:  number;
  pages:  number;
}

export interface Holding {
  id:             string;
  fundId:         string;
  fundName:       string;
  fundHouse:      string;
  category:       string;
  riskLevel:      string;
  folioNumber:    string | null;
  unitsHeld:      number;
  avgNav:         number;
  currentNav:     number | null;
  navDate:        string | null;
  investedAmount: number;
  currentValue:   number;
  absoluteReturn: number;
  returnPct:      number;
}

export interface PortfolioSummary {
  totalInvested:  number;
  currentValue:   number;
  totalReturn:    number;
  totalReturnPct: number;
  totalFunds:     number;
}

export interface Transaction {
  id:         string;
  type:       string;
  status:     string;
  amount:     number;
  units:      number | null;
  navAtTxn:   number | null;
  txnDate:    string;
  fund:       { schemeName: string; fundHouse: string; category: string };
}

export interface FundSearchParams {
  q?:        string;
  category?: string;
  risk?:     string;
  sortBy?:   string;
  order?:    'asc' | 'desc';
  page?:     number;
  limit?:    number;
}

// ─── Fund APIs ────────────────────────────────────────────

export const fundService = {
  list: (params: FundSearchParams = {}): Promise<FundsResponse> => {
    const qs = new URLSearchParams();
    if (params.q)        qs.set('q',        params.q);
    if (params.category) qs.set('category', params.category);
    if (params.risk)     qs.set('risk',     params.risk);
    if (params.sortBy)   qs.set('sortBy',   params.sortBy);
    if (params.order)    qs.set('order',    params.order);
    if (params.page)     qs.set('page',     String(params.page));
    if (params.limit)    qs.set('limit',    String(params.limit));
    return api.get(`/funds?${qs}`).then((r) => r.data.data as FundsResponse);
  },

  categories: (): Promise<string[]> =>
    api.get('/funds/categories').then((r) => r.data.data as string[]),

  getById: (id: string): Promise<Fund> =>
    api.get(`/funds/${id}`).then((r) => r.data.data as Fund),
};

// ─── Portfolio APIs ───────────────────────────────────────

export const portfolioService = {
  get: (): Promise<{ holdings: Holding[]; summary: PortfolioSummary }> =>
    api.get('/portfolio').then((r) => r.data.data),

  transactions: (limit = 50): Promise<Transaction[]> =>
    api.get(`/portfolio/transactions?limit=${limit}`).then((r) => r.data.data),

  invest: (fundId: string, amount: number): Promise<{
    transactionId: string;
    fundName: string;
    amount: number;
    units: number;
    nav: number;
    status: string;
  }> =>
    api.post('/portfolio/invest', { fundId, amount }).then((r) => r.data.data),
};
