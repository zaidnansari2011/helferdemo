import { protectedProcedure, router } from "../../trpc";
import { PrismaClient, OrderStatus, UserRole } from "@prisma/client";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

const prisma = new PrismaClient();

// Helper to ensure user is a delivery partner (driver or helper)
async function ensureDeliveryPartner(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });

  if (!user || !user.profile) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "User profile not found.",
    });
  }

  if (
    user.profile.role !== UserRole.DELIVERY_DRIVER &&
    user.profile.role !== UserRole.PICKUP_HELPER
  ) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only delivery partners can access this resource.",
    });
  }

  return { user, profile: user.profile };
}

// Helper to get warehouse for a pickup helper
async function getHelperWarehouse(profileId: string) {
  // For now, we'll get the first warehouse. In production, this would be assigned.
  const warehouse = await prisma.warehouse.findFirst({
    where: { isActive: true, deletedAt: null },
  });

  if (!warehouse) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "No warehouse assigned.",
    });
  }

  return warehouse;
}

export const deliveryRouter = router({
  // ==================== PROFILE & STATUS ====================

  /**
   * Get delivery partner profile with stats
   */
  getProfile: protectedProcedure.query(async ({ ctx }) => {
    const { user, profile } = await ensureDeliveryPartner(ctx.session.userId);

    // Get today's stats
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayEarnings = await prisma.earning.aggregate({
      where: {
        userId: profile.id,
        createdAt: { gte: today },
        deletedAt: null,
      },
      _sum: { amount: true },
    });

    // Get completed orders count
    let completedOrdersToday = 0;
    if (profile.role === UserRole.PICKUP_HELPER) {
      completedOrdersToday = await prisma.order.count({
        where: {
          pickupHelperId: profile.id,
          pickedAt: { gte: today },
          deletedAt: null,
        },
      });
    } else {
      completedOrdersToday = await prisma.order.count({
        where: {
          deliveryDriverId: profile.id,
          deliveredAt: { gte: today },
          deletedAt: null,
        },
      });
    }

    // Get total earnings
    const totalEarnings = await prisma.earning.aggregate({
      where: {
        userId: profile.id,
        deletedAt: null,
      },
      _sum: { amount: true },
    });

    // Get pending payout amount
    const pendingPayout = await prisma.earning.aggregate({
      where: {
        userId: profile.id,
        isPayoutProcessed: false,
        deletedAt: null,
      },
      _sum: { amount: true },
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phoneNumber: user.phoneNumber,
      role: profile.role,
      profileId: profile.id,
      stats: {
        todayEarnings: todayEarnings._sum.amount || 0,
        todayOrders: completedOrdersToday,
        totalEarnings: totalEarnings._sum.amount || 0,
        pendingPayout: pendingPayout._sum.amount || 0,
      },
    };
  }),

  /**
   * Update delivery partner role (for role selection after signup)
   */
  updateRole: protectedProcedure
    .input(
      z.object({
        role: z.enum(["DELIVERY_DRIVER", "PICKUP_HELPER"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await prisma.user.findUnique({
        where: { id: ctx.session.userId },
        include: { profile: true },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found.",
        });
      }

      // Create profile if doesn't exist
      if (!user.profile) {
        const profile = await prisma.userProfile.create({
          data: {
            userId: user.id,
            role: input.role as UserRole,
            // Initialize onboarding for new partners
            partnerOnboardingStep: "PERSONAL_INFO",
            backgroundCheckStatus: "PENDING",
            isActive: false, // Will be activated after onboarding completion
          },
        });
        return { 
          success: true, 
          role: profile.role,
          onboardingRequired: true,
          currentStep: "PERSONAL_INFO",
        };
      }

      // Update existing profile role
      const updatedProfile = await prisma.userProfile.update({
        where: { id: user.profile.id },
        data: { role: input.role as UserRole },
      });

      // Check if onboarding is complete
      const onboardingComplete = updatedProfile.partnerOnboardingStep === "COMPLETED";

      return { 
        success: true, 
        role: updatedProfile.role,
        onboardingRequired: !onboardingComplete,
        currentStep: updatedProfile.partnerOnboardingStep || "PERSONAL_INFO",
      };
    }),

  // ==================== PICKUP HELPER ENDPOINTS ====================

  /**
   * Get orders pending pickup at the helper's warehouse
   */
  getPendingPickupOrders: protectedProcedure.query(async ({ ctx }) => {
    const { profile } = await ensureDeliveryPartner(ctx.session.userId);

    if (profile.role !== UserRole.PICKUP_HELPER) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only pickup helpers can access pending pickups.",
      });
    }

    const warehouse = await getHelperWarehouse(profile.id);

    // Get orders in CONFIRMED or PICKING status
    const orders = await prisma.order.findMany({
      where: {
        warehouseId: warehouse.id,
        status: { in: [OrderStatus.CONFIRMED, OrderStatus.PICKING] },
        deletedAt: null,
      },
      include: {
        items: {
          include: {
            product: true,
            productVariant: true,
          },
        },
        address: true,
        user: {
          select: {
            userId: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    return orders.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      itemCount: order.items.length,
      totalItems: order.items.reduce((acc, item) => acc + item.quantity, 0),
      total: order.total,
      createdAt: order.createdAt,
      items: order.items.map((item) => ({
        id: item.id,
        productName: item.product.name,
        variantName: item.productVariant.name,
        barcode: item.productVariant.barcode,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    }));
  }),

  /**
   * Start picking an order - assigns helper and changes status to PICKING
   */
  startPicking: protectedProcedure
    .input(z.object({ orderId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { profile } = await ensureDeliveryPartner(ctx.session.userId);

      if (profile.role !== UserRole.PICKUP_HELPER) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only pickup helpers can start picking.",
        });
      }

      const order = await prisma.order.findUnique({
        where: { id: input.orderId },
      });

      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Order not found.",
        });
      }

      if (order.status !== OrderStatus.CONFIRMED) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Order cannot be picked. Current status: ${order.status}`,
        });
      }

      const updatedOrder = await prisma.order.update({
        where: { id: input.orderId },
        data: {
          status: OrderStatus.PICKING,
          pickupHelperId: profile.id,
        },
      });

      return { success: true, order: updatedOrder };
    }),

  /**
   * Get order details with item locations for picking
   */
  getOrderForPicking: protectedProcedure
    .input(z.object({ orderId: z.string() }))
    .query(async ({ ctx, input }) => {
      const { profile } = await ensureDeliveryPartner(ctx.session.userId);

      if (profile.role !== UserRole.PICKUP_HELPER) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only pickup helpers can access picking details.",
        });
      }

      const order = await prisma.order.findUnique({
        where: { id: input.orderId },
        include: {
          items: {
            include: {
              product: true,
              productVariant: {
                include: {
                  productLocations: {
                    include: {
                      bin: {
                        include: {
                          shelf: {
                            include: {
                              rack: {
                                include: {
                                  area: {
                                    include: {
                                      floorPlan: {
                                        include: {
                                          warehouse: true,
                                        },
                                      },
                                    },
                                  },
                                },
                              },
                            },
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
          warehouse: true,
          address: true,
        },
      });

      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Order not found.",
        });
      }

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        warehouse: {
          id: order.warehouse.id,
          name: order.warehouse.name,
          code: order.warehouse.code,
        },
        items: order.items.map((item) => {
          // Get the first location for this variant
          const location = item.productVariant.productLocations[0];
          const locationString = location
            ? `${location.bin.shelf.rack.area.name} > Rack ${location.bin.shelf.rack.number} > Level ${location.bin.shelf.level} > ${location.bin.code}`
            : "Location not assigned";

          return {
            id: item.id,
            productId: item.productId,
            variantId: item.productVariantId,
            productName: item.product.name,
            variantName: item.productVariant.name,
            barcode: item.productVariant.barcode,
            sku: item.productVariant.sku,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            location: locationString,
            isPicked: false, // This would be tracked separately in a production system
          };
        }),
        deliveryAddress: {
          title: order.address.title,
          fullAddress: order.address.fullAddress,
          landmark: order.address.landmark,
          pincode: order.address.pincode,
        },
      };
    }),

  /**
   * Verify scanned barcode matches an order item
   */
  verifyBarcode: protectedProcedure
    .input(
      z.object({
        orderId: z.string(),
        barcode: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { profile } = await ensureDeliveryPartner(ctx.session.userId);

      if (profile.role !== UserRole.PICKUP_HELPER) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only pickup helpers can scan barcodes.",
        });
      }

      // Find the order item with this barcode
      const orderItem = await prisma.orderItem.findFirst({
        where: {
          orderId: input.orderId,
          productVariant: {
            barcode: input.barcode,
          },
        },
        include: {
          product: true,
          productVariant: true,
        },
      });

      if (!orderItem) {
        return {
          success: false,
          message: "This product is not in the order or barcode is incorrect.",
          item: null,
        };
      }

      return {
        success: true,
        message: "Product verified!",
        item: {
          id: orderItem.id,
          productName: orderItem.product.name,
          variantName: orderItem.productVariant.name,
          quantity: orderItem.quantity,
        },
      };
    }),

  /**
   * Complete picking - mark order as PICKED
   */
  completePicking: protectedProcedure
    .input(z.object({ orderId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { profile } = await ensureDeliveryPartner(ctx.session.userId);

      if (profile.role !== UserRole.PICKUP_HELPER) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only pickup helpers can complete picking.",
        });
      }

      const order = await prisma.order.findUnique({
        where: { id: input.orderId },
        include: { items: true },
      });

      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Order not found.",
        });
      }

      if (order.status !== OrderStatus.PICKING) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Order is not in picking status. Current status: ${order.status}`,
        });
      }

      if (order.pickupHelperId !== profile.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This order is assigned to another helper.",
        });
      }

      // Update order status
      const updatedOrder = await prisma.order.update({
        where: { id: input.orderId },
        data: {
          status: OrderStatus.PICKED,
          pickedAt: new Date(),
        },
      });

      // Create earning record for the pickup
      const PICKUP_EARNING_RATE = 15; // ₹15 per order picked
      await prisma.earning.create({
        data: {
          userId: profile.id,
          orderId: order.id,
          type: "PICKUP",
          amount: PICKUP_EARNING_RATE,
        },
      });

      return {
        success: true,
        message: "Order marked as picked!",
        order: updatedOrder,
        earning: PICKUP_EARNING_RATE,
      };
    }),

  // ==================== DELIVERY DRIVER ENDPOINTS ====================

  /**
   * Get orders ready for delivery (PICKED status or assigned to this driver)
   */
  getDeliveryOrders: protectedProcedure.query(async ({ ctx }) => {
    const { profile } = await ensureDeliveryPartner(ctx.session.userId);

    if (profile.role !== UserRole.DELIVERY_DRIVER) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Only delivery drivers can access deliveries.",
      });
    }

    // Get orders assigned to this driver OR ready for pickup (PICKED status)
    const orders = await prisma.order.findMany({
      where: {
        OR: [
          { deliveryDriverId: profile.id, status: OrderStatus.OUT_FOR_DELIVERY },
          { status: OrderStatus.PICKED, deliveryDriverId: null },
        ],
        deletedAt: null,
      },
      include: {
        items: {
          include: {
            product: true,
          },
        },
        address: true,
        warehouse: true,
        user: {
          select: {
            userId: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    // Get customer details
    const ordersWithCustomers = await Promise.all(
      orders.map(async (order) => {
        const customer = await prisma.user.findUnique({
          where: { id: order.user.userId },
          select: { name: true, phoneNumber: true },
        });

        return {
          id: order.id,
          orderNumber: order.orderNumber,
          status: order.status,
          isAssigned: order.deliveryDriverId === profile.id,
          itemCount: order.items.length,
          totalItems: order.items.reduce((acc, item) => acc + item.quantity, 0),
          total: order.total,
          createdAt: order.createdAt,
          warehouse: {
            name: order.warehouse.name,
            address: order.warehouse.address,
          },
          customer: {
            name: customer?.name || "Customer",
            phone: customer?.phoneNumber || "",
          },
          address: {
            title: order.address.title,
            fullAddress: order.address.fullAddress,
            landmark: order.address.landmark,
            pincode: order.address.pincode,
            latitude: order.address.latitude,
            longitude: order.address.longitude,
          },
        };
      })
    );

    return ordersWithCustomers;
  }),

  /**
   * Accept a delivery order
   */
  acceptDelivery: protectedProcedure
    .input(z.object({ orderId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { profile } = await ensureDeliveryPartner(ctx.session.userId);

      if (profile.role !== UserRole.DELIVERY_DRIVER) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only delivery drivers can accept deliveries.",
        });
      }

      const order = await prisma.order.findUnique({
        where: { id: input.orderId },
      });

      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Order not found.",
        });
      }

      if (order.status !== OrderStatus.PICKED) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Order is not ready for delivery. Current status: ${order.status}`,
        });
      }

      if (order.deliveryDriverId && order.deliveryDriverId !== profile.id) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Order is already assigned to another driver.",
        });
      }

      const updatedOrder = await prisma.order.update({
        where: { id: input.orderId },
        data: {
          status: OrderStatus.OUT_FOR_DELIVERY,
          deliveryDriverId: profile.id,
        },
      });

      return { success: true, order: updatedOrder };
    }),

  /**
   * Update driver location during delivery
   */
  updateLocation: protectedProcedure
    .input(
      z.object({
        orderId: z.string(),
        latitude: z.number(),
        longitude: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { profile } = await ensureDeliveryPartner(ctx.session.userId);

      if (profile.role !== UserRole.DELIVERY_DRIVER) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only delivery drivers can update location.",
        });
      }

      // Create tracking record
      await prisma.deliveryTracking.create({
        data: {
          orderId: input.orderId,
          driverId: profile.id,
          latitude: input.latitude,
          longitude: input.longitude,
        },
      });

      return { success: true };
    }),

  /**
   * Complete delivery
   */
  completeDelivery: protectedProcedure
    .input(
      z.object({
        orderId: z.string(),
        proofImageUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { profile } = await ensureDeliveryPartner(ctx.session.userId);

      if (profile.role !== UserRole.DELIVERY_DRIVER) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Only delivery drivers can complete deliveries.",
        });
      }

      const order = await prisma.order.findUnique({
        where: { id: input.orderId },
      });

      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Order not found.",
        });
      }

      if (order.status !== OrderStatus.OUT_FOR_DELIVERY) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Order is not out for delivery. Current status: ${order.status}`,
        });
      }

      if (order.deliveryDriverId !== profile.id) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "This order is assigned to another driver.",
        });
      }

      // Update order status
      const updatedOrder = await prisma.order.update({
        where: { id: input.orderId },
        data: {
          status: OrderStatus.DELIVERED,
          deliveredAt: new Date(),
          notes: input.proofImageUrl
            ? `Delivery proof: ${input.proofImageUrl}`
            : order.notes,
        },
      });

      // Create earning record for delivery
      const DELIVERY_EARNING_RATE = 25; // ₹25 per delivery
      await prisma.earning.create({
        data: {
          userId: profile.id,
          orderId: order.id,
          type: "DELIVERY",
          amount: DELIVERY_EARNING_RATE,
        },
      });

      return {
        success: true,
        message: "Delivery completed!",
        order: updatedOrder,
        earning: DELIVERY_EARNING_RATE,
      };
    }),

  // ==================== EARNINGS ENDPOINTS ====================

  /**
   * Get earnings history with filters
   */
  getEarnings: protectedProcedure
    .input(
      z
        .object({
          period: z.enum(["today", "week", "month", "all"]).optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const { profile } = await ensureDeliveryPartner(ctx.session.userId);

      let dateFilter: Date | undefined;
      const now = new Date();

      switch (input?.period) {
        case "today":
          dateFilter = new Date(now.setHours(0, 0, 0, 0));
          break;
        case "week":
          dateFilter = new Date(now.setDate(now.getDate() - 7));
          break;
        case "month":
          dateFilter = new Date(now.setMonth(now.getMonth() - 1));
          break;
        default:
          dateFilter = undefined;
      }

      const earnings = await prisma.earning.findMany({
        where: {
          userId: profile.id,
          deletedAt: null,
          ...(dateFilter && { createdAt: { gte: dateFilter } }),
        },
        include: {
          order: {
            select: {
              orderNumber: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      const totalAmount = earnings.reduce((acc, e) => acc + e.amount, 0);
      const pickupEarnings = earnings
        .filter((e) => e.type === "PICKUP")
        .reduce((acc, e) => acc + e.amount, 0);
      const deliveryEarnings = earnings
        .filter((e) => e.type === "DELIVERY")
        .reduce((acc, e) => acc + e.amount, 0);

      return {
        earnings: earnings.map((e) => ({
          id: e.id,
          orderNumber: e.order.orderNumber,
          type: e.type,
          amount: e.amount,
          isPayoutProcessed: e.isPayoutProcessed,
          createdAt: e.createdAt,
        })),
        summary: {
          total: totalAmount,
          pickupEarnings,
          deliveryEarnings,
          count: earnings.length,
        },
      };
    }),

  /**
   * Get payout history
   */
  getPayoutHistory: protectedProcedure.query(async ({ ctx }) => {
    const { profile } = await ensureDeliveryPartner(ctx.session.userId);

    const payouts = await prisma.payout.findMany({
      where: {
        userId: profile.id,
        deletedAt: null,
      },
      include: {
        items: {
          include: {
            earning: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return payouts.map((p) => ({
      id: p.id,
      totalAmount: p.totalAmount,
      status: p.status,
      bankReference: p.bankReference,
      processedAt: p.processedAt,
      createdAt: p.createdAt,
      itemCount: p.items.length,
    }));
  }),

  /**
   * Request payout for unpaid earnings
   */
  requestPayout: protectedProcedure.mutation(async ({ ctx }) => {
    const { profile } = await ensureDeliveryPartner(ctx.session.userId);

    // Get all unprocessed earnings
    const unpaidEarnings = await prisma.earning.findMany({
      where: {
        userId: profile.id,
        isPayoutProcessed: false,
        deletedAt: null,
      },
    });

    if (unpaidEarnings.length === 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "No unpaid earnings to process.",
      });
    }

    const totalAmount = unpaidEarnings.reduce((acc, e) => acc + e.amount, 0);

    // Minimum payout threshold
    const MIN_PAYOUT = 100;
    if (totalAmount < MIN_PAYOUT) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Minimum payout amount is ₹${MIN_PAYOUT}. Current balance: ₹${totalAmount}`,
      });
    }

    // Create payout request
    const payout = await prisma.payout.create({
      data: {
        userId: profile.id,
        totalAmount,
        status: "PENDING",
        items: {
          create: unpaidEarnings.map((e) => ({
            earningId: e.id,
            amount: e.amount,
          })),
        },
      },
    });

    // Mark earnings as payout processed
    await prisma.earning.updateMany({
      where: {
        id: { in: unpaidEarnings.map((e) => e.id) },
      },
      data: { isPayoutProcessed: true },
    });

    return {
      success: true,
      message: `Payout request of ₹${totalAmount} submitted successfully.`,
      payout: {
        id: payout.id,
        totalAmount: payout.totalAmount,
        status: payout.status,
      },
    };
  }),

  // ==================== STATS & DASHBOARD ====================

  /**
   * Get dashboard statistics
   */
  getDashboardStats: protectedProcedure.query(async ({ ctx }) => {
    const { profile } = await ensureDeliveryPartner(ctx.session.userId);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thisWeek = new Date();
    thisWeek.setDate(thisWeek.getDate() - 7);

    const thisMonth = new Date();
    thisMonth.setMonth(thisMonth.getMonth() - 1);

    // Today's earnings
    const todayEarnings = await prisma.earning.aggregate({
      where: {
        userId: profile.id,
        createdAt: { gte: today },
        deletedAt: null,
      },
      _sum: { amount: true },
      _count: true,
    });

    // This week's earnings
    const weekEarnings = await prisma.earning.aggregate({
      where: {
        userId: profile.id,
        createdAt: { gte: thisWeek },
        deletedAt: null,
      },
      _sum: { amount: true },
      _count: true,
    });

    // This month's earnings
    const monthEarnings = await prisma.earning.aggregate({
      where: {
        userId: profile.id,
        createdAt: { gte: thisMonth },
        deletedAt: null,
      },
      _sum: { amount: true },
      _count: true,
    });

    // Pending orders (for pickup helpers or delivery drivers)
    let pendingOrders = 0;
    if (profile.role === UserRole.PICKUP_HELPER) {
      pendingOrders = await prisma.order.count({
        where: {
          status: { in: [OrderStatus.CONFIRMED, OrderStatus.PICKING] },
          deletedAt: null,
        },
      });
    } else {
      pendingOrders = await prisma.order.count({
        where: {
          OR: [
            { status: OrderStatus.PICKED, deliveryDriverId: null },
            { deliveryDriverId: profile.id, status: OrderStatus.OUT_FOR_DELIVERY },
          ],
          deletedAt: null,
        },
      });
    }

    // Pending payout
    const pendingPayout = await prisma.earning.aggregate({
      where: {
        userId: profile.id,
        isPayoutProcessed: false,
        deletedAt: null,
      },
      _sum: { amount: true },
    });

    return {
      today: {
        earnings: todayEarnings._sum.amount || 0,
        orders: todayEarnings._count,
      },
      week: {
        earnings: weekEarnings._sum.amount || 0,
        orders: weekEarnings._count,
      },
      month: {
        earnings: monthEarnings._sum.amount || 0,
        orders: monthEarnings._count,
      },
      pendingOrders,
      pendingPayout: pendingPayout._sum.amount || 0,
      role: profile.role,
    };
  }),

  // ==================== ONBOARDING ====================

  /**
   * Get onboarding status and current step
   */
  getOnboardingStatus: protectedProcedure.query(async ({ ctx }) => {
    const user = await prisma.user.findUnique({
      where: { id: ctx.session.userId },
      include: { profile: true },
    });

    if (!user) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User not found.",
      });
    }

    // Create profile if it doesn't exist
    let profile = user.profile;
    if (!profile) {
      profile = await prisma.userProfile.create({
        data: {
          userId: user.id,
          role: "CUSTOMER", // Will be updated during onboarding
          partnerOnboardingStep: "PERSONAL_INFO",
        },
      });
    }

    return {
      currentStep: profile.partnerOnboardingStep || "PERSONAL_INFO",
      role: profile.role,
      isCompleted: profile.partnerOnboardingStep === "COMPLETED",
      backgroundCheckStatus: profile.backgroundCheckStatus || "PENDING",
      isActive: profile.isActive,
      completedAt: profile.partnerOnboardingCompletedAt,
      // Return existing data for pre-filling forms
      personalInfo: {
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        dateOfBirth: profile.dateOfBirth,
        gender: profile.gender,
        profilePhoto: profile.profilePhoto,
      },
      addressDetails: {
        currentAddress: profile.currentAddress ? JSON.parse(profile.currentAddress) : null,
        permanentAddress: profile.permanentAddress ? JSON.parse(profile.permanentAddress) : null,
      },
      emergencyContact: {
        name: profile.emergencyContactName,
        phone: profile.emergencyContactPhone,
        relation: profile.emergencyContactRelation,
      },
      identityDocs: {
        aadhaarNumber: profile.aadhaarNumber,
        aadhaarFrontUrl: profile.aadhaarFrontUrl,
        aadhaarBackUrl: profile.aadhaarBackUrl,
        panNumber: profile.panNumber,
        panCardUrl: profile.panCardUrl,
        drivingLicenseNumber: profile.drivingLicenseNumber,
        drivingLicenseUrl: profile.drivingLicenseUrl,
      },
      vehicleDetails: {
        vehicleType: profile.vehicleType,
        vehicleNumber: profile.vehicleNumber,
        vehicleModel: profile.vehicleModel,
        vehicleRcUrl: profile.vehicleRcUrl,
        vehicleInsuranceUrl: profile.vehicleInsuranceUrl,
        vehicleInsuranceExpiry: profile.vehicleInsuranceExpiry,
      },
      bankDetails: {
        accountNumber: profile.bankAccountNumber,
        ifscCode: profile.ifscCode,
        bankType: profile.bankType,
      },
      workPreference: {
        preferredWorkingHours: profile.preferredWorkingHours,
        preferredDeliveryZones: profile.preferredDeliveryZones 
          ? JSON.parse(profile.preferredDeliveryZones) 
          : null,
      },
    };
  }),

  /**
   * Save personal information (Step 1)
   */
  savePersonalInfo: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2, "Name must be at least 2 characters"),
        dateOfBirth: z.string().optional(),
        gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
        profilePhoto: z.string().optional(),
        role: z.enum(["DELIVERY_DRIVER", "PICKUP_HELPER"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await prisma.user.findUnique({
        where: { id: ctx.session.userId },
        include: { profile: true },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found.",
        });
      }

      // Update user name
      await prisma.user.update({
        where: { id: user.id },
        data: { name: input.name },
      });

      // Update or create profile
      const profileData = {
        role: input.role as UserRole,
        dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
        gender: input.gender,
        profilePhoto: input.profilePhoto,
        partnerOnboardingStep: "ADDRESS_DETAILS",
      };

      if (user.profile) {
        await prisma.userProfile.update({
          where: { id: user.profile.id },
          data: profileData,
        });
      } else {
        await prisma.userProfile.create({
          data: {
            userId: user.id,
            ...profileData,
          },
        });
      }

      return { success: true, nextStep: "ADDRESS_DETAILS" };
    }),

  /**
   * Save address details (Step 2)
   */
  saveAddressDetails: protectedProcedure
    .input(
      z.object({
        currentAddress: z.object({
          line1: z.string().min(5),
          line2: z.string().optional(),
          city: z.string().min(2),
          state: z.string().min(2),
          pincode: z.string().regex(/^\d{6}$/, "Pincode must be 6 digits"),
          landmark: z.string().optional(),
        }),
        permanentAddress: z.object({
          line1: z.string().min(5),
          line2: z.string().optional(),
          city: z.string().min(2),
          state: z.string().min(2),
          pincode: z.string().regex(/^\d{6}$/, "Pincode must be 6 digits"),
          landmark: z.string().optional(),
        }).optional(),
        sameAsCurrent: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const profile = await prisma.userProfile.findUnique({
        where: { userId: ctx.session.userId },
      });

      if (!profile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Profile not found. Please complete step 1 first.",
        });
      }

      const permanentAddress = input.sameAsCurrent 
        ? input.currentAddress 
        : input.permanentAddress;

      await prisma.userProfile.update({
        where: { id: profile.id },
        data: {
          currentAddress: JSON.stringify(input.currentAddress),
          permanentAddress: permanentAddress ? JSON.stringify(permanentAddress) : null,
          partnerOnboardingStep: "EMERGENCY_CONTACT",
        },
      });

      return { success: true, nextStep: "EMERGENCY_CONTACT" };
    }),

  /**
   * Save emergency contact (Step 3)
   */
  saveEmergencyContact: protectedProcedure
    .input(
      z.object({
        name: z.string().min(2),
        phone: z.string().regex(/^\d{10}$/, "Phone must be 10 digits"),
        relation: z.string().min(2),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const profile = await prisma.userProfile.findUnique({
        where: { userId: ctx.session.userId },
      });

      if (!profile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Profile not found.",
        });
      }

      await prisma.userProfile.update({
        where: { id: profile.id },
        data: {
          emergencyContactName: input.name,
          emergencyContactPhone: input.phone,
          emergencyContactRelation: input.relation,
          partnerOnboardingStep: "IDENTITY_DOCS",
        },
      });

      return { success: true, nextStep: "IDENTITY_DOCS" };
    }),

  /**
   * Save identity documents (Step 4)
   */
  saveIdentityDocs: protectedProcedure
    .input(
      z.object({
        aadhaarNumber: z.string().regex(/^\d{12}$/, "Aadhaar must be 12 digits"),
        aadhaarFrontUrl: z.string().url().optional(),
        aadhaarBackUrl: z.string().url().optional(),
        panNumber: z.string().regex(/^[A-Z]{5}\d{4}[A-Z]$/, "Invalid PAN format"),
        panCardUrl: z.string().url().optional(),
        drivingLicenseNumber: z.string().optional(),
        drivingLicenseUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const profile = await prisma.userProfile.findUnique({
        where: { userId: ctx.session.userId },
      });

      if (!profile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Profile not found.",
        });
      }

      // Check for duplicate Aadhaar
      const existingAadhaar = await prisma.userProfile.findFirst({
        where: {
          aadhaarNumber: input.aadhaarNumber,
          NOT: { id: profile.id },
        },
      });

      if (existingAadhaar) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This Aadhaar number is already registered.",
        });
      }

      // Check for duplicate PAN
      const existingPan = await prisma.userProfile.findFirst({
        where: {
          panNumber: input.panNumber,
          NOT: { id: profile.id },
        },
      });

      if (existingPan) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This PAN number is already registered.",
        });
      }

      // Determine next step based on role
      const nextStep = profile.role === UserRole.DELIVERY_DRIVER 
        ? "VEHICLE_DETAILS" 
        : "BANK_DETAILS";

      await prisma.userProfile.update({
        where: { id: profile.id },
        data: {
          aadhaarNumber: input.aadhaarNumber,
          aadhaarFrontUrl: input.aadhaarFrontUrl,
          aadhaarBackUrl: input.aadhaarBackUrl,
          panNumber: input.panNumber,
          panCardUrl: input.panCardUrl,
          drivingLicenseNumber: input.drivingLicenseNumber,
          drivingLicenseUrl: input.drivingLicenseUrl,
          partnerOnboardingStep: nextStep,
        },
      });

      return { success: true, nextStep };
    }),

  /**
   * Save vehicle details (Step 5 - Only for DELIVERY_DRIVER)
   */
  saveVehicleDetails: protectedProcedure
    .input(
      z.object({
        vehicleType: z.enum(["Bike", "Scooter", "Bicycle", "Car"]),
        vehicleNumber: z.string().min(4).max(15),
        vehicleModel: z.string().optional(),
        vehicleRcUrl: z.string().url().optional(),
        vehicleInsuranceUrl: z.string().url().optional(),
        vehicleInsuranceExpiry: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const profile = await prisma.userProfile.findUnique({
        where: { userId: ctx.session.userId },
      });

      if (!profile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Profile not found.",
        });
      }

      if (profile.role !== UserRole.DELIVERY_DRIVER) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Vehicle details are only required for delivery drivers.",
        });
      }

      // Check for duplicate vehicle number
      const existingVehicle = await prisma.userProfile.findFirst({
        where: {
          vehicleNumber: input.vehicleNumber,
          NOT: { id: profile.id },
        },
      });

      if (existingVehicle) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "This vehicle number is already registered.",
        });
      }

      await prisma.userProfile.update({
        where: { id: profile.id },
        data: {
          vehicleType: input.vehicleType,
          vehicleNumber: input.vehicleNumber,
          vehicleModel: input.vehicleModel,
          vehicleRcUrl: input.vehicleRcUrl,
          vehicleInsuranceUrl: input.vehicleInsuranceUrl,
          vehicleInsuranceExpiry: input.vehicleInsuranceExpiry 
            ? new Date(input.vehicleInsuranceExpiry) 
            : null,
          partnerOnboardingStep: "BANK_DETAILS",
        },
      });

      return { success: true, nextStep: "BANK_DETAILS" };
    }),

  /**
   * Save bank details (Step 6)
   */
  saveBankDetails: protectedProcedure
    .input(
      z.object({
        accountNumber: z.string().min(9).max(18),
        confirmAccountNumber: z.string().min(9).max(18),
        ifscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code"),
        bankType: z.enum(["Savings", "Current"]),
        accountHolderName: z.string().min(2).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.accountNumber !== input.confirmAccountNumber) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Account numbers do not match.",
        });
      }

      const profile = await prisma.userProfile.findUnique({
        where: { userId: ctx.session.userId },
      });

      if (!profile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Profile not found.",
        });
      }

      await prisma.userProfile.update({
        where: { id: profile.id },
        data: {
          bankAccountNumber: input.accountNumber,
          bankAccountConfirm: input.confirmAccountNumber,
          ifscCode: input.ifscCode,
          bankType: input.bankType,
          partnerOnboardingStep: "WORK_PREFERENCE",
        },
      });

      return { success: true, nextStep: "WORK_PREFERENCE" };
    }),

  /**
   * Save work preferences (Step 7)
   */
  saveWorkPreference: protectedProcedure
    .input(
      z.object({
        preferredWorkingHours: z.enum(["Morning", "Evening", "Night", "Flexible"]),
        preferredDeliveryZones: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const profile = await prisma.userProfile.findUnique({
        where: { userId: ctx.session.userId },
      });

      if (!profile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Profile not found.",
        });
      }

      await prisma.userProfile.update({
        where: { id: profile.id },
        data: {
          preferredWorkingHours: input.preferredWorkingHours,
          preferredDeliveryZones: input.preferredDeliveryZones 
            ? JSON.stringify(input.preferredDeliveryZones) 
            : null,
          partnerOnboardingStep: "TERMS_ACCEPTANCE",
        },
      });

      return { success: true, nextStep: "TERMS_ACCEPTANCE" };
    }),

  /**
   * Accept terms and complete onboarding (Final Step)
   */
  completeOnboarding: protectedProcedure
    .input(
      z.object({
        acceptTerms: z.boolean(),
        acceptPrivacyPolicy: z.boolean(),
        acceptBackgroundCheck: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!input.acceptTerms || !input.acceptPrivacyPolicy || !input.acceptBackgroundCheck) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You must accept all terms and conditions.",
        });
      }

      const profile = await prisma.userProfile.findUnique({
        where: { userId: ctx.session.userId },
      });

      if (!profile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Profile not found.",
        });
      }

      await prisma.userProfile.update({
        where: { id: profile.id },
        data: {
          termsAcceptedAt: new Date(),
          partnerOnboardingStep: "COMPLETED",
          partnerOnboardingCompletedAt: new Date(),
          backgroundCheckStatus: "IN_PROGRESS", // Will be verified by admin
          verificationStatus: "IN_PROGRESS",
          isActive: true,
        },
      });

      return { 
        success: true, 
        message: "Onboarding completed! Your profile is under review.",
        nextStep: "COMPLETED",
      };
    }),

  /**
   * Skip to a specific onboarding step (for development/testing)
   */
  skipToStep: protectedProcedure
    .input(
      z.object({
        step: z.enum([
          "PERSONAL_INFO",
          "ADDRESS_DETAILS", 
          "EMERGENCY_CONTACT",
          "IDENTITY_DOCS",
          "VEHICLE_DETAILS",
          "BANK_DETAILS",
          "WORK_PREFERENCE",
          "TERMS_ACCEPTANCE",
          "COMPLETED",
        ]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const profile = await prisma.userProfile.findUnique({
        where: { userId: ctx.session.userId },
      });

      if (!profile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Profile not found.",
        });
      }

      await prisma.userProfile.update({
        where: { id: profile.id },
        data: {
          partnerOnboardingStep: input.step,
        },
      });

      return { success: true, currentStep: input.step };
    }),

  /**
   * Generate mock data for testing onboarding
   */
  fillMockData: protectedProcedure
    .input(
      z.object({
        role: z.enum(["DELIVERY_DRIVER", "PICKUP_HELPER"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await prisma.user.findUnique({
        where: { id: ctx.session.userId },
        include: { profile: true },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found.",
        });
      }

      const mockData = {
        role: input.role as UserRole,
        dateOfBirth: new Date("1995-05-15"),
        gender: "MALE",
        profilePhoto: "https://picsum.photos/200",
        currentAddress: JSON.stringify({
          line1: "123 Test Street",
          line2: "Apartment 4B",
          city: "Mumbai",
          state: "Maharashtra",
          pincode: "400001",
          landmark: "Near Central Mall",
        }),
        permanentAddress: JSON.stringify({
          line1: "456 Home Road",
          city: "Pune",
          state: "Maharashtra",
          pincode: "411001",
        }),
        emergencyContactName: "John Doe",
        emergencyContactPhone: "9876543210",
        emergencyContactRelation: "Father",
        aadhaarNumber: String(Math.floor(100000000000 + Math.random() * 900000000000)),
        aadhaarFrontUrl: "https://picsum.photos/400/250",
        aadhaarBackUrl: "https://picsum.photos/400/250",
        panNumber: `ABCDE${Math.floor(1000 + Math.random() * 9000)}F`,
        panCardUrl: "https://picsum.photos/400/250",
        bankAccountNumber: String(Math.floor(100000000000 + Math.random() * 900000000000)),
        bankAccountConfirm: String(Math.floor(100000000000 + Math.random() * 900000000000)),
        ifscCode: "HDFC0001234",
        bankType: "Savings",
        preferredWorkingHours: "Flexible",
        partnerOnboardingStep: input.role === "DELIVERY_DRIVER" ? "VEHICLE_DETAILS" : "BANK_DETAILS",
        ...(input.role === "DELIVERY_DRIVER" && {
          drivingLicenseNumber: `MH${Math.floor(100000000000 + Math.random() * 900000000000)}`,
          drivingLicenseUrl: "https://picsum.photos/400/250",
          vehicleType: "Bike",
          vehicleNumber: `MH12AB${Math.floor(1000 + Math.random() * 9000)}`,
          vehicleModel: "Honda Activa",
          vehicleRcUrl: "https://picsum.photos/400/250",
          vehicleInsuranceUrl: "https://picsum.photos/400/250",
          vehicleInsuranceExpiry: new Date("2025-12-31"),
          partnerOnboardingStep: "WORK_PREFERENCE",
        }),
      };

      // Make bank account numbers match
      mockData.bankAccountConfirm = mockData.bankAccountNumber;

      if (user.profile) {
        await prisma.userProfile.update({
          where: { id: user.profile.id },
          data: mockData,
        });
      } else {
        await prisma.userProfile.create({
          data: {
            userId: user.id,
            ...mockData,
          },
        });
      }

      return { 
        success: true, 
        message: "Mock data filled successfully",
        nextStep: mockData.partnerOnboardingStep,
      };
    }),

  // ==================== SCHEDULE & AVAILABILITY ====================

  /**
   * Go online - Start accepting orders
   */
  goOnline: protectedProcedure.mutation(async ({ ctx }) => {
    const { profile } = await ensureDeliveryPartner(ctx.session.userId);

    // Check if onboarding is complete
    if (profile.partnerOnboardingStep !== "COMPLETED") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Please complete onboarding before going online.",
      });
    }

    // Check if partner is active (approved by admin)
    if (!profile.isActive) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Your account is not active. Please contact support.",
      });
    }

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Update profile to online and start shift
    await prisma.userProfile.update({
      where: { id: profile.id },
      data: {
        isOnline: true,
        lastOnlineAt: now,
        todayShiftStartedAt: profile.todayShiftStartedAt || now,
        currentBreakStartedAt: null,
        currentBreakReason: null,
      },
    });

    // Create or update shift log for today
    await prisma.partnerShiftLog.upsert({
      where: {
        partnerId_date: {
          partnerId: profile.id,
          date: today,
        },
      },
      update: {},
      create: {
        partnerId: profile.id,
        date: today,
        startedAt: now,
      },
    });

    return {
      success: true,
      message: "You are now online! Orders will start coming in.",
      isOnline: true,
    };
  }),

  /**
   * Go offline - Stop accepting orders
   */
  goOffline: protectedProcedure.mutation(async ({ ctx }) => {
    const { profile } = await ensureDeliveryPartner(ctx.session.userId);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Calculate shift duration
    let shiftMinutes = 0;
    if (profile.todayShiftStartedAt) {
      shiftMinutes = Math.floor(
        (now.getTime() - profile.todayShiftStartedAt.getTime()) / 60000
      );
    }

    // Update profile to offline
    await prisma.userProfile.update({
      where: { id: profile.id },
      data: {
        isOnline: false,
        todayShiftEndedAt: now,
        currentBreakStartedAt: null,
        currentBreakReason: null,
      },
    });

    // Update shift log with end time
    const shiftLog = await prisma.partnerShiftLog.findUnique({
      where: {
        partnerId_date: {
          partnerId: profile.id,
          date: today,
        },
      },
    });

    if (shiftLog && !shiftLog.endedAt) {
      await prisma.partnerShiftLog.update({
        where: { id: shiftLog.id },
        data: {
          endedAt: now,
          totalMinutes: shiftMinutes - (shiftLog.breakMinutes || 0),
        },
      });
    }

    return {
      success: true,
      message: "You are now offline. See you soon!",
      isOnline: false,
      todayStats: {
        shiftMinutes,
        breakMinutes: profile.totalBreakMinutesToday || 0,
        activeMinutes: shiftMinutes - (profile.totalBreakMinutesToday || 0),
      },
    };
  }),

  /**
   * Get availability status
   */
  getAvailability: protectedProcedure.query(async ({ ctx }) => {
    const { profile } = await ensureDeliveryPartner(ctx.session.userId);

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Get today's shift log
    const todayShift = await prisma.partnerShiftLog.findUnique({
      where: {
        partnerId_date: {
          partnerId: profile.id,
          date: today,
        },
      },
    });

    // Get weekly schedule
    const schedule = await prisma.partnerSchedule.findMany({
      where: {
        partnerId: profile.id,
        deletedAt: null,
      },
      orderBy: { dayOfWeek: "asc" },
    });

    // Calculate active time today
    let activeMinutesToday = 0;
    if (todayShift) {
      const endTime = todayShift.endedAt || now;
      const totalMinutes = Math.floor(
        (endTime.getTime() - todayShift.startedAt.getTime()) / 60000
      );
      activeMinutesToday = totalMinutes - (todayShift.breakMinutes || 0);
    }

    return {
      isOnline: profile.isOnline,
      isOnBreak: !!profile.currentBreakStartedAt,
      breakReason: profile.currentBreakReason,
      autoAcceptOrders: profile.autoAcceptOrders,
      maxConcurrentOrders: profile.maxConcurrentOrders,
      lastOnlineAt: profile.lastOnlineAt,
      todayShift: todayShift
        ? {
            startedAt: todayShift.startedAt,
            endedAt: todayShift.endedAt,
            activeMinutes: activeMinutesToday,
            breakMinutes: todayShift.breakMinutes,
            ordersCount: todayShift.ordersCount,
            earnings: todayShift.earnings,
          }
        : null,
      schedule: schedule.map((s) => ({
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
        endTime: s.endTime,
        isEnabled: s.isEnabled,
      })),
    };
  }),

  /**
   * Start a break
   */
  startBreak: protectedProcedure
    .input(
      z.object({
        reason: z.enum(["LUNCH", "PERSONAL", "PRAYER", "OTHER"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { profile } = await ensureDeliveryPartner(ctx.session.userId);

      if (!profile.isOnline) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You must be online to take a break.",
        });
      }

      if (profile.currentBreakStartedAt) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "You are already on a break.",
        });
      }

      const now = new Date();

      // Update profile with break info
      await prisma.userProfile.update({
        where: { id: profile.id },
        data: {
          currentBreakStartedAt: now,
          currentBreakReason: input.reason,
        },
      });

      // Create break log
      await prisma.partnerBreakLog.create({
        data: {
          partnerId: profile.id,
          reason: input.reason,
          startedAt: now,
        },
      });

      return {
        success: true,
        message: `Break started. Take your time!`,
        breakStartedAt: now,
        reason: input.reason,
      };
    }),

  /**
   * End a break
   */
  endBreak: protectedProcedure.mutation(async ({ ctx }) => {
    const { profile } = await ensureDeliveryPartner(ctx.session.userId);

    if (!profile.currentBreakStartedAt) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "You are not on a break.",
      });
    }

    const now = new Date();
    const breakDuration = Math.floor(
      (now.getTime() - profile.currentBreakStartedAt.getTime()) / 60000
    );

    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // Update profile
    await prisma.userProfile.update({
      where: { id: profile.id },
      data: {
        currentBreakStartedAt: null,
        currentBreakReason: null,
        totalBreakMinutesToday: (profile.totalBreakMinutesToday || 0) + breakDuration,
      },
    });

    // Update the latest break log
    const latestBreak = await prisma.partnerBreakLog.findFirst({
      where: {
        partnerId: profile.id,
        endedAt: null,
      },
      orderBy: { startedAt: "desc" },
    });

    if (latestBreak) {
      await prisma.partnerBreakLog.update({
        where: { id: latestBreak.id },
        data: {
          endedAt: now,
          duration: breakDuration,
        },
      });
    }

    // Update shift log break minutes
    await prisma.partnerShiftLog.updateMany({
      where: {
        partnerId: profile.id,
        date: today,
      },
      data: {
        breakMinutes: { increment: breakDuration },
      },
    });

    return {
      success: true,
      message: `Break ended. ${breakDuration} minutes logged.`,
      breakDuration,
      totalBreakMinutesToday: (profile.totalBreakMinutesToday || 0) + breakDuration,
    };
  }),

  /**
   * Update schedule for a day
   */
  updateSchedule: protectedProcedure
    .input(
      z.object({
        dayOfWeek: z.number().min(0).max(6),
        startTime: z.string().regex(/^\d{2}:\d{2}$/),
        endTime: z.string().regex(/^\d{2}:\d{2}$/),
        isEnabled: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { profile } = await ensureDeliveryPartner(ctx.session.userId);

      // Validate time range
      const [startHour, startMin] = input.startTime.split(":").map(Number);
      const [endHour, endMin] = input.endTime.split(":").map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      if (endMinutes <= startMinutes) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "End time must be after start time.",
        });
      }

      // Minimum shift duration: 2 hours
      if (endMinutes - startMinutes < 120) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Minimum shift duration is 2 hours.",
        });
      }

      const schedule = await prisma.partnerSchedule.upsert({
        where: {
          partnerId_dayOfWeek: {
            partnerId: profile.id,
            dayOfWeek: input.dayOfWeek,
          },
        },
        update: {
          startTime: input.startTime,
          endTime: input.endTime,
          isEnabled: input.isEnabled,
        },
        create: {
          partnerId: profile.id,
          dayOfWeek: input.dayOfWeek,
          startTime: input.startTime,
          endTime: input.endTime,
          isEnabled: input.isEnabled,
        },
      });

      const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

      return {
        success: true,
        message: `Schedule updated for ${days[input.dayOfWeek]}.`,
        schedule: {
          dayOfWeek: schedule.dayOfWeek,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
          isEnabled: schedule.isEnabled,
        },
      };
    }),

  /**
   * Update auto-accept setting
   */
  updateAutoAccept: protectedProcedure
    .input(
      z.object({
        autoAcceptOrders: z.boolean(),
        maxConcurrentOrders: z.number().min(1).max(5).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { profile } = await ensureDeliveryPartner(ctx.session.userId);

      await prisma.userProfile.update({
        where: { id: profile.id },
        data: {
          autoAcceptOrders: input.autoAcceptOrders,
          maxConcurrentOrders: input.maxConcurrentOrders ?? profile.maxConcurrentOrders,
        },
      });

      return {
        success: true,
        message: input.autoAcceptOrders
          ? `Auto-accept enabled. Max ${input.maxConcurrentOrders ?? profile.maxConcurrentOrders} concurrent orders.`
          : "Auto-accept disabled.",
        autoAcceptOrders: input.autoAcceptOrders,
        maxConcurrentOrders: input.maxConcurrentOrders ?? profile.maxConcurrentOrders,
      };
    }),

  /**
   * Get shift history
   */
  getShiftHistory: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(30).optional(),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const { profile } = await ensureDeliveryPartner(ctx.session.userId);

      const shifts = await prisma.partnerShiftLog.findMany({
        where: {
          partnerId: profile.id,
          deletedAt: null,
        },
        orderBy: { date: "desc" },
        take: input?.limit || 7,
      });

      return shifts.map((s) => ({
        id: s.id,
        date: s.date,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        totalMinutes: s.totalMinutes,
        breakMinutes: s.breakMinutes,
        ordersCount: s.ordersCount,
        earnings: s.earnings,
      }));
    }),
});