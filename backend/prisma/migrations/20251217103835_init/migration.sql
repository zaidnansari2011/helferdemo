-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL,
    "image" TEXT,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "phoneNumber" TEXT,
    "phoneNumberVerified" BOOLEAN
);

-- CreateTable
CREATE TABLE "UserProfile" (
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
    CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "expiresAt" DATETIME NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,
    CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" DATETIME,
    "refreshTokenExpiresAt" DATETIME,
    "scope" TEXT,
    "password" TEXT,
    "createdAt" DATETIME NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME,
    "updatedAt" DATETIME
);

-- CreateTable
CREATE TABLE "address" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "fullAddress" TEXT NOT NULL,
    "landmark" TEXT,
    "pincode" TEXT NOT NULL,
    "latitude" REAL,
    "longitude" REAL,
    "receiverName" TEXT,
    "receiverPhone" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "shipping_location" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sellerId" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "gstNumber" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "shipping_location_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "UserProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "parentId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "brand" TEXT,
    "sku" TEXT NOT NULL,
    "basePrice" REAL NOT NULL,
    "images" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "sellerId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "product_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "UserProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "product_variant" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "barcode" TEXT,
    "price" REAL NOT NULL,
    "attributes" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "product_variant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "warehouse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "sellerId" TEXT NOT NULL,
    "shippingLocationId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "warehouse_sellerId_fkey" FOREIGN KEY ("sellerId") REFERENCES "UserProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "warehouse_shippingLocationId_fkey" FOREIGN KEY ("shippingLocationId") REFERENCES "shipping_location" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "warehouse_floor_plan" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "warehouseId" TEXT NOT NULL,
    "floor" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "warehouse_floor_plan_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouse" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "warehouse_area" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "floorPlanId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "warehouse_area_floorPlanId_fkey" FOREIGN KEY ("floorPlanId") REFERENCES "warehouse_floor_plan" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "warehouse_rack" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "areaId" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "warehouse_rack_areaId_fkey" FOREIGN KEY ("areaId") REFERENCES "warehouse_area" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "warehouse_shelf" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "rackId" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "warehouse_shelf_rackId_fkey" FOREIGN KEY ("rackId") REFERENCES "warehouse_rack" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "warehouse_bin" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shelfId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "warehouse_bin_shelfId_fkey" FOREIGN KEY ("shelfId") REFERENCES "warehouse_shelf" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "product_location" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT,
    "productVariantId" TEXT,
    "binId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "product_location_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "product_location_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "product_variant" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "product_location_binId_fkey" FOREIGN KEY ("binId") REFERENCES "warehouse_bin" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderNumber" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "addressId" TEXT NOT NULL,
    "timeSlotId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "subtotal" REAL NOT NULL,
    "deliveryFee" REAL NOT NULL,
    "taxes" REAL NOT NULL,
    "total" REAL NOT NULL,
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentMethod" TEXT,
    "pickupHelperId" TEXT,
    "deliveryDriverId" TEXT,
    "notes" TEXT,
    "pickedAt" DATETIME,
    "deliveredAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "order_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouse" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "order_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "address" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "order_timeSlotId_fkey" FOREIGN KEY ("timeSlotId") REFERENCES "time_slot" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "order_pickupHelperId_fkey" FOREIGN KEY ("pickupHelperId") REFERENCES "UserProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "order_deliveryDriverId_fkey" FOREIGN KEY ("deliveryDriverId") REFERENCES "UserProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "order_item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productVariantId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" REAL NOT NULL,
    "totalPrice" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME,
    CONSTRAINT "order_item_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "order_item_productId_fkey" FOREIGN KEY ("productId") REFERENCES "product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "order_item_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "product_variant" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "delivery_zone" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "radius" REAL NOT NULL DEFAULT 5.0,
    "deliveryFee" REAL NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "delivery_zone_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "warehouse" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "time_slot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "zoneId" TEXT NOT NULL,
    "date" DATETIME NOT NULL,
    "startTime" TEXT NOT NULL,
    "endTime" TEXT NOT NULL,
    "maxOrders" INTEGER NOT NULL DEFAULT 10,
    "currentOrders" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "time_slot_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "delivery_zone" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "delivery_tracking" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" TEXT NOT NULL,
    "driverId" TEXT NOT NULL,
    "latitude" REAL NOT NULL,
    "longitude" REAL NOT NULL,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME,
    CONSTRAINT "delivery_tracking_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "delivery_tracking_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "UserProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "earning" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "isPayoutProcessed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME,
    CONSTRAINT "earning_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "earning_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "payout" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "totalAmount" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "bankReference" TEXT,
    "processedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME
);

-- CreateTable
CREATE TABLE "payout_item" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "payoutId" TEXT NOT NULL,
    "earningId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" DATETIME,
    CONSTRAINT "payout_item_payoutId_fkey" FOREIGN KEY ("payoutId") REFERENCES "payout" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "payout_item_earningId_fkey" FOREIGN KEY ("earningId") REFERENCES "earning" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "payment_method" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "deletedAt" DATETIME,
    CONSTRAINT "payment_method_userId_fkey" FOREIGN KEY ("userId") REFERENCES "UserProfile" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "user_phoneNumber_key" ON "user"("phoneNumber");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");

