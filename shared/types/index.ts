// Shared TypeScript types used by both Frontend and Backend

// ─── USER TYPES ───────────────────────────────────────────

export type KycStatus = 'PENDING' | 'SUBMITTED' | 'VERIFIED' | 'REJECTED';
export type UserRole = 'INVESTOR' | 'DISTRIBUTOR' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  phone: string;
  fullName: string;
  panNumber?: string;
  dob?: string;
  gender?: string;
  role: UserRole;
  kycStatus: KycStatus;
  createdAt: string;
}

// ─── FUND TYPES ───────────────────────────────────────────

export type RiskLevel =
  | 'LOW'
  | 'MODERATE_LOW'
  | 'MODERATE'
  | 'MODERATE_HIGH'
  | 'HIGH'
  | 'VERY_HIGH';

export interface Fund {
  id: string;
  schemeCode: string;
  schemeName: string;
  fundHouse: string;
  category: string;
  subCategory?: string;
  riskLevel: RiskLevel;
  nav: number;
  navDate: string;
  aum?: number;
  expenseRatio?: number;
  minSipAmount: number;
  minLumpsum: number;
  exitLoad?: string;
  returns?: FundReturns;
}

export interface FundReturns {
  oneMonth?: number;
  threeMonth?: number;
  sixMonth?: number;
  oneYear?: number;
  threeYear?: number;
  fiveYear?: number;
  sinceInception?: number;
}

// ─── PORTFOLIO TYPES ──────────────────────────────────────

export interface Portfolio {
  id: string;
  userId: string;
  fund: Fund;
  folioNumber?: string;
  unitsHeld: number;
  avgNav: number;
  investedAmount: number;
  currentValue: number;
  gainLoss: number;
  gainLossPercent: number;
}

export interface PortfolioSummary {
  totalInvested: number;
  currentValue: number;
  totalGainLoss: number;
  totalGainLossPercent: number;
  xirr?: number;
  holdings: Portfolio[];
}

// ─── TRANSACTION TYPES ────────────────────────────────────

export type TransactionType =
  | 'BUY'
  | 'SELL'
  | 'SWITCH_IN'
  | 'SWITCH_OUT'
  | 'SWP'
  | 'STP'
  | 'DIVIDEND';

export type TransactionStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED';

export interface Transaction {
  id: string;
  fund: Pick<Fund, 'id' | 'schemeName' | 'fundHouse'>;
  type: TransactionType;
  status: TransactionStatus;
  amount: number;
  units?: number;
  navAtTxn?: number;
  txnDate: string;
  settlementDate?: string;
}

// ─── SIP TYPES ────────────────────────────────────────────

export type SipFrequency = 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
export type SipStatus = 'ACTIVE' | 'PAUSED' | 'CANCELLED' | 'COMPLETED';

export interface SipMandate {
  id: string;
  fund: Pick<Fund, 'id' | 'schemeName' | 'fundHouse'>;
  amount: number;
  frequency: SipFrequency;
  sipDate: number;
  startDate: string;
  endDate?: string;
  nextExecutionDate?: string;
  installmentsDone: number;
  totalInstallments?: number;
  status: SipStatus;
}

// ─── GOAL TYPES ───────────────────────────────────────────

export interface Goal {
  id: string;
  goalName: string;
  targetAmount: number;
  currentAmount: number;
  targetDate: string;
  isCompleted: boolean;
  progressPercent: number;
}

// ─── API RESPONSE TYPES ───────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
