import { protectedProcedure, router } from "../../trpc";
import { Prisma, VerificationStatus } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import prisma from "../../db";

// Import sub-routers
import { ordersRouter } from "./orders";
import { customersRouter } from "./customers";
import { productsRouter as adminProductsRouter } from "./products";
import { inventoryRouter } from "./inventory";
import { driversRouter } from "./drivers";

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

// Schemas for type safety
const sellerStatusSchema = z.enum(["PENDING", "IN_PROGRESS", "VERIFIED", "REJECTED"]);
const paginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20),
});

// Core admin router with seller management and dashboard endpoints
const coreAdminRouter = router({
  // ============================================
  // ADMIN VERIFICATION
  // ============================================
  
  // Verify if current user has admin access
  verifyAdminAccess: adminProcedure.query(async ({ ctx }) => {
    // If we reach here, the adminProcedure middleware already verified admin role
    const user = await prisma.user.findUnique({
      where: { id: ctx.session.userId },
      select: { id: true, name: true, email: true },
    });
    
    return {
      isAdmin: true,
      user: {
        id: user?.id,
        name: user?.name,
        email: user?.email,
      },
    };
  }),

  // Get current user's profile (for role verification)
  getCurrentProfile: protectedProcedure.query(async ({ ctx }) => {
    const userProfile = await prisma.userProfile.findUnique({
      where: { userId: ctx.session.userId },
      select: { 
        id: true, 
        role: true, 
        userId: true,
        verificationStatus: true,
      },
    });

    if (!userProfile) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "User profile not found",
      });
    }

    return userProfile;
  }),

  // ============================================
  // DASHBOARD STATISTICS
  // ============================================
  
  // Get dashboard statistics
  getDashboardStats: adminProcedure.query(async () => {
    const [
      totalSellers,
      verifiedSellers,
      pendingReview,
      inProgressReview,
      rejectedSellers,
      totalRevenue,
      thisMonthSellers,
    ] = await Promise.all([
      prisma.userProfile.count({
        where: { role: "SELLER", deletedAt: null },
      }),
      prisma.userProfile.count({
        where: { role: "SELLER", verificationStatus: "VERIFIED", deletedAt: null },
      }),
      prisma.userProfile.count({
        where: { role: "SELLER", verificationStatus: "PENDING", deletedAt: null },
      }),
      prisma.userProfile.count({
        where: { role: "SELLER", verificationStatus: "IN_PROGRESS", deletedAt: null },
      }),
      prisma.userProfile.count({
        where: { role: "SELLER", verificationStatus: "REJECTED", deletedAt: null },
      }),
      prisma.order.aggregate({
        where: { status: "DELIVERED", deletedAt: null },
        _sum: { total: true },
      }),
      prisma.userProfile.count({
        where: {
          role: "SELLER",
          deletedAt: null,
          user: {
            createdAt: {
              gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
            },
          },
        },
      }),
    ]);

    return {
      totalSellers,
      verifiedSellers,
      pendingReview,
      inProgressReview,
      rejectedSellers,
      totalRevenue: totalRevenue._sum?.total ?? 0,
      thisMonthSellers,
      verificationRate: totalSellers > 0 ? Math.round((verifiedSellers / totalSellers) * 100) : 0,
      lastFetch: Date.now(),
    };
  }),

  // ============================================
  // SELLER MANAGEMENT
  // ============================================

  // Get all sellers with pagination and filters
  getAllSellers: adminProcedure
    .input(
      z.object({
        ...paginationSchema.shape,
        status: z.enum(["all", "PENDING", "IN_PROGRESS", "VERIFIED", "REJECTED"]).default("all"),
        search: z.string().optional(),
        sortBy: z.enum(["createdAt", "brandName", "verificationStatus"]).default("createdAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
      })
    )
    .query(async ({ input }) => {
      const { page, limit, status, search, sortBy, sortOrder } = input;
      const skip = (page - 1) * limit;

      const where: Prisma.UserProfileWhereInput = {
        role: "SELLER",
        deletedAt: null,
      };

      if (status !== "all") {
        where.verificationStatus = status as VerificationStatus;
      }

      if (search) {
        where.OR = [
          { brandName: { contains: search } },
          { legalBusinessName: { contains: search } },
          { gstNumber: { contains: search } },
          { user: { email: { contains: search } } },
          { user: { name: { contains: search } } },
        ];
      }

      const [sellers, total] = await Promise.all([
        prisma.userProfile.findMany({
          where,
          skip,
          take: limit,
          orderBy: sortBy === "createdAt" 
            ? { user: { createdAt: sortOrder } }
            : { [sortBy]: sortOrder },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phoneNumber: true,
                createdAt: true,
              },
            },
            warehouses: {
              select: { id: true },
            },
            products: {
              select: { id: true },
            },
            orders: {
              where: { status: "DELIVERED" },
              select: { total: true },
            },
          },
        }),
        prisma.userProfile.count({ where }),
      ]);

      const transformedSellers = sellers.map((seller) => ({
        id: seller.id,
        userId: seller.userId,
        name: seller.user.name,
        email: seller.user.email,
        phone: seller.user.phoneNumber,
        brandName: seller.brandName || seller.legalBusinessName || "Unnamed Business",
        gstNumber: seller.gstNumber,
        verificationStatus: seller.verificationStatus,
        onboardingStep: seller.onboardingStep,
        totalProducts: seller.products.length,
        totalWarehouses: seller.warehouses.length,
        totalOrders: seller.orders.length,
        totalRevenue: seller.orders.reduce((sum: number, order: { total: number | null }) => sum + (order.total ?? 0), 0),
        createdAt: seller.user.createdAt,
        approvedAt: seller.approvedAt,
        rejectedAt: seller.rejectedAt,
        rejectionReason: seller.rejectionReason,
      }));

      return {
        sellers: transformedSellers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNext: page * limit < total,
          hasPrev: page > 1,
        },
      };
    }),

  // Get single seller details for review
  getSellerDetails: adminProcedure
    .input(z.object({ sellerId: z.string() }))
    .query(async ({ input }) => {
      const seller = await prisma.userProfile.findUnique({
        where: { id: input.sellerId },
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
          warehouses: true,
          shippingLocations: true,
          products: {
            take: 10,
            orderBy: { createdAt: "desc" },
          },
          orders: {
            take: 10,
            orderBy: { createdAt: "desc" },
          },
        },
      });

      if (!seller || seller.role !== "SELLER") {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Seller not found.",
        });
      }

      const [totalOrders, deliveredOrders, totalProducts] = await Promise.all([
        prisma.order.count({
          where: { userId: seller.id },
        }),
        prisma.order.aggregate({
          where: { userId: seller.id, status: "DELIVERED" },
          _count: true,
          _sum: { total: true },
        }),
        prisma.product.count({
          where: { sellerId: seller.id },
        }),
      ]);

      return {
        ...seller,
        statistics: {
          totalOrders,
          deliveredOrders: deliveredOrders._count,
          totalRevenue: deliveredOrders._sum?.total ?? 0,
          totalProducts,
        },
      };
    }),

  // Update seller verification status
  updateSellerStatus: adminProcedure
    .input(
      z.object({
        sellerId: z.string(),
        status: sellerStatusSchema,
        notes: z.string().optional(),
        rejectionReason: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { sellerId, status, notes, rejectionReason } = input;

      const seller = await prisma.userProfile.findUnique({
        where: { id: sellerId },
        include: { user: true },
      });

      if (!seller || seller.role !== "SELLER") {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Seller not found.",
        });
      }

      const updateData: Prisma.UserProfileUpdateInput = {
        verificationStatus: status,
      };

      if (status === "VERIFIED") {
        updateData.approvedAt = new Date();
        updateData.rejectedAt = null;
        updateData.rejectionReason = null;
      } else if (status === "REJECTED") {
        updateData.rejectedAt = new Date();
        updateData.rejectionReason = rejectionReason || notes || "Application rejected by admin.";
        updateData.approvedAt = null;
      } else if (status === "IN_PROGRESS") {
        updateData.approvedAt = null;
        updateData.rejectedAt = null;
      }

      const updatedSeller = await prisma.userProfile.update({
        where: { id: sellerId },
        data: updateData,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return {
        success: true,
        seller: {
          id: updatedSeller.id,
          name: updatedSeller.user.name,
          email: updatedSeller.user.email,
          verificationStatus: updatedSeller.verificationStatus,
          approvedAt: updatedSeller.approvedAt,
          rejectedAt: updatedSeller.rejectedAt,
          rejectionReason: updatedSeller.rejectionReason,
        },
        message: `Seller ${status === "VERIFIED" ? "approved" : status === "REJECTED" ? "rejected" : "status updated"} successfully.`,
      };
    }),

  // Bulk update seller statuses
  bulkUpdateSellerStatus: adminProcedure
    .input(
      z.object({
        sellerIds: z.array(z.string()).min(1),
        status: sellerStatusSchema,
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { sellerIds, status, notes } = input;

      const updateData: Prisma.UserProfileUpdateInput = {
        verificationStatus: status,
      };

      if (status === "VERIFIED") {
        updateData.approvedAt = new Date();
        updateData.rejectedAt = null;
        updateData.rejectionReason = null;
      } else if (status === "REJECTED") {
        updateData.rejectedAt = new Date();
        updateData.rejectionReason = notes || "Bulk rejection by admin.";
        updateData.approvedAt = null;
      }

      const result = await prisma.userProfile.updateMany({
        where: {
          id: { in: sellerIds },
          role: "SELLER",
        },
        data: updateData,
      });

      return {
        success: true,
        updatedCount: result.count,
        message: `${result.count} seller(s) ${status === "VERIFIED" ? "approved" : status === "REJECTED" ? "rejected" : "updated"} successfully.`,
      };
    }),

  // Get pending review count
  getPendingReviewCount: adminProcedure.query(async () => {
    const count = await prisma.userProfile.count({
      where: {
        role: "SELLER",
        verificationStatus: "PENDING",
        deletedAt: null,
      },
    });

    return { count };
  }),

  // Search sellers
  searchSellers: adminProcedure
    .input(z.object({ query: z.string().min(1) }))
    .query(async ({ input }) => {
      const sellers = await prisma.userProfile.findMany({
        where: {
          role: "SELLER",
          deletedAt: null,
          OR: [
            { brandName: { contains: input.query } },
            { legalBusinessName: { contains: input.query } },
            { gstNumber: { contains: input.query } },
            { user: { email: { contains: input.query } } },
            { user: { name: { contains: input.query } } },
          ],
        },
        take: 10,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      });

      return sellers.map((seller) => ({
        id: seller.id,
        name: seller.user.name,
        email: seller.user.email,
        brandName: seller.brandName || seller.legalBusinessName,
        verificationStatus: seller.verificationStatus,
      }));
    }),

  // ============================================
  // COMPREHENSIVE DASHBOARD
  // ============================================

  // Get full admin dashboard data
  getAdminDashboard: adminProcedure.query(async () => {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const [
      totalRevenue,
      thisMonthRevenue,
      lastMonthRevenue,
      totalOrders,
      thisMonthOrders,
      lastMonthOrders,
      ordersByStatus,
      totalSellers,
      activeSellers,
      totalProducts,
      activeProducts,
      lowStockProducts,
      outOfStockProducts,
      totalCustomers,
      activeCustomers,
      recentOrders,
    ] = await Promise.all([
      prisma.order.aggregate({
        where: { status: "DELIVERED", deletedAt: null },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: { 
          status: "DELIVERED", 
          deletedAt: null,
          createdAt: { gte: thisMonthStart },
        },
        _sum: { total: true },
      }),
      prisma.order.aggregate({
        where: { 
          status: "DELIVERED", 
          deletedAt: null,
          createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
        },
        _sum: { total: true },
      }),
      prisma.order.count({ where: { deletedAt: null } }),
      prisma.order.count({ 
        where: { deletedAt: null, createdAt: { gte: thisMonthStart } } 
      }),
      prisma.order.count({ 
        where: { 
          deletedAt: null, 
          createdAt: { gte: lastMonthStart, lte: lastMonthEnd } 
        } 
      }),
      prisma.order.groupBy({
        by: ["status"],
        where: { deletedAt: null },
        _count: { status: true },
      }),
      prisma.userProfile.count({ 
        where: { role: "SELLER", deletedAt: null } 
      }),
      prisma.userProfile.count({ 
        where: { role: "SELLER", verificationStatus: "VERIFIED", deletedAt: null } 
      }),
      prisma.product.count({ where: { deletedAt: null } }),
      prisma.product.count({ where: { isActive: true, deletedAt: null } }),
      prisma.productLocation.groupBy({
        by: ["productVariantId"],
        _sum: { quantity: true },
        having: { quantity: { _sum: { lt: 10, gt: 0 } } },
      }),
      prisma.productLocation.groupBy({
        by: ["productVariantId"],
        _sum: { quantity: true },
        having: { quantity: { _sum: { equals: 0 } } },
      }),
      prisma.userProfile.count({ 
        where: { role: "CUSTOMER", deletedAt: null } 
      }),
      prisma.userProfile.count({
        where: { 
          role: "CUSTOMER", 
          deletedAt: null,
          orders: { some: { deletedAt: null } },
        },
      }),
      prisma.order.findMany({
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          user: {
            include: { user: { select: { name: true } } },
          },
        },
      }),
    ]);

    // Get top sellers
    const topSellerData = await prisma.orderItem.findMany({
      where: {
        order: { status: "DELIVERED", deletedAt: null },
        deletedAt: null,
      },
      select: {
        totalPrice: true,
        product: {
          select: {
            sellerId: true,
            seller: { select: { brandName: true, legalBusinessName: true } },
          },
        },
      },
    });

    const sellerRevenue: Record<string, { revenue: number; orders: number; name: string }> = {};
    topSellerData.forEach(item => {
      const sellerId = item.product.sellerId;
      if (!sellerRevenue[sellerId]) {
        sellerRevenue[sellerId] = {
          revenue: 0,
          orders: 0,
          name: item.product.seller?.brandName || item.product.seller?.legalBusinessName || "Unknown",
        };
      }
      sellerRevenue[sellerId].revenue += item.totalPrice;
      sellerRevenue[sellerId].orders += 1;
    });

    const topSellers = Object.entries(sellerRevenue)
      .map(([id, data]) => ({ id, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    // Calculate changes
    const thisMonthRevenueVal = thisMonthRevenue._sum?.total ?? 0;
    const lastMonthRevenueVal = lastMonthRevenue._sum?.total ?? 0;
    const revenueChange = lastMonthRevenueVal > 0 
      ? ((thisMonthRevenueVal - lastMonthRevenueVal) / lastMonthRevenueVal) * 100 
      : 0;

    const orderChange = lastMonthOrders > 0 
      ? ((thisMonthOrders - lastMonthOrders) / lastMonthOrders) * 100 
      : 0;

    const statusMap: Record<string, number> = {};
    ordersByStatus.forEach(item => {
      statusMap[item.status] = item._count.status;
    });

    return {
      stats: [
        {
          name: "Total Revenue",
          value: totalRevenue._sum?.total ?? 0,
          change: revenueChange,
          changeType: revenueChange >= 0 ? "increase" : "decrease",
          format: "currency",
        },
        {
          name: "Total Orders",
          value: totalOrders,
          change: orderChange,
          changeType: orderChange >= 0 ? "increase" : "decrease",
          format: "number",
        },
        {
          name: "Active Sellers",
          value: activeSellers,
          change: 0,
          changeType: "increase",
          format: "number",
        },
        {
          name: "Total Products",
          value: totalProducts,
          change: 0,
          changeType: "increase",
          format: "number",
        },
      ],
      ordersByStatus: statusMap,
      recentOrders: recentOrders.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        customer: order.user?.user?.name || "Unknown",
        amount: order.total,
        status: order.status,
        createdAt: order.createdAt,
      })),
      topSellers,
      inventory: {
        lowStock: lowStockProducts.length,
        outOfStock: outOfStockProducts.length,
      },
      customers: {
        total: totalCustomers,
        active: activeCustomers,
      },
    };
  }),

  // ============================================
  // ANALYTICS
  // ============================================

  // Get analytics data
  getAnalytics: adminProcedure
    .input(
      z.object({
        timeRange: z.enum(["7d", "30d", "90d", "1y"]).default("30d"),
      })
    )
    .query(async ({ input }) => {
      const now = new Date();
      let startDate: Date;
      
      switch (input.timeRange) {
        case "7d":
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          break;
        case "30d":
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          break;
        case "90d":
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          break;
        case "1y":
          startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
          break;
        default:
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }

      const periodLength = now.getTime() - startDate.getTime();
      const prevStartDate = new Date(startDate.getTime() - periodLength);
      const prevEndDate = startDate;

      const [
        currentRevenue,
        currentOrders,
        currentCustomers,
        prevRevenue,
        prevOrders,
        prevCustomers,
        ordersByDay,
        topProducts,
        topSellers,
        ordersByStatus,
        todayOrders,
        categoryBreakdown,
      ] = await Promise.all([
        prisma.order.aggregate({
          where: { 
            status: "DELIVERED", 
            deletedAt: null,
            createdAt: { gte: startDate },
          },
          _sum: { total: true },
        }),
        prisma.order.count({
          where: { 
            deletedAt: null,
            createdAt: { gte: startDate },
          },
        }),
        prisma.order.findMany({
          where: {
            deletedAt: null,
            createdAt: { gte: startDate },
          },
          select: { userId: true },
          distinct: ["userId"],
        }),
        prisma.order.aggregate({
          where: { 
            status: "DELIVERED", 
            deletedAt: null,
            createdAt: { gte: prevStartDate, lt: prevEndDate },
          },
          _sum: { total: true },
        }),
        prisma.order.count({
          where: { 
            deletedAt: null,
            createdAt: { gte: prevStartDate, lt: prevEndDate },
          },
        }),
        prisma.order.findMany({
          where: {
            deletedAt: null,
            createdAt: { gte: prevStartDate, lt: prevEndDate },
          },
          select: { userId: true },
          distinct: ["userId"],
        }),
        prisma.order.findMany({
          where: {
            deletedAt: null,
            createdAt: { gte: startDate },
          },
          select: {
            total: true,
            createdAt: true,
            status: true,
          },
          orderBy: { createdAt: "asc" },
        }),
        prisma.orderItem.groupBy({
          by: ["productVariantId"],
          where: {
            order: { 
              deletedAt: null, 
              status: "DELIVERED",
              createdAt: { gte: startDate },
            },
            deletedAt: null,
          },
          _sum: { quantity: true, totalPrice: true },
          orderBy: { _sum: { quantity: "desc" } },
          take: 5,
        }),
        prisma.orderItem.findMany({
          where: {
            order: { 
              status: "DELIVERED", 
              deletedAt: null,
              createdAt: { gte: startDate },
            },
            deletedAt: null,
          },
          select: {
            totalPrice: true,
            product: {
              select: {
                sellerId: true,
                seller: { select: { brandName: true, legalBusinessName: true } },
              },
            },
          },
        }),
        prisma.order.groupBy({
          by: ["status"],
          where: { 
            deletedAt: null,
            createdAt: { gte: startDate },
          },
          _count: { status: true },
        }),
        prisma.order.findMany({
          where: {
            deletedAt: null,
            createdAt: {
              gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
            },
          },
          select: { createdAt: true },
        }),
        prisma.orderItem.findMany({
          where: {
            order: { 
              status: "DELIVERED", 
              deletedAt: null,
              createdAt: { gte: startDate },
            },
            deletedAt: null,
          },
          select: {
            totalPrice: true,
            product: {
              select: {
                category: { select: { name: true } },
              },
            },
          },
        }),
      ]);

      // Get product details for top products
      const topProductDetails = await Promise.all(
        topProducts.map(async (item) => {
          const variant = await prisma.productVariant.findUnique({
            where: { id: item.productVariantId },
            select: { 
              product: { select: { name: true } },
            },
          });
          return {
            name: variant?.product?.name || "Unknown",
            sales: item._sum.quantity || 0,
            revenue: item._sum.totalPrice || 0,
          };
        })
      );

      // Aggregate seller revenue
      const sellerRevenue: Record<string, { revenue: number; orders: number; name: string }> = {};
      topSellers.forEach(item => {
        const sellerId = item.product.sellerId;
        if (!sellerRevenue[sellerId]) {
          sellerRevenue[sellerId] = {
            revenue: 0,
            orders: 0,
            name: item.product.seller?.brandName || item.product.seller?.legalBusinessName || "Unknown",
          };
        }
        sellerRevenue[sellerId].revenue += item.totalPrice;
        sellerRevenue[sellerId].orders += 1;
      });

      const topSellersList = Object.entries(sellerRevenue)
        .map(([id, data]) => ({ id, ...data }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Aggregate orders by day
      const revenueByDay: Record<string, { revenue: number; orders: number; delivered: number; cancelled: number }> = {};
      ordersByDay.forEach(order => {
        const day = order.createdAt.toISOString().split("T")[0];
        if (!revenueByDay[day]) {
          revenueByDay[day] = { revenue: 0, orders: 0, delivered: 0, cancelled: 0 };
        }
        revenueByDay[day].orders += 1;
        if (order.status === "DELIVERED") {
          revenueByDay[day].revenue += order.total;
          revenueByDay[day].delivered += 1;
        }
        if (order.status === "CANCELLED") {
          revenueByDay[day].cancelled += 1;
        }
      });

      const revenueData = Object.entries(revenueByDay)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, data]) => ({
          date,
          revenue: data.revenue,
          orders: data.orders,
          delivered: data.delivered,
          cancelled: data.cancelled,
        }));

      // Aggregate orders by hour
      const ordersByHour: number[] = new Array(24).fill(0);
      todayOrders.forEach(order => {
        const hour = order.createdAt.getHours();
        ordersByHour[hour] += 1;
      });

      const hourlyData = ordersByHour.map((count, hour) => ({
        hour: `${hour.toString().padStart(2, "0")}:00`,
        orders: count,
      }));

      // Aggregate category breakdown
      const categoryRevenue: Record<string, number> = {};
      let totalCategoryRevenue = 0;
      categoryBreakdown.forEach(item => {
        const categoryName = item.product.category?.name || "Uncategorized";
        categoryRevenue[categoryName] = (categoryRevenue[categoryName] || 0) + item.totalPrice;
        totalCategoryRevenue += item.totalPrice;
      });

      const categoryData = Object.entries(categoryRevenue)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 6)
        .map(([name, value], index) => ({
          name,
          value: totalCategoryRevenue > 0 ? Math.round((value / totalCategoryRevenue) * 100) : 0,
          revenue: value,
          color: ["#DC2626", "#F59E0B", "#10B981", "#3B82F6", "#8B5CF6", "#6B7280"][index],
        }));

      // Calculate changes
      const currentRevenueVal = currentRevenue._sum?.total ?? 0;
      const prevRevenueVal = prevRevenue._sum?.total ?? 0;
      const revenueChange = prevRevenueVal > 0 
        ? ((currentRevenueVal - prevRevenueVal) / prevRevenueVal) * 100 
        : 0;

      const orderChange = prevOrders > 0 
        ? ((currentOrders - prevOrders) / prevOrders) * 100 
        : 0;

      const customerChange = prevCustomers.length > 0 
        ? ((currentCustomers.length - prevCustomers.length) / prevCustomers.length) * 100 
        : 0;

      const avgOrderValue = currentOrders > 0 ? currentRevenueVal / currentOrders : 0;
      const prevAvgOrderValue = prevOrders > 0 ? (prevRevenueVal / prevOrders) : 0;
      const aovChange = prevAvgOrderValue > 0 
        ? ((avgOrderValue - prevAvgOrderValue) / prevAvgOrderValue) * 100 
        : 0;

      const statusCounts: Record<string, number> = {};
      ordersByStatus.forEach(item => {
        statusCounts[item.status] = item._count.status;
      });

      return {
        kpis: {
          totalRevenue: currentRevenueVal,
          revenueChange,
          totalOrders: currentOrders,
          orderChange,
          activeCustomers: currentCustomers.length,
          customerChange,
          avgOrderValue,
          aovChange,
        },
        revenueData,
        hourlyData,
        categoryData,
        topProducts: topProductDetails,
        topSellers: topSellersList,
        ordersByStatus: statusCounts,
      };
    }),
});

// Merge all routers into one admin router
export const adminRouter = router({
  // Core admin endpoints (sellers, dashboard, analytics)
  ...coreAdminRouter._def.procedures,
  
  // Orders endpoints
  ...ordersRouter._def.procedures,
  
  // Customers endpoints
  ...customersRouter._def.procedures,
  
  // Products endpoints (admin-specific)
  ...adminProductsRouter._def.procedures,
  
  // Inventory endpoints
  ...inventoryRouter._def.procedures,
  
  // Drivers endpoints
  ...driversRouter._def.procedures,
});