-- CreateIndex
CREATE INDEX "UserProfile_role_idx" ON "UserProfile"("role");

-- CreateIndex
CREATE INDEX "UserProfile_onboardingStep_idx" ON "UserProfile"("onboardingStep");

-- CreateIndex
CREATE INDEX "UserProfile_verificationStatus_idx" ON "UserProfile"("verificationStatus");

-- CreateIndex
CREATE INDEX "UserProfile_deletedAt_idx" ON "UserProfile"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "UserProfile_gstNumber_key" ON "UserProfile"("gstNumber");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "address_userId_idx" ON "address"("userId");

-- CreateIndex
CREATE INDEX "address_pincode_idx" ON "address"("pincode");

-- CreateIndex
CREATE INDEX "address_deletedAt_idx" ON "address"("deletedAt");

-- CreateIndex
CREATE INDEX "shipping_location_sellerId_idx" ON "shipping_location"("sellerId");

-- CreateIndex
CREATE INDEX "shipping_location_pincode_idx" ON "shipping_location"("pincode");

-- CreateIndex
CREATE INDEX "shipping_location_gstNumber_idx" ON "shipping_location"("gstNumber");

-- CreateIndex
CREATE INDEX "shipping_location_deletedAt_idx" ON "shipping_location"("deletedAt");

-- CreateIndex
CREATE INDEX "category_parentId_idx" ON "category"("parentId");

-- CreateIndex
CREATE INDEX "category_isActive_idx" ON "category"("isActive");

-- CreateIndex
CREATE INDEX "category_deletedAt_idx" ON "category"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "product_sku_key" ON "product"("sku");

-- CreateIndex
CREATE INDEX "product_categoryId_idx" ON "product"("categoryId");

-- CreateIndex
CREATE INDEX "product_sellerId_idx" ON "product"("sellerId");

-- CreateIndex
CREATE INDEX "product_sku_idx" ON "product"("sku");

-- CreateIndex
CREATE INDEX "product_isActive_idx" ON "product"("isActive");

-- CreateIndex
CREATE INDEX "product_deletedAt_idx" ON "product"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "product_variant_sku_key" ON "product_variant"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "product_variant_barcode_key" ON "product_variant"("barcode");

-- CreateIndex
CREATE INDEX "product_variant_productId_idx" ON "product_variant"("productId");

-- CreateIndex
CREATE INDEX "product_variant_sku_idx" ON "product_variant"("sku");

-- CreateIndex
CREATE INDEX "product_variant_barcode_idx" ON "product_variant"("barcode");

-- CreateIndex
CREATE INDEX "product_variant_isActive_idx" ON "product_variant"("isActive");

-- CreateIndex
CREATE INDEX "product_variant_deletedAt_idx" ON "product_variant"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "warehouse_code_key" ON "warehouse"("code");

-- CreateIndex
CREATE INDEX "warehouse_sellerId_idx" ON "warehouse"("sellerId");

-- CreateIndex
CREATE INDEX "warehouse_shippingLocationId_idx" ON "warehouse"("shippingLocationId");

-- CreateIndex
CREATE INDEX "warehouse_code_idx" ON "warehouse"("code");

-- CreateIndex
CREATE INDEX "warehouse_pincode_idx" ON "warehouse"("pincode");

-- CreateIndex
CREATE INDEX "warehouse_isActive_idx" ON "warehouse"("isActive");

-- CreateIndex
CREATE INDEX "warehouse_deletedAt_idx" ON "warehouse"("deletedAt");

-- CreateIndex
CREATE INDEX "warehouse_floor_plan_warehouseId_idx" ON "warehouse_floor_plan"("warehouseId");

-- CreateIndex
CREATE INDEX "warehouse_floor_plan_floor_idx" ON "warehouse_floor_plan"("floor");

-- CreateIndex
CREATE INDEX "warehouse_floor_plan_deletedAt_idx" ON "warehouse_floor_plan"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "warehouse_floor_plan_warehouseId_floor_key" ON "warehouse_floor_plan"("warehouseId", "floor");

-- CreateIndex
CREATE INDEX "warehouse_area_floorPlanId_idx" ON "warehouse_area"("floorPlanId");

-- CreateIndex
CREATE UNIQUE INDEX "warehouse_area_floorPlanId_code_key" ON "warehouse_area"("floorPlanId", "code");

-- CreateIndex
CREATE INDEX "warehouse_rack_areaId_idx" ON "warehouse_rack"("areaId");

-- CreateIndex
CREATE UNIQUE INDEX "warehouse_rack_areaId_number_key" ON "warehouse_rack"("areaId", "number");

-- CreateIndex
CREATE INDEX "warehouse_shelf_rackId_idx" ON "warehouse_shelf"("rackId");

-- CreateIndex
CREATE UNIQUE INDEX "warehouse_shelf_rackId_level_key" ON "warehouse_shelf"("rackId", "level");

