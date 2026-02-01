-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_UserProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "deletedAt" DATETIME,
    "role" TEXT NOT NULL DEFAULT 'CUSTOMER',
    "businessCategories" TEXT,
    "retailChannels" TEXT,
    "socialChannels" TEXT,
    "monthlySales" TEXT,
    "designation" TEXT,
    "gstNumber" TEXT,
    "legalBusinessName" TEXT,
    "gstVerificationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "brandName" TEXT,
    "brandDescription" TEXT,
    "brandLogo" TEXT,
    "brandLogoUrl" TEXT,
    "brandWebsite" TEXT,
    "trademarkAuthDocumentUrl" TEXT,
    "sellerAuthDocumentUrl" TEXT,
    "bankAccountNumber" TEXT,
    "bankAccountConfirm" TEXT,
    "ifscCode" TEXT,
    "bankType" TEXT,
    "bankVerificationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "digitalSignature" TEXT,
    "signatureDate" DATETIME,
    "onboardingStep" TEXT NOT NULL DEFAULT 'BUSINESS_DETAILS',
    "verificationStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "approvedAt" DATETIME,
    "rejectedAt" DATETIME,
    "rejectionReason" TEXT,
    "dateOfBirth" DATETIME,
    "gender" TEXT,
    "profilePhoto" TEXT,
    "currentAddress" TEXT,
    "permanentAddress" TEXT,
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "emergencyContactRelation" TEXT,
    "aadhaarNumber" TEXT,
    "aadhaarFrontUrl" TEXT,
    "aadhaarBackUrl" TEXT,
    "panNumber" TEXT,
    "panCardUrl" TEXT,
    "drivingLicenseNumber" TEXT,
    "drivingLicenseUrl" TEXT,
    "vehicleType" TEXT,
    "vehicleNumber" TEXT,
    "vehicleModel" TEXT,
    "vehicleRcUrl" TEXT,
    "vehicleInsuranceUrl" TEXT,
    "vehicleInsuranceExpiry" DATETIME,
    "preferredWorkingHours" TEXT,
    "preferredDeliveryZones" TEXT,
    "partnerOnboardingStep" TEXT DEFAULT 'PERSONAL_INFO',
    "partnerOnboardingCompletedAt" DATETIME,
    "backgroundCheckStatus" TEXT DEFAULT 'PENDING',
    "backgroundCheckNotes" TEXT,
    "termsAcceptedAt" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_UserProfile" ("approvedAt", "bankAccountConfirm", "bankAccountNumber", "bankType", "bankVerificationStatus", "brandDescription", "brandLogo", "brandLogoUrl", "brandName", "brandWebsite", "businessCategories", "deletedAt", "designation", "digitalSignature", "gstNumber", "gstVerificationStatus", "id", "ifscCode", "legalBusinessName", "monthlySales", "onboardingStep", "rejectedAt", "rejectionReason", "retailChannels", "role", "sellerAuthDocumentUrl", "signatureDate", "socialChannels", "trademarkAuthDocumentUrl", "userId", "verificationStatus") SELECT "approvedAt", "bankAccountConfirm", "bankAccountNumber", "bankType", "bankVerificationStatus", "brandDescription", "brandLogo", "brandLogoUrl", "brandName", "brandWebsite", "businessCategories", "deletedAt", "designation", "digitalSignature", "gstNumber", "gstVerificationStatus", "id", "ifscCode", "legalBusinessName", "monthlySales", "onboardingStep", "rejectedAt", "rejectionReason", "retailChannels", "role", "sellerAuthDocumentUrl", "signatureDate", "socialChannels", "trademarkAuthDocumentUrl", "userId", "verificationStatus" FROM "UserProfile";
DROP TABLE "UserProfile";
ALTER TABLE "new_UserProfile" RENAME TO "UserProfile";
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");
CREATE INDEX "UserProfile_role_idx" ON "UserProfile"("role");
CREATE INDEX "UserProfile_onboardingStep_idx" ON "UserProfile"("onboardingStep");
CREATE INDEX "UserProfile_verificationStatus_idx" ON "UserProfile"("verificationStatus");
CREATE INDEX "UserProfile_deletedAt_idx" ON "UserProfile"("deletedAt");
CREATE INDEX "UserProfile_partnerOnboardingStep_idx" ON "UserProfile"("partnerOnboardingStep");
CREATE INDEX "UserProfile_backgroundCheckStatus_idx" ON "UserProfile"("backgroundCheckStatus");
CREATE UNIQUE INDEX "UserProfile_gstNumber_key" ON "UserProfile"("gstNumber");
CREATE UNIQUE INDEX "UserProfile_aadhaarNumber_key" ON "UserProfile"("aadhaarNumber");
CREATE UNIQUE INDEX "UserProfile_panNumber_key" ON "UserProfile"("panNumber");
CREATE UNIQUE INDEX "UserProfile_drivingLicenseNumber_key" ON "UserProfile"("drivingLicenseNumber");
CREATE UNIQUE INDEX "UserProfile_vehicleNumber_key" ON "UserProfile"("vehicleNumber");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
