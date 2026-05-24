-- Add holdingType and placeOfBirth to client_profiles
ALTER TABLE "client_profiles" ADD COLUMN IF NOT EXISTS "holdingType"   TEXT;
ALTER TABLE "client_profiles" ADD COLUMN IF NOT EXISTS "placeOfBirth"  TEXT;

-- Add email and phone to nominees
ALTER TABLE "nominees" ADD COLUMN IF NOT EXISTS "email"   TEXT;
ALTER TABLE "nominees" ADD COLUMN IF NOT EXISTS "phone"   TEXT;
