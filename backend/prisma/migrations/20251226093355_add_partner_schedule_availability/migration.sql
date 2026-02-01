-- CreateTable
CREATE TABLE "partner_schedule" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partnerId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "isEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "partner_schedule_partnerId_fkey" FOREIGN KEY ("partnerId") REFERENCES "UserProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "partner_break_log" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partnerId" TEXT NOT NULL,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" DATETIME,
    "reason" TEXT NOT NULL,
    "duration" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "partner_shift_log" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "partnerId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "startedAt" DATETIME NOT NULL,
    "endedAt" DATETIME,
    "totalMinutes" INTEGER,
    "breakMinutes" INTEGER NOT NULL DEFAULT 0,
    "ordersCount" INTEGER NOT NULL DEFAULT 0,
    "earnings" REAL NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME
);

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
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "lastOnlineAt" DATETIME,
    "autoAcceptOrders" BOOLEAN NOT NULL DEFAULT false,
    "maxConcurrentOrders" INTEGER NOT NULL DEFAULT 1,
    "currentBreakStartedAt" DATETIME,
    "currentBreakReason" TEXT,
    "totalBreakMinutesToday" INTEGER NOT NULL DEFAULT 0,
    "todayShiftStartedAt" DATETIME,
    "todayShiftEndedAt" DATETIME,
    "partnerOnboardingStep" TEXT DEFAULT 'PERSONAL_INFO',
    "partnerOnboardingCompletedAt" DATETIME,
    "backgroundCheckStatus" TEXT DEFAULT 'PENDING',
    "backgroundCheckNotes" TEXT,
    "termsAcceptedAt" DATETIME,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_UserProfile" ("aadhaarBackUrl", "aadhaarFrontUrl", "aadhaarNumber", "approvedAt", "backgroundCheckNotes", "backgroundCheckStatus", "bankAccountConfirm", "bankAccountNumber", "bankType", "bankVerificationStatus", "brandDescription", "brandLogo", "brandLogoUrl", "brandName", "brandWebsite", "businessCategories", "currentAddress", "dateOfBirth", "deletedAt", "designation", "digitalSignature", "drivingLicenseNumber", "drivingLicenseUrl", "emergencyContactName", "emergencyContactPhone", "emergencyContactRelation", "gender", "gstNumber", "gstVerificationStatus", "id", "ifscCode", "isActive", "legalBusinessName", "monthlySales", "onboardingStep", "panCardUrl", "panNumber", "partnerOnboardingCompletedAt", "partnerOnboardingStep", "permanentAddress", "preferredDeliveryZones", "preferredWorkingHours", "profilePhoto", "rejectedAt", "rejectionReason", "retailChannels", "role", "sellerAuthDocumentUrl", "signatureDate", "socialChannels", "termsAcceptedAt", "trademarkAuthDocumentUrl", "userId", "vehicleInsuranceExpiry", "vehicleInsuranceUrl", "vehicleModel", "vehicleNumber", "vehicleRcUrl", "vehicleType", "verificationStatus") SELECT "aadhaarBackUrl", "aadhaarFrontUrl", "aadhaarNumber", "approvedAt", "backgroundCheckNotes", "backgroundCheckStatus", "bankAccountConfirm", "bankAccountNumber", "bankType", "bankVerificationStatus", "brandDescription", "brandLogo", "brandLogoUrl", "brandName", "brandWebsite", "businessCategories", "currentAddress", "dateOfBirth", "deletedAt", "designation", "digitalSignature", "drivingLicenseNumber", "drivingLicenseUrl", "emergencyContactName", "emergencyContactPhone", "emergencyContactRelation", "gender", "gstNumber", "gstVerificationStatus", "id", "ifscCode", "isActive", "legalBusinessName", "monthlySales", "onboardingStep", "panCardUrl", "panNumber", "partnerOnboardingCompletedAt", "partnerOnboardingStep", "permanentAddress", "preferredDeliveryZones", "preferredWorkingHours", "profilePhoto", "rejectedAt", "rejectionReason", "retailChannels", "role", "sellerAuthDocumentUrl", "signatureDate", "socialChannels", "termsAcceptedAt", "trademarkAuthDocumentUrl", "userId", "vehicleInsuranceExpiry", "vehicleInsuranceUrl", "vehicleModel", "vehicleNumber", "vehicleRcUrl", "vehicleType", "verificationStatus" FROM "UserProfile";
DROP TABLE "UserProfile";
ALTER TABLE "new_UserProfile" RENAME TO "UserProfile";
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");
CREATE INDEX "UserProfile_role_idx" ON "UserProfile"("role");
CREATE INDEX "UserProfile_onboardingStep_idx" ON "UserProfile"("onboardingStep");
CREATE INDEX "UserProfile_verificationStatus_idx" ON "UserProfile"("verificationStatus");
CREATE INDEX "UserProfile_isOnline_idx" ON "UserProfile"("isOnline");
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

-- CreateIndex
CREATE INDEX "partner_schedule_partnerId_idx" ON "partner_schedule"("partnerId");

-- CreateIndex
CREATE INDEX "partner_schedule_dayOfWeek_idx" ON "partner_schedule"("dayOfWeek");

-- CreateIndex
CREATE INDEX "partner_schedule_isEnabled_idx" ON "partner_schedule"("isEnabled");

-- CreateIndex
CREATE INDEX "partner_schedule_deletedAt_idx" ON "partner_schedule"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "partner_schedule_partnerId_dayOfWeek_key" ON "partner_schedule"("partnerId", "dayOfWeek");

-- CreateIndex
CREATE INDEX "partner_break_log_partnerId_idx" ON "partner_break_log"("partnerId");

-- CreateIndex
CREATE INDEX "partner_break_log_startedAt_idx" ON "partner_break_log"("startedAt");

-- CreateIndex
CREATE INDEX "partner_break_log_deletedAt_idx" ON "partner_break_log"("deletedAt");

-- CreateIndex
CREATE INDEX "partner_shift_log_partnerId_idx" ON "partner_shift_log"("partnerId");

-- CreateIndex
CREATE INDEX "partner_shift_log_date_idx" ON "partner_shift_log"("date");

-- CreateIndex
CREATE INDEX "partner_shift_log_deletedAt_idx" ON "partner_shift_log"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "partner_shift_log_partnerId_date_key" ON "partner_shift_log"("partnerId", "date");
