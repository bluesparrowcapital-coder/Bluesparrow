-- Phase 2: Fund, NavHistory, Portfolio, Transaction, SipMandate, Goal tables
-- Distributor, KycDocument, Notification tables also added

CREATE TABLE IF NOT EXISTS "distributors" (
  "id"         TEXT NOT NULL PRIMARY KEY,
  "userId"     TEXT NOT NULL UNIQUE,
  "arnNumber"  TEXT NOT NULL UNIQUE,
  "euinNumber" TEXT,
  "firmName"   TEXT NOT NULL,
  "isActive"   BOOLEAN NOT NULL DEFAULT true,
  "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "distributors_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS "funds" (
  "id"            TEXT NOT NULL PRIMARY KEY,
  "schemeCode"    TEXT NOT NULL UNIQUE,
  "isinGrowth"    TEXT,
  "isinDividend"  TEXT,
  "schemeName"    TEXT NOT NULL,
  "fundHouse"     TEXT NOT NULL,
  "category"      TEXT NOT NULL,
  "subCategory"   TEXT,
  "schemeType"    TEXT NOT NULL,
  "riskLevel"     TEXT NOT NULL DEFAULT 'MODERATE',
  "nav"           DOUBLE PRECISION,
  "navDate"       TIMESTAMP(3),
  "aum"           DOUBLE PRECISION,
  "expenseRatio"  DOUBLE PRECISION,
  "minSipAmount"  DOUBLE PRECISION NOT NULL DEFAULT 500,
  "minLumpsum"    DOUBLE PRECISION NOT NULL DEFAULT 1000,
  "exitLoad"      TEXT,
  "lockInPeriod"  INTEGER,
  "isActive"      BOOLEAN NOT NULL DEFAULT true,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "nav_history" (
  "id"      TEXT NOT NULL PRIMARY KEY,
  "fundId"  TEXT NOT NULL,
  "nav"     DOUBLE PRECISION NOT NULL,
  "navDate" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "nav_history_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "funds"("id"),
  CONSTRAINT "nav_history_fundId_navDate_key" UNIQUE ("fundId", "navDate")
);

CREATE TABLE IF NOT EXISTS "portfolios" (
  "id"             TEXT NOT NULL PRIMARY KEY,
  "userId"         TEXT NOT NULL,
  "fundId"         TEXT NOT NULL,
  "distributorId"  TEXT,
  "folioNumber"    TEXT,
  "unitsHeld"      DOUBLE PRECISION NOT NULL DEFAULT 0,
  "avgNav"         DOUBLE PRECISION NOT NULL DEFAULT 0,
  "investedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "currentValue"   DOUBLE PRECISION NOT NULL DEFAULT 0,
  "lastUpdated"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "portfolios_userId_fkey"        FOREIGN KEY ("userId")        REFERENCES "users"("id"),
  CONSTRAINT "portfolios_fundId_fkey"        FOREIGN KEY ("fundId")        REFERENCES "funds"("id"),
  CONSTRAINT "portfolios_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "distributors"("id"),
  CONSTRAINT "portfolios_userId_fundId_folioNumber_key" UNIQUE ("userId", "fundId", "folioNumber")
);

CREATE TABLE IF NOT EXISTS "transactions" (
  "id"             TEXT NOT NULL PRIMARY KEY,
  "userId"         TEXT NOT NULL,
  "fundId"         TEXT NOT NULL,
  "portfolioId"    TEXT,
  "type"           TEXT NOT NULL DEFAULT 'BUY',
  "status"         TEXT NOT NULL DEFAULT 'PENDING',
  "amount"         DOUBLE PRECISION NOT NULL,
  "units"          DOUBLE PRECISION,
  "navAtTxn"       DOUBLE PRECISION,
  "bseOrderId"     TEXT,
  "paymentRef"     TEXT,
  "txnDate"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "settlementDate" TIMESTAMP(3),
  "remarks"        TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "transactions_userId_fkey"     FOREIGN KEY ("userId")     REFERENCES "users"("id"),
  CONSTRAINT "transactions_fundId_fkey"     FOREIGN KEY ("fundId")     REFERENCES "funds"("id"),
  CONSTRAINT "transactions_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "portfolios"("id")
);

CREATE TABLE IF NOT EXISTS "sip_mandates" (
  "id"                 TEXT NOT NULL PRIMARY KEY,
  "userId"             TEXT NOT NULL,
  "fundId"             TEXT NOT NULL,
  "portfolioId"        TEXT,
  "amount"             DOUBLE PRECISION NOT NULL,
  "frequency"          TEXT NOT NULL DEFAULT 'MONTHLY',
  "sipDate"            INTEGER NOT NULL,
  "startDate"          TIMESTAMP(3) NOT NULL,
  "endDate"            TIMESTAMP(3),
  "nextExecutionDate"  TIMESTAMP(3),
  "installmentsDone"   INTEGER NOT NULL DEFAULT 0,
  "totalInstallments"  INTEGER,
  "status"             TEXT NOT NULL DEFAULT 'ACTIVE',
  "mandateId"          TEXT,
  "createdAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"          TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sip_mandates_userId_fkey"     FOREIGN KEY ("userId")     REFERENCES "users"("id"),
  CONSTRAINT "sip_mandates_fundId_fkey"     FOREIGN KEY ("fundId")     REFERENCES "funds"("id"),
  CONSTRAINT "sip_mandates_portfolioId_fkey" FOREIGN KEY ("portfolioId") REFERENCES "portfolios"("id")
);

CREATE TABLE IF NOT EXISTS "goals" (
  "id"            TEXT NOT NULL PRIMARY KEY,
  "userId"        TEXT NOT NULL,
  "goalName"      TEXT NOT NULL,
  "targetAmount"  DOUBLE PRECISION NOT NULL,
  "currentAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "targetDate"    TIMESTAMP(3) NOT NULL,
  "isCompleted"   BOOLEAN NOT NULL DEFAULT false,
  "linkedSipIds"  TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "goals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id")
);

CREATE TABLE IF NOT EXISTS "kyc_documents" (
  "id"              TEXT NOT NULL PRIMARY KEY,
  "userId"          TEXT NOT NULL,
  "docType"         TEXT NOT NULL,
  "docUrl"          TEXT NOT NULL,
  "isVerified"      BOOLEAN NOT NULL DEFAULT false,
  "verifiedAt"      TIMESTAMP(3),
  "rejectionReason" TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "kyc_documents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id")
);

CREATE TABLE IF NOT EXISTS "notifications" (
  "id"        TEXT NOT NULL PRIMARY KEY,
  "userId"    TEXT NOT NULL,
  "title"     TEXT NOT NULL,
  "body"      TEXT NOT NULL,
  "type"      TEXT NOT NULL,
  "isRead"    BOOLEAN NOT NULL DEFAULT false,
  "readAt"    TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id")
);
