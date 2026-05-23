-- Add NSE KYC fields to client_profiles table
ALTER TABLE "client_profiles"
  ADD COLUMN IF NOT EXISTS "nseKycStatus"      TEXT,
  ADD COLUMN IF NOT EXISTS "nseKycRemark"      TEXT,
  ADD COLUMN IF NOT EXISTS "nseEkycLink"       TEXT,
  ADD COLUMN IF NOT EXISTS "nseEkycLinkSentAt" TIMESTAMP(3);