-- CreateIndex
CREATE INDEX "warehouse_bin_shelfId_idx" ON "warehouse_bin"("shelfId");

-- CreateIndex
CREATE UNIQUE INDEX "warehouse_bin_shelfId_code_key" ON "warehouse_bin"("shelfId", "code");

-- CreateIndex
CREATE INDEX "product_location_binId_idx" ON "product_location"("binId");

-- CreateIndex
CREATE INDEX "product_location_productId_idx" ON "product_location"("productId");

-- CreateIndex
CREATE INDEX "product_location_productVariantId_idx" ON "product_location"("productVariantId");

-- CreateIndex
CREATE UNIQUE INDEX "product_location_productId_binId_key" ON "product_location"("productId", "binId");

-- CreateIndex
CREATE UNIQUE INDEX "product_location_productVariantId_binId_key" ON "product_location"("productVariantId", "binId");

-- CreateIndex
CREATE UNIQUE INDEX "order_orderNumber_key" ON "order"("orderNumber");

-- CreateIndex
CREATE INDEX "order_userId_idx" ON "order"("userId");

-- CreateIndex
CREATE INDEX "order_warehouseId_idx" ON "order"("warehouseId");

-- CreateIndex
CREATE INDEX "order_status_idx" ON "order"("status");

-- CreateIndex
CREATE INDEX "order_orderNumber_idx" ON "order"("orderNumber");

-- CreateIndex
CREATE INDEX "order_createdAt_idx" ON "order"("createdAt");

-- CreateIndex
CREATE INDEX "order_deletedAt_idx" ON "order"("deletedAt");

-- CreateIndex
CREATE INDEX "order_item_orderId_idx" ON "order_item"("orderId");

-- CreateIndex
CREATE INDEX "order_item_productId_idx" ON "order_item"("productId");

-- CreateIndex
CREATE INDEX "order_item_deletedAt_idx" ON "order_item"("deletedAt");

-- CreateIndex
CREATE INDEX "delivery_zone_warehouseId_idx" ON "delivery_zone"("warehouseId");

-- CreateIndex
CREATE INDEX "delivery_zone_pincode_idx" ON "delivery_zone"("pincode");

-- CreateIndex
CREATE INDEX "delivery_zone_isActive_idx" ON "delivery_zone"("isActive");

-- CreateIndex
CREATE INDEX "delivery_zone_deletedAt_idx" ON "delivery_zone"("deletedAt");

-- CreateIndex
CREATE INDEX "time_slot_zoneId_idx" ON "time_slot"("zoneId");

-- CreateIndex
CREATE INDEX "time_slot_date_idx" ON "time_slot"("date");

-- CreateIndex
CREATE INDEX "time_slot_isActive_idx" ON "time_slot"("isActive");

-- CreateIndex
CREATE INDEX "time_slot_deletedAt_idx" ON "time_slot"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "time_slot_zoneId_date_startTime_key" ON "time_slot"("zoneId", "date", "startTime");

-- CreateIndex
CREATE INDEX "delivery_tracking_orderId_idx" ON "delivery_tracking"("orderId");

-- CreateIndex
CREATE INDEX "delivery_tracking_driverId_idx" ON "delivery_tracking"("driverId");

-- CreateIndex
CREATE INDEX "delivery_tracking_timestamp_idx" ON "delivery_tracking"("timestamp");

-- CreateIndex
CREATE INDEX "delivery_tracking_deletedAt_idx" ON "delivery_tracking"("deletedAt");

-- CreateIndex
CREATE INDEX "earning_userId_idx" ON "earning"("userId");

-- CreateIndex
CREATE INDEX "earning_orderId_idx" ON "earning"("orderId");

-- CreateIndex
CREATE INDEX "earning_type_idx" ON "earning"("type");

-- CreateIndex
CREATE INDEX "earning_isPayoutProcessed_idx" ON "earning"("isPayoutProcessed");

-- CreateIndex
CREATE INDEX "earning_deletedAt_idx" ON "earning"("deletedAt");

-- CreateIndex
CREATE INDEX "payout_userId_idx" ON "payout"("userId");

-- CreateIndex
CREATE INDEX "payout_status_idx" ON "payout"("status");

-- CreateIndex
CREATE INDEX "payout_createdAt_idx" ON "payout"("createdAt");

-- CreateIndex
CREATE INDEX "payout_deletedAt_idx" ON "payout"("deletedAt");

-- CreateIndex
CREATE INDEX "payout_item_payoutId_idx" ON "payout_item"("payoutId");

-- CreateIndex
CREATE INDEX "payout_item_earningId_idx" ON "payout_item"("earningId");

-- CreateIndex
CREATE INDEX "payout_item_deletedAt_idx" ON "payout_item"("deletedAt");

-- CreateIndex
CREATE INDEX "payment_method_userId_idx" ON "payment_method"("userId");

-- CreateIndex
CREATE INDEX "payment_method_type_idx" ON "payment_method"("type");

-- CreateIndex
CREATE INDEX "payment_method_isActive_idx" ON "payment_method"("isActive");

-- CreateIndex
CREATE INDEX "payment_method_deletedAt_idx" ON "payment_method"("deletedAt");
