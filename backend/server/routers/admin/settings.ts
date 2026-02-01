import { router, protectedProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import prisma from "../../db";
import { clearSettingsCache } from "../../utils/admin-settings";

// Admin-protected procedure (checks for ADMIN role)
const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const userProfile = await prisma.userProfile.findUnique({
    where: { userId: ctx.session.userId },
  });

  if (!userProfile || userProfile.role !== "ADMIN") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Admin access required.",
    });
  }

  return next({
    ctx: {
      ...ctx,
      adminProfile: userProfile,
    },
  });
});

// Validation schemas
const updateSettingsSchema = z.object({
  // System Settings
  maintenanceMode: z.boolean().optional(),
  maintenanceMessage: z.string().min(1).max(500).optional(),
  
  // Approval Settings
  autoApproveProducts: z.boolean().optional(),
  autoApproveSellers: z.boolean().optional(),
  
  // Notification Settings
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  weeklyReports: z.boolean().optional(),
  
  // Delivery Settings
  deliveryRadius: z.number().min(1).max(100).optional(),
  minimumOrderAmount: z.number().min(0).optional(),
  expressDeliveryFee: z.number().min(0).optional(),
  standardDeliveryFee: z.number().min(0).optional(),
  freeDeliveryThreshold: z.number().min(0).optional(),
  
  // Security Settings
  require2FA: z.boolean().optional(),
  sessionTimeoutMins: z.number().min(5).max(1440).optional(), // 5 mins to 24 hours
  ipWhitelisting: z.boolean().optional(),
  whitelistedIPs: z.array(z.string()).optional(),
});

