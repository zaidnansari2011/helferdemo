import { protectedProcedure, router } from "../../trpc";
import { Prisma, VerificationStatus, UserRole } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import prisma from "../../db";

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

// Schema for verification status
const sellerStatusSchema = z.enum(["PENDING", "IN_PROGRESS", "VERIFIED", "REJECTED"]);

export const driversRouter = router({
  // Get driver dashboard statistics
  getDriverStats: adminProcedure.query(async () => {
    const [
      totalDrivers,
      verifiedDrivers,
      pendingDrivers,
      onlineDrivers,
      totalHelpers,
      verifiedHelpers,
      pendingHelpers,
      onlineHelpers,
    ] = await Promise.all([
      // Total drivers
      prisma.userProfile.count({
        where: { role: "DELIVERY_DRIVER", deletedAt: null },
      }),
      // Verified drivers
      prisma.userProfile.count({
        where: { role: "DELIVERY_DRIVER", verificationStatus: "VERIFIED", deletedAt: null },
      }),
      // Pending drivers
      prisma.userProfile.count({
        where: { role: "DELIVERY_DRIVER", verificationStatus: "PENDING", deletedAt: null },
      }),
      // Online drivers
      prisma.userProfile.count({
        where: { role: "DELIVERY_DRIVER", verificationStatus: "VERIFIED", isOnline: true, deletedAt: null },
      }),
      // Total helpers
      prisma.userProfile.count({
        where: { role: "PICKUP_HELPER", deletedAt: null },
      }),
      // Verified helpers
      prisma.userProfile.count({
        where: { role: "PICKUP_HELPER", verificationStatus: "VERIFIED", deletedAt: null },
      }),
      // Pending helpers
      prisma.userProfile.count({
        where: { role: "PICKUP_HELPER", verificationStatus: "PENDING", deletedAt: null },
      }),
      // Online helpers
      prisma.userProfile.count({
        where: { role: "PICKUP_HELPER", verificationStatus: "VERIFIED", isOnline: true, deletedAt: null },
      }),
    ]);

    return {
      drivers: {
        total: totalDrivers,
        verified: verifiedDrivers,
        pending: pendingDrivers,
        online: onlineDrivers,
      },
      helpers: {
        total: totalHelpers,
        verified: verifiedHelpers,
        pending: pendingHelpers,
        online: onlineHelpers,
      },
      lastFetch: Date.now(),
    };
  }),

  // Get all delivery partners (drivers & helpers)
  getAllDeliveryPartners: adminProcedure
    .input(
      z.object({
        role: z.enum(["DELIVERY_DRIVER", "PICKUP_HELPER", "ALL"]).default("ALL"),
        status: z.enum(["PENDING", "IN_PROGRESS", "VERIFIED", "REJECTED", "ALL"]).default("ALL"),
        backgroundCheck: z.enum(["PENDING", "APPROVED", "REJECTED", "ALL"]).default("ALL"),
        onlineStatus: z.enum(["ONLINE", "OFFLINE", "ALL"]).default("ALL"),
        search: z.string().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ input }) => {
      const { role, status, backgroundCheck, onlineStatus, search, page, limit } = input;
      const skip = (page - 1) * limit;

      // Build role filter
      const roleFilter: Prisma.UserProfileWhereInput = 
        role === "ALL" 
          ? { role: { in: ["DELIVERY_DRIVER", "PICKUP_HELPER"] } }
          : { role: role as UserRole };

      // Build where clause
      const where: Prisma.UserProfileWhereInput = {
        ...roleFilter,
        deletedAt: null,
        ...(status !== "ALL" && { verificationStatus: status as VerificationStatus }),
        ...(backgroundCheck !== "ALL" && { backgroundCheckStatus: backgroundCheck }),
        ...(onlineStatus !== "ALL" && { isOnline: onlineStatus === "ONLINE" }),
        ...(search && {
          OR: [
            { user: { name: { contains: search } } },
            { user: { email: { contains: search } } },
            { user: { phoneNumber: { contains: search } } },
            { vehicleNumber: { contains: search } },
            { aadhaarNumber: { contains: search } },
          ],
        }),
      };

      const [partners, total] = await Promise.all([
        prisma.userProfile.findMany({
          where,
          skip,
          take: limit,
          orderBy: { user: { createdAt: "desc" } },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phoneNumber: true,
                createdAt: true,
                image: true,
              },
            },
            _count: {
              select: {
                driverOrders: true,
                helperOrders: true,
              },
            },
          },
        }),
        prisma.userProfile.count({ where }),
      ]);

      return {
        partners: partners.map((partner) => ({
          id: partner.id,
          userId: partner.userId,
          name: partner.user.name,
          email: partner.user.email,
          phone: partner.user.phoneNumber,
          image: partner.user.image || partner.profilePhoto,
          role: partner.role,
          verificationStatus: partner.verificationStatus,
          backgroundCheckStatus: partner.backgroundCheckStatus,
          isOnline: partner.isOnline,
          vehicleType: partner.vehicleType,
          vehicleNumber: partner.vehicleNumber,
          totalDeliveries: partner._count.driverOrders,
          totalPickups: partner._count.helperOrders,
          createdAt: partner.user.createdAt,
          lastOnlineAt: partner.lastOnlineAt,
        })),
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
      };
    }),

  // Get delivery partner details
  getDeliveryPartnerDetails: adminProcedure
    .input(z.object({ partnerId: z.string() }))
    .query(async ({ input }) => {
      const partner = await prisma.userProfile.findUnique({
        where: { id: input.partnerId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phoneNumber: true,
              createdAt: true,
              image: true,
            },
          },
          earnings: {
            orderBy: { createdAt: "desc" },
            take: 10,
          },
          _count: {
            select: {
              driverOrders: true,
              helperOrders: true,
              earnings: true,
            },
          },
        },
      });

      if (!partner || (partner.role !== "DELIVERY_DRIVER" && partner.role !== "PICKUP_HELPER")) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Delivery partner not found",
        });
      }

      // Calculate total earnings
      const totalEarnings = await prisma.earning.aggregate({
        where: { userId: partner.id },
        _sum: { amount: true },
      });

      return {
        id: partner.id,
        userId: partner.userId,
        name: partner.user.name,
        email: partner.user.email,
        phone: partner.user.phoneNumber,
        image: partner.user.image || partner.profilePhoto,
        role: partner.role,
        verificationStatus: partner.verificationStatus,
        backgroundCheckStatus: partner.backgroundCheckStatus,
        backgroundCheckNotes: partner.backgroundCheckNotes,
        isOnline: partner.isOnline,
        lastOnlineAt: partner.lastOnlineAt,
        createdAt: partner.user.createdAt,
        
        // Personal info
        dateOfBirth: partner.dateOfBirth,
        gender: partner.gender,
        currentAddress: partner.currentAddress ? JSON.parse(partner.currentAddress) : null,
        permanentAddress: partner.permanentAddress ? JSON.parse(partner.permanentAddress) : null,
        
        // Emergency contact
        emergencyContact: {
          name: partner.emergencyContactName,
          phone: partner.emergencyContactPhone,
          relation: partner.emergencyContactRelation,
        },
        
        // Documents
        documents: {
          aadhaarNumber: partner.aadhaarNumber,
          aadhaarFrontUrl: partner.aadhaarFrontUrl,
          aadhaarBackUrl: partner.aadhaarBackUrl,
          panNumber: partner.panNumber,
          panCardUrl: partner.panCardUrl,
          drivingLicenseNumber: partner.drivingLicenseNumber,
          drivingLicenseUrl: partner.drivingLicenseUrl,
        },
        
        // Vehicle details (for drivers)
        vehicle: partner.role === "DELIVERY_DRIVER" ? {
          type: partner.vehicleType,
          number: partner.vehicleNumber,
          model: partner.vehicleModel,
          rcUrl: partner.vehicleRcUrl,
          insuranceUrl: partner.vehicleInsuranceUrl,
          insuranceExpiry: partner.vehicleInsuranceExpiry,
        } : null,
        
        // Work preferences
        workPreferences: {
          preferredHours: partner.preferredWorkingHours,
          preferredZones: partner.preferredDeliveryZones ? JSON.parse(partner.preferredDeliveryZones) : [],
          autoAcceptOrders: partner.autoAcceptOrders,
        },
        
        // Stats
        stats: {
          totalDeliveries: partner._count.driverOrders,
          totalPickups: partner._count.helperOrders,
          totalEarnings: totalEarnings._sum?.amount ?? 0,
          recentEarnings: partner.earnings,
        },
      };
    }),

  // Update delivery partner status
  updateDeliveryPartnerStatus: adminProcedure
    .input(
      z.object({
        partnerId: z.string(),
        verificationStatus: sellerStatusSchema,
        backgroundCheckStatus: z.enum(["PENDING", "APPROVED", "REJECTED"]).optional(),
        backgroundCheckNotes: z.string().optional(),
        rejectionReason: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const partner = await prisma.userProfile.findUnique({
        where: { id: input.partnerId },
      });

      if (!partner || (partner.role !== "DELIVERY_DRIVER" && partner.role !== "PICKUP_HELPER")) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Delivery partner not found",
        });
      }

      const updateData: Prisma.UserProfileUpdateInput = {
        verificationStatus: input.verificationStatus,
        ...(input.backgroundCheckStatus && { backgroundCheckStatus: input.backgroundCheckStatus }),
        ...(input.backgroundCheckNotes && { backgroundCheckNotes: input.backgroundCheckNotes }),
      };

      if (input.verificationStatus === "VERIFIED") {
        updateData.approvedAt = new Date();
        updateData.rejectedAt = null;
        updateData.rejectionReason = null;
      } else if (input.verificationStatus === "REJECTED") {
        updateData.rejectedAt = new Date();
        updateData.rejectionReason = input.rejectionReason || null;
      }

      await prisma.userProfile.update({
        where: { id: input.partnerId },
        data: updateData,
      });

      return { success: true };
    }),

  // Get pending delivery partner count
  getPendingDeliveryPartnerCount: adminProcedure.query(async () => {
    const count = await prisma.userProfile.count({
      where: {
        role: { in: ["DELIVERY_DRIVER", "PICKUP_HELPER"] },
        verificationStatus: "PENDING",
        deletedAt: null,
      },
    });

    return { count };
  }),
});
