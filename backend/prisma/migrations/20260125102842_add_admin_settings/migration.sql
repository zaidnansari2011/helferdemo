-- CreateTable
CREATE TABLE "admin_settings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'global',
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "maintenanceMessage" TEXT NOT NULL DEFAULT 'We''re currently performing maintenance. Please check back soon.',
    "autoApproveProducts" BOOLEAN NOT NULL DEFAULT false,
    "autoApproveSellers" BOOLEAN NOT NULL DEFAULT false,
    "emailNotifications" BOOLEAN NOT NULL DEFAULT true,
    "pushNotifications" BOOLEAN NOT NULL DEFAULT true,
    "weeklyReports" BOOLEAN NOT NULL DEFAULT true,
    "deliveryRadius" INTEGER NOT NULL DEFAULT 10,
    "minimumOrderAmount" REAL NOT NULL DEFAULT 99,
    "expressDeliveryFee" REAL NOT NULL DEFAULT 29,
    "standardDeliveryFee" REAL NOT NULL DEFAULT 0,
    "freeDeliveryThreshold" REAL NOT NULL DEFAULT 199,
    "require2FA" BOOLEAN NOT NULL DEFAULT false,
    "sessionTimeoutMins" INTEGER NOT NULL DEFAULT 60,
    "ipWhitelisting" BOOLEAN NOT NULL DEFAULT false,
    "whitelistedIPs" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "updatedBy" TEXT
);
