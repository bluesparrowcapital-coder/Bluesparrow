-- AddColumn: accountType to BankAccount
-- NSE NMF II requires dynamic account type (SB=Savings, CA=Current, NRE, NRO)

ALTER TABLE "BankAccount" ADD COLUMN IF NOT EXISTS "accountType" TEXT NOT NULL DEFAULT 'SB';
