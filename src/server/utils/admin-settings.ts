import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Cache for admin settings to avoid frequent DB queries
let settingsCache: {
  data: Awaited<ReturnType<typeof fetchSettings>> | null;
  timestamp: number;
} = {
  data: null,
  timestamp: 0,
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Fetch admin settings from database
 */
async function fetchSettings() {
  let settings = await prisma.adminSettings.findUnique({
    where: { id: "global" },
  });

  // If no settings exist, create default settings
  if (!settings) {
    settings = await prisma.adminSettings.create({
      data: { id: "global" },
    });
  }

  return settings;
}

/**
 * Get admin settings with caching
 */
export async function getAdminSettings() {
  const now = Date.now();

  // Return cached settings if still valid
  if (settingsCache.data && (now - settingsCache.timestamp) < CACHE_DURATION) {
    return settingsCache.data;
  }

  // Fetch fresh settings
  const settings = await fetchSettings();

  // Update cache
  settingsCache.data = settings;
  settingsCache.timestamp = now;

  return settings;
}

/**
 * Clear the settings cache
 * Call this after updating settings to force a refresh
 */
export function clearSettingsCache() {
  settingsCache.data = null;
  settingsCache.timestamp = 0;
}

/**
 * Calculate delivery fee based on order amount and delivery type
 * @param orderAmount - Total order amount
 * @param isExpress - Whether express delivery is requested
 * @returns Delivery fee amount (0 if free delivery threshold is met)
 */
export async function calculateDeliveryFee(orderAmount: number, isExpress: boolean = false): Promise<number> {
  const settings = await getAdminSettings();

  // Check if order qualifies for free delivery
  if (orderAmount >= settings.freeDeliveryThreshold) {
    return 0;
  }

  // Return appropriate delivery fee
  return isExpress ? settings.expressDeliveryFee : settings.standardDeliveryFee;
}

/**
 * Validate if order amount meets minimum requirement
 * @param orderAmount - Total order amount
 * @returns Object with validation result and required amount
 */
export async function validateMinimumOrder(orderAmount: number): Promise<{
  isValid: boolean;
  minimumOrderAmount: number;
  amountNeeded: number;
}> {
  const settings = await getAdminSettings();

  const isValid = orderAmount >= settings.minimumOrderAmount;
  const amountNeeded = Math.max(0, settings.minimumOrderAmount - orderAmount);

  return {
    isValid,
    minimumOrderAmount: settings.minimumOrderAmount,
    amountNeeded,
  };
}

/**
 * Check if sellers should be auto-approved
 * @returns Whether auto-approval is enabled
 */
export async function shouldAutoApproveSeller(): Promise<boolean> {
  const settings = await getAdminSettings();
  return settings.autoApproveSellers;
}

/**
 * Check if products should be auto-approved
 * @returns Whether auto-approval is enabled
 */
export async function shouldAutoApproveProduct(): Promise<boolean> {
  const settings = await getAdminSettings();
  return settings.autoApproveProducts;
}
