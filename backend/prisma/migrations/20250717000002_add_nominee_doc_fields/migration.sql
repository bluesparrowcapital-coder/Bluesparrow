-- AlterTable: add document type and number columns to nominees
ALTER TABLE "nominees" ADD COLUMN IF NOT EXISTS "docType"   TEXT;
ALTER TABLE "nominees" ADD COLUMN IF NOT EXISTS "docNumber" TEXT;