export const settingsRouter = router({
  /**
   * Get current admin settings
   * Returns all platform configuration settings
   */
  getSettings: adminProcedure.query(async () => {
    // Get or create settings (using upsert pattern for single-row table)
    let settings = await prisma.adminSettings.findUnique({
      where: { id: "global" },
    });

    // If no settings exist, create default settings
    if (!settings) {
      settings = await prisma.adminSettings.create({
        data: { id: "global" },
      });
    }

    // Parse whitelistedIPs from JSON string
    const whitelistedIPs = settings.whitelistedIPs 
      ? JSON.parse(settings.whitelistedIPs) as string[]
      : [];

    return {
      // System Settings
      maintenanceMode: settings.maintenanceMode,
      maintenanceMessage: settings.maintenanceMessage,
      
      // Approval Settings
      autoApproveProducts: settings.autoApproveProducts,
      autoApproveSellers: settings.autoApproveSellers,
      
      // Notification Settings
      emailNotifications: settings.emailNotifications,
      pushNotifications: settings.pushNotifications,
      weeklyReports: settings.weeklyReports,
      
      // Delivery Settings
      deliveryRadius: settings.deliveryRadius,
      minimumOrderAmount: settings.minimumOrderAmount,
      expressDeliveryFee: settings.expressDeliveryFee,
      standardDeliveryFee: settings.standardDeliveryFee,
      freeDeliveryThreshold: settings.freeDeliveryThreshold,
      
      // Security Settings
      require2FA: settings.require2FA,
      sessionTimeoutMins: settings.sessionTimeoutMins,
      ipWhitelisting: settings.ipWhitelisting,
      whitelistedIPs,
      
      // Metadata
      updatedAt: settings.updatedAt,
      updatedBy: settings.updatedBy,
    };
  }),

  /**
   * Update admin settings
   * Allows partial updates - only provided fields will be changed
   */
  updateSettings: adminProcedure
    .input(updateSettingsSchema)
    .mutation(async ({ ctx, input }) => {
      // Prepare update data
      const updateData: Record<string, unknown> = {
        updatedBy: ctx.session.userId,
      };

      // Only add provided fields to update
      if (input.maintenanceMode !== undefined) {
        updateData.maintenanceMode = input.maintenanceMode;
      }
      if (input.maintenanceMessage !== undefined) {
        updateData.maintenanceMessage = input.maintenanceMessage;
      }
      if (input.autoApproveProducts !== undefined) {
        updateData.autoApproveProducts = input.autoApproveProducts;
      }
      if (input.autoApproveSellers !== undefined) {
        updateData.autoApproveSellers = input.autoApproveSellers;
      }
      if (input.emailNotifications !== undefined) {
        updateData.emailNotifications = input.emailNotifications;
      }
      if (input.pushNotifications !== undefined) {
        updateData.pushNotifications = input.pushNotifications;
      }
      if (input.weeklyReports !== undefined) {
        updateData.weeklyReports = input.weeklyReports;
      }
      if (input.deliveryRadius !== undefined) {
        updateData.deliveryRadius = input.deliveryRadius;
      }
      if (input.minimumOrderAmount !== undefined) {
        updateData.minimumOrderAmount = input.minimumOrderAmount;
      }
      if (input.expressDeliveryFee !== undefined) {
        updateData.expressDeliveryFee = input.expressDeliveryFee;
      }
      if (input.standardDeliveryFee !== undefined) {
        updateData.standardDeliveryFee = input.standardDeliveryFee;
      }
      if (input.freeDeliveryThreshold !== undefined) {
        updateData.freeDeliveryThreshold = input.freeDeliveryThreshold;
      }
      if (input.require2FA !== undefined) {
        updateData.require2FA = input.require2FA;
      }
      if (input.sessionTimeoutMins !== undefined) {
        updateData.sessionTimeoutMins = input.sessionTimeoutMins;
      }
      if (input.ipWhitelisting !== undefined) {
        updateData.ipWhitelisting = input.ipWhitelisting;
      }
      if (input.whitelistedIPs !== undefined) {
        updateData.whitelistedIPs = JSON.stringify(input.whitelistedIPs);
      }

      // Upsert to handle case where settings don't exist yet
      const settings = await prisma.adminSettings.upsert({
        where: { id: "global" },
        create: {
          id: "global",
          ...updateData,
        },
        update: updateData,
      });

      // Clear the settings cache so changes take effect immediately
      clearSettingsCache();

      // Parse whitelistedIPs for response
      const whitelistedIPs = settings.whitelistedIPs 
        ? JSON.parse(settings.whitelistedIPs) as string[]
        : [];

      return {
        success: true,
        settings: {
          maintenanceMode: settings.maintenanceMode,
          maintenanceMessage: settings.maintenanceMessage,
          autoApproveProducts: settings.autoApproveProducts,
          autoApproveSellers: settings.autoApproveSellers,
          emailNotifications: settings.emailNotifications,
          pushNotifications: settings.pushNotifications,
          weeklyReports: settings.weeklyReports,
          deliveryRadius: settings.deliveryRadius,
          minimumOrderAmount: settings.minimumOrderAmount,
          expressDeliveryFee: settings.expressDeliveryFee,
          standardDeliveryFee: settings.standardDeliveryFee,
          freeDeliveryThreshold: settings.freeDeliveryThreshold,
          require2FA: settings.require2FA,
          sessionTimeoutMins: settings.sessionTimeoutMins,
          ipWhitelisting: settings.ipWhitelisting,
          whitelistedIPs,
          updatedAt: settings.updatedAt,
          updatedBy: settings.updatedBy,
        },
      };
    }),

  /**
   * Toggle maintenance mode quickly
   * Convenience method for emergency maintenance
   */
  toggleMaintenanceMode: adminProcedure
    .input(z.object({
      enabled: z.boolean(),
      message: z.string().min(1).max(500).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const settings = await prisma.adminSettings.upsert({
        where: { id: "global" },
        create: {
          id: "global",
          maintenanceMode: input.enabled,
          maintenanceMessage: input.message || "We're currently performing maintenance. Please check back soon.",
          updatedBy: ctx.session.userId,
        },
        update: {
          maintenanceMode: input.enabled,
          ...(input.message && { maintenanceMessage: input.message }),
          updatedBy: ctx.session.userId,
        },
      });

      // Clear the settings cache so changes take effect immediately
      clearSettingsCache();

      return {
        success: true,
        maintenanceMode: settings.maintenanceMode,
        maintenanceMessage: settings.maintenanceMessage,
      };
    }),

  /**
   * Get maintenance status (public endpoint for checking if site is in maintenance)
   * This can be called without authentication
   */
  getMaintenanceStatus: protectedProcedure.query(async () => {
    const settings = await prisma.adminSettings.findUnique({
      where: { id: "global" },
      select: {
        maintenanceMode: true,
        maintenanceMessage: true,
      },
    });

    return {
      isInMaintenance: settings?.maintenanceMode ?? false,
      message: settings?.maintenanceMessage ?? "We're currently performing maintenance. Please check back soon.",
    };
  }),
});
