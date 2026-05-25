-- Phase 4: Distributor Panel — Model Portfolios + Audit Logs

-- ModelPortfolio
CREATE TABLE IF NOT EXISTS "model_portfolios" (
  "id"            TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "distributorId" TEXT NOT NULL,
  "name"          TEXT NOT NULL,
  "description"   TEXT,
  "isActive"      BOOLEAN NOT NULL DEFAULT true,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "model_portfolios_pkey" PRIMARY KEY ("id")
);

-- ModelPortfolioFund
CREATE TABLE IF NOT EXISTS "model_portfolio_funds" (
  "id"               TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "modelPortfolioId" TEXT NOT NULL,
  "fundId"           TEXT NOT NULL,
  "allocationPct"    DOUBLE PRECISION NOT NULL,
  CONSTRAINT "model_portfolio_funds_pkey" PRIMARY KEY ("id")
);

-- ModelPortfolioAssign
CREATE TABLE IF NOT EXISTS "model_portfolio_assignments" (
  "id"               TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "modelPortfolioId" TEXT NOT NULL,
  "userId"           TEXT NOT NULL,
  "distributorId"    TEXT NOT NULL,
  "assignedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "model_portfolio_assignments_pkey" PRIMARY KEY ("id")
);

-- AuditLog
CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id"            TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "distributorId" TEXT NOT NULL,
  "action"        TEXT NOT NULL,
  "entityType"    TEXT NOT NULL,
  "entityId"      TEXT,
  "details"       JSONB,
  "ipAddress"     TEXT,
  "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- Unique constraints
ALTER TABLE "model_portfolio_funds"        ADD CONSTRAINT "model_portfolio_funds_modelPortfolioId_fundId_key"    UNIQUE ("modelPortfolioId", "fundId");
ALTER TABLE "model_portfolio_assignments"  ADD CONSTRAINT "model_portfolio_assignments_modelPortfolioId_userId_key" UNIQUE ("modelPortfolioId", "userId");

-- Foreign keys
ALTER TABLE "model_portfolios"            ADD CONSTRAINT "model_portfolios_distributorId_fkey"            FOREIGN KEY ("distributorId") REFERENCES "distributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "model_portfolio_funds"       ADD CONSTRAINT "model_portfolio_funds_modelPortfolioId_fkey"    FOREIGN KEY ("modelPortfolioId") REFERENCES "model_portfolios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "model_portfolio_funds"       ADD CONSTRAINT "model_portfolio_funds_fundId_fkey"              FOREIGN KEY ("fundId") REFERENCES "funds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "model_portfolio_assignments" ADD CONSTRAINT "model_portfolio_assignments_modelPortfolioId_fkey" FOREIGN KEY ("modelPortfolioId") REFERENCES "model_portfolios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "model_portfolio_assignments" ADD CONSTRAINT "model_portfolio_assignments_userId_fkey"        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "model_portfolio_assignments" ADD CONSTRAINT "model_portfolio_assignments_distributorId_fkey" FOREIGN KEY ("distributorId") REFERENCES "distributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "audit_logs"                  ADD CONSTRAINT "audit_logs_distributorId_fkey"                  FOREIGN KEY ("distributorId") REFERENCES "distributors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
