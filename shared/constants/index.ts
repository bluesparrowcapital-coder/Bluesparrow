// Shared constants for Blue Sparrow MF Platform

export const FUND_CATEGORIES = [
  'Large Cap',
  'Mid Cap',
  'Small Cap',
  'Multi Cap',
  'Flexi Cap',
  'ELSS (Tax Saving)',
  'Index Fund',
  'Sectoral/Thematic',
  'Hybrid - Balanced',
  'Hybrid - Aggressive',
  'Debt - Short Duration',
  'Debt - Long Duration',
  'Liquid Fund',
  'Overnight Fund',
] as const;

export const RISK_LABELS: Record<string, string> = {
  LOW: 'Low Risk',
  MODERATE_LOW: 'Low to Moderate',
  MODERATE: 'Moderate',
  MODERATE_HIGH: 'Moderately High',
  HIGH: 'High',
  VERY_HIGH: 'Very High',
};

export const RISK_COLORS: Record<string, string> = {
  LOW: '#22c55e',
  MODERATE_LOW: '#84cc16',
  MODERATE: '#eab308',
  MODERATE_HIGH: '#f97316',
  HIGH: '#ef4444',
  VERY_HIGH: '#dc2626',
};

export const SIP_DATES = [1, 5, 7, 10, 15, 20, 25, 28];

export const SIP_AMOUNTS = [500, 1000, 2000, 3000, 5000, 10000, 25000, 50000];

export const LUMPSUM_AMOUNTS = [1000, 5000, 10000, 25000, 50000, 100000];

export const TRANSACTION_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
  CANCELLED: 'Cancelled',
};

export const KYC_STATUS_LABELS: Record<string, string> = {
  PENDING: 'KYC Pending',
  SUBMITTED: 'KYC Under Review',
  VERIFIED: 'KYC Verified',
  REJECTED: 'KYC Rejected',
};

export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
export const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];

export const OTP_EXPIRY_MINUTES = 10;
export const OTP_LENGTH = 6;

export const MIN_INVESTMENT_AMOUNT = 100;
export const MAX_INVESTMENT_AMOUNT = 10000000; // 1 Crore
