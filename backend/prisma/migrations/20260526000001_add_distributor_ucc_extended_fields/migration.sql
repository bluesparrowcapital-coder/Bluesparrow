ALTER TABLE "client_profiles"
ADD COLUMN "mobileDeclaration" TEXT,
ADD COLUMN "mailDeclaration" TEXT,
ADD COLUMN "pepCategory" TEXT,
ADD COLUMN "countryOfBirth" TEXT,
ADD COLUMN "cityOfBirth" TEXT,
ADD COLUMN "verificationSource" TEXT,
ADD COLUMN "verificationDetails" TEXT,
ADD COLUMN "termsAcceptedAt" TIMESTAMP(3);

ALTER TABLE "addresses"
ADD COLUMN "addressLine3" TEXT,
ADD COLUMN "sourceOfWealth" TEXT;