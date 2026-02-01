-- Add Delivery Partner Onboarding Fields to UserProfile
-- This extends the existing UserProfile table with delivery partner specific fields

-- Personal Information
ALTER TABLE UserProfile ADD COLUMN dateOfBirth TEXT;
ALTER TABLE UserProfile ADD COLUMN gender TEXT; -- "MALE", "FEMALE", "OTHER"
ALTER TABLE UserProfile ADD COLUMN profilePhoto TEXT;

-- Address Details
ALTER TABLE UserProfile ADD COLUMN currentAddress TEXT; -- JSON: full address object
ALTER TABLE UserProfile ADD COLUMN permanentAddress TEXT; -- JSON: full address object

-- Emergency Contact
ALTER TABLE UserProfile ADD COLUMN emergencyContactName TEXT;
ALTER TABLE UserProfile ADD COLUMN emergencyContactPhone TEXT;
ALTER TABLE UserProfile ADD COLUMN emergencyContactRelation TEXT;

-- Identity Documents (store URLs after upload)
ALTER TABLE UserProfile ADD COLUMN aadhaarNumber TEXT;
ALTER TABLE UserProfile ADD COLUMN aadhaarFrontUrl TEXT;
ALTER TABLE UserProfile ADD COLUMN aadhaarBackUrl TEXT;
ALTER TABLE UserProfile ADD COLUMN panNumber TEXT;
ALTER TABLE UserProfile ADD COLUMN panCardUrl TEXT;
ALTER TABLE UserProfile ADD COLUMN drivingLicenseNumber TEXT;
ALTER TABLE UserProfile ADD COLUMN drivingLicenseUrl TEXT;

-- Vehicle Details (for DELIVERY_DRIVER role)
ALTER TABLE UserProfile ADD COLUMN vehicleType TEXT; -- "Bike", "Scooter", "Bicycle", "Car"
ALTER TABLE UserProfile ADD COLUMN vehicleNumber TEXT;
ALTER TABLE UserProfile ADD COLUMN vehicleModel TEXT;
ALTER TABLE UserProfile ADD COLUMN vehicleRcUrl TEXT; -- Registration Certificate
ALTER TABLE UserProfile ADD COLUMN vehicleInsuranceUrl TEXT;
ALTER TABLE UserProfile ADD COLUMN vehicleInsuranceExpiry TEXT;

-- Work Preference
ALTER TABLE UserProfile ADD COLUMN preferredWorkingHours TEXT; -- "Morning", "Evening", "Night", "Flexible"
ALTER TABLE UserProfile ADD COLUMN preferredDeliveryZones TEXT; -- JSON array of zone IDs

-- Partner Onboarding Status
ALTER TABLE UserProfile ADD COLUMN partnerOnboardingStep TEXT DEFAULT 'PERSONAL_INFO'; 
-- Steps: PERSONAL_INFO, ADDRESS_DETAILS, EMERGENCY_CONTACT, IDENTITY_DOCS, VEHICLE_DETAILS (driver only), BANK_DETAILS, TERMS_ACCEPTANCE, COMPLETED
ALTER TABLE UserProfile ADD COLUMN partnerOnboardingCompletedAt TEXT;
ALTER TABLE UserProfile ADD COLUMN backgroundCheckStatus TEXT DEFAULT 'PENDING'; -- PENDING, IN_PROGRESS, VERIFIED, REJECTED
ALTER TABLE UserProfile ADD COLUMN backgroundCheckNotes TEXT;
ALTER TABLE UserProfile ADD COLUMN termsAcceptedAt TEXT;
ALTER TABLE UserProfile ADD COLUMN isActive INTEGER DEFAULT 1; -- 0 = inactive/suspended, 1 = active
