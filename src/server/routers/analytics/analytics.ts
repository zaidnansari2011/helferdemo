import { router, protectedProcedure } from "../../trpc";
import { PrismaClient } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

const prisma = new PrismaClient();

// Helper function to ensure user has seller profile
async function ensureSellerProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });

  if (!user) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "User not found.",
    });
  }

  if (!user.profile || user.profile.role !== "SELLER") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Access denied. Seller account required.",
    });
  }

  return user;
}

// Helper to get date range based on period
function getDateRange(period: string): { startDate: Date; endDate: Date } {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);
  
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);

  switch (period) {
    case "7d":
      startDate.setDate(startDate.getDate() - 7);
      break;
    case "30d":
      startDate.setDate(startDate.getDate() - 30);
      break;
    case "90d":
      startDate.setDate(startDate.getDate() - 90);
      break;
    case "12m":
      startDate.setMonth(startDate.getMonth() - 12);
      break;
    case "all":
      startDate.setFullYear(2020, 0, 1); // Far back enough
      break;
    default:
      startDate.setDate(startDate.getDate() - 30);
  }

  return { startDate, endDate };
}

// Get previous period for comparison
function getPreviousPeriodRange(startDate: Date, endDate: Date): { prevStartDate: Date; prevEndDate: Date } {
  const duration = endDate.getTime() - startDate.getTime();
  const prevEndDate = new Date(startDate.getTime() - 1);
  prevEndDate.setHours(23, 59, 59, 999);
  const prevStartDate = new Date(prevEndDate.getTime() - duration);
  prevStartDate.setHours(0, 0, 0, 0);
  
  return { prevStartDate, prevEndDate };
}

export const analyticsRouter = router({
  // Get revenue analytics with period comparison
  getRevenueAnalytics: protectedProcedure
    .input(
      z.object({
        period: z.enum(["7d", "30d", "90d", "12m", "all"]).default("30d"),
      })
    )
    .query(async ({ ctx, input }) => {
      const user = await ensureSellerProfile(ctx.session.userId);
      const sellerId = user.profile!.id;
      const { startDate, endDate } = getDateRange(input.period);
      const { prevStartDate, prevEndDate } = getPreviousPeriodRange(startDate, endDate);

      // Current period revenue
      const currentRevenue = await prisma.orderItem.aggregate({
        where: {
          product: { sellerId, deletedAt: null },
          order: {
            paymentStatus: "COMPLETED",
            createdAt: { gte: startDate, lte: endDate },
            deletedAt: null,
          },
          deletedAt: null,
        },
        _sum: { totalPrice: true },
      });

      // Previous period revenue
      const previousRevenue = await prisma.orderItem.aggregate({
        where: {
          product: { sellerId, deletedAt: null },
          order: {
            paymentStatus: "COMPLETED",
            createdAt: { gte: prevStartDate, lte: prevEndDate },
            deletedAt: null,
          },
          deletedAt: null,
        },
        _sum: { totalPrice: true },
      });

      const current = currentRevenue._sum.totalPrice || 0;
      const previous = previousRevenue._sum.totalPrice || 0;
      const percentChange = previous > 0 ? ((current - previous) / previous) * 100 : current > 0 ? 100 : 0;

      return {
        currentPeriod: current,
        previousPeriod: previous,
        percentChange: Math.round(percentChange * 10) / 10,
        trend: percentChange >= 0 ? "up" : "down",
      };
    }),

  // Get order analytics with period comparison
  getOrderAnalytics: protectedProcedure
    .input(
      z.object({
        period: z.enum(["7d", "30d", "90d", "12m", "all"]).default("30d"),
      })
    )
    .query(async ({ ctx, input }) => {
      const user = await ensureSellerProfile(ctx.session.userId);
      const sellerId = user.profile!.id;
      const { startDate, endDate } = getDateRange(input.period);
      const { prevStartDate, prevEndDate } = getPreviousPeriodRange(startDate, endDate);

      // Current period orders
      const currentOrders = await prisma.order.count({
        where: {
          items: { some: { product: { sellerId } } },
          createdAt: { gte: startDate, lte: endDate },
          deletedAt: null,
        },
      });

      // Previous period orders
      const previousOrders = await prisma.order.count({
        where: {
          items: { some: { product: { sellerId } } },
          createdAt: { gte: prevStartDate, lte: prevEndDate },
          deletedAt: null,
        },
      });

      const percentChange = previousOrders > 0 
        ? ((currentOrders - previousOrders) / previousOrders) * 100 
        : currentOrders > 0 ? 100 : 0;

      return {
        currentPeriod: currentOrders,
        previousPeriod: previousOrders,
        percentChange: Math.round(percentChange * 10) / 10,
        trend: percentChange >= 0 ? "up" : "down",
      };
    }),

  // Get revenue chart data (daily/weekly/monthly breakdown)
  getRevenueChartData: protectedProcedure
    .input(
      z.object({
        period: z.enum(["7d", "30d", "90d", "12m"]).default("30d"),
      })
    )
    .query(async ({ ctx, input }) => {
      const user = await ensureSellerProfile(ctx.session.userId);
      const sellerId = user.profile!.id;
      const { startDate, endDate } = getDateRange(input.period);

      // Get all order items in the period
      const orderItems = await prisma.orderItem.findMany({
        where: {
          product: { sellerId, deletedAt: null },
          order: {
            paymentStatus: "COMPLETED",
            createdAt: { gte: startDate, lte: endDate },
            deletedAt: null,
          },
          deletedAt: null,
        },
        include: {
          order: {
            select: { createdAt: true },
          },
        },
      });

      // Group by date
      const groupByFormat = input.period === "12m" ? "month" : input.period === "7d" ? "day" : "day";
      const dataMap = new Map<string, number>();

      orderItems.forEach((item) => {
        const date = item.order.createdAt;
        let key: string;
        
        if (groupByFormat === "month") {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        } else {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        }
        
        dataMap.set(key, (dataMap.get(key) || 0) + item.totalPrice);
      });

      // Fill in missing dates
      const chartData: { date: string; revenue: number; label: string }[] = [];
      const current = new Date(startDate);

      while (current <= endDate) {
        let key: string;
        let label: string;

        if (groupByFormat === "month") {
          key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`;
          label = current.toLocaleDateString("en-US", { month: "short", year: "numeric" });
          current.setMonth(current.getMonth() + 1);
        } else {
          key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`;
          label = current.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          current.setDate(current.getDate() + 1);
        }

        chartData.push({
          date: key,
          revenue: Math.round((dataMap.get(key) || 0) * 100) / 100,
          label,
        });
      }

      return chartData;
    }),

  // Get orders chart data
  getOrdersChartData: protectedProcedure
    .input(
      z.object({
        period: z.enum(["7d", "30d", "90d", "12m"]).default("30d"),
      })
    )
    .query(async ({ ctx, input }) => {
      const user = await ensureSellerProfile(ctx.session.userId);
      const sellerId = user.profile!.id;
      const { startDate, endDate } = getDateRange(input.period);

      // Get all orders in the period
      const orders = await prisma.order.findMany({
        where: {
          items: { some: { product: { sellerId } } },
          createdAt: { gte: startDate, lte: endDate },
          deletedAt: null,
        },
        select: { createdAt: true, status: true },
      });

      // Group by date
      const groupByFormat = input.period === "12m" ? "month" : "day";
      const dataMap = new Map<string, { total: number; delivered: number }>();

      orders.forEach((order) => {
        const date = order.createdAt;
        let key: string;
        
        if (groupByFormat === "month") {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        } else {
          key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        }
        
        const existing = dataMap.get(key) || { total: 0, delivered: 0 };
        existing.total += 1;
        if (order.status === "DELIVERED") {
          existing.delivered += 1;
        }
        dataMap.set(key, existing);
      });

      // Fill in missing dates
      const chartData: { date: string; orders: number; delivered: number; label: string }[] = [];
      const current = new Date(startDate);

      while (current <= endDate) {
        let key: string;
        let label: string;

        if (groupByFormat === "month") {
          key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`;
          label = current.toLocaleDateString("en-US", { month: "short", year: "numeric" });
          current.setMonth(current.getMonth() + 1);
        } else {
          key = `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}-${String(current.getDate()).padStart(2, "0")}`;
          label = current.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          current.setDate(current.getDate() + 1);
        }

        const data = dataMap.get(key) || { total: 0, delivered: 0 };
        chartData.push({
          date: key,
          orders: data.total,
          delivered: data.delivered,
          label,
        });
      }

      return chartData;
    }),

  // Get top selling products
  getTopProducts: protectedProcedure
    .input(
      z.object({
        period: z.enum(["7d", "30d", "90d", "12m", "all"]).default("30d"),
        limit: z.number().min(1).max(20).default(5),
      })
    )
    .query(async ({ ctx, input }) => {
      const user = await ensureSellerProfile(ctx.session.userId);
      const sellerId = user.profile!.id;
      const { startDate, endDate } = getDateRange(input.period);

      // Get order items grouped by product
      const orderItems = await prisma.orderItem.findMany({
        where: {
          product: { sellerId, deletedAt: null },
          order: {
            paymentStatus: "COMPLETED",
            createdAt: { gte: startDate, lte: endDate },
            deletedAt: null,
          },
          deletedAt: null,
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              images: true,
              sku: true,
            },
          },
        },
      });

      // Aggregate by product
      const productMap = new Map<string, {
        product: { id: string; name: string; images: string; sku: string };
        totalRevenue: number;
        totalQuantity: number;
        orderCount: number;
      }>();

      orderItems.forEach((item) => {
        const existing = productMap.get(item.productId);
        if (existing) {
          existing.totalRevenue += item.totalPrice;
          existing.totalQuantity += item.quantity;
          existing.orderCount += 1;
        } else {
          productMap.set(item.productId, {
            product: item.product,
            totalRevenue: item.totalPrice,
            totalQuantity: item.quantity,
            orderCount: 1,
          });
        }
      });

      // Sort by revenue and take top N
      const topProducts = Array.from(productMap.values())
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, input.limit)
        .map((item, index) => ({
          rank: index + 1,
          ...item,
          totalRevenue: Math.round(item.totalRevenue * 100) / 100,
        }));

      return topProducts;
    }),

  // Get category performance
  getCategoryPerformance: protectedProcedure
    .input(
      z.object({
        period: z.enum(["7d", "30d", "90d", "12m", "all"]).default("30d"),
      })
    )
    .query(async ({ ctx, input }) => {
      const user = await ensureSellerProfile(ctx.session.userId);
      const sellerId = user.profile!.id;
      const { startDate, endDate } = getDateRange(input.period);

      // Get order items with category info
      const orderItems = await prisma.orderItem.findMany({
        where: {
          product: { sellerId, deletedAt: null },
          order: {
            paymentStatus: "COMPLETED",
            createdAt: { gte: startDate, lte: endDate },
            deletedAt: null,
          },
          deletedAt: null,
        },
        include: {
          product: {
            include: {
              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      // Aggregate by category
      const categoryMap = new Map<string, {
        category: { id: string; name: string };
        totalRevenue: number;
        totalQuantity: number;
        orderCount: number;
      }>();

      orderItems.forEach((item) => {
        const categoryId = item.product.category.id;
        const existing = categoryMap.get(categoryId);
        if (existing) {
          existing.totalRevenue += item.totalPrice;
          existing.totalQuantity += item.quantity;
          existing.orderCount += 1;
        } else {
          categoryMap.set(categoryId, {
            category: item.product.category,
            totalRevenue: item.totalPrice,
            totalQuantity: item.quantity,
            orderCount: 1,
          });
        }
      });

      // Calculate total for percentages
      const total = Array.from(categoryMap.values()).reduce((sum, item) => sum + item.totalRevenue, 0);

      // Sort by revenue
      const categoryPerformance = Array.from(categoryMap.values())
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .map((item) => ({
          ...item,
          totalRevenue: Math.round(item.totalRevenue * 100) / 100,
          percentage: total > 0 ? Math.round((item.totalRevenue / total) * 1000) / 10 : 0,
        }));

      return categoryPerformance;
    }),

  // Get dashboard summary (combines multiple metrics)
  getDashboardSummary: protectedProcedure
    .input(
      z.object({
        period: z.enum(["7d", "30d", "90d", "12m", "all"]).default("30d"),
      })
    )
    .query(async ({ ctx, input }) => {
      const user = await ensureSellerProfile(ctx.session.userId);
      const sellerId = user.profile!.id;
      const { startDate, endDate } = getDateRange(input.period);
      const { prevStartDate, prevEndDate } = getPreviousPeriodRange(startDate, endDate);

      // Run all queries in parallel
      const [
        currentRevenue,
        previousRevenue,
        currentOrders,
        previousOrders,
        currentCustomers,
        previousCustomers,
        totalProducts,
      ] = await Promise.all([
        // Current period revenue
        prisma.orderItem.aggregate({
          where: {
            product: { sellerId, deletedAt: null },
            order: {
              paymentStatus: "COMPLETED",
              createdAt: { gte: startDate, lte: endDate },
              deletedAt: null,
            },
            deletedAt: null,
          },
          _sum: { totalPrice: true },
        }),
        // Previous period revenue
        prisma.orderItem.aggregate({
          where: {
            product: { sellerId, deletedAt: null },
            order: {
              paymentStatus: "COMPLETED",
              createdAt: { gte: prevStartDate, lte: prevEndDate },
              deletedAt: null,
            },
            deletedAt: null,
          },
          _sum: { totalPrice: true },
        }),
        // Current period orders
        prisma.order.count({
          where: {
            items: { some: { product: { sellerId } } },
            createdAt: { gte: startDate, lte: endDate },
            deletedAt: null,
          },
        }),
        // Previous period orders
        prisma.order.count({
          where: {
            items: { some: { product: { sellerId } } },
            createdAt: { gte: prevStartDate, lte: prevEndDate },
            deletedAt: null,
          },
        }),
        // Current period unique customers
        prisma.order.findMany({
          where: {
            items: { some: { product: { sellerId } } },
            createdAt: { gte: startDate, lte: endDate },
            deletedAt: null,
          },
          select: { userId: true },
          distinct: ["userId"],
        }),
        // Previous period unique customers
        prisma.order.findMany({
          where: {
            items: { some: { product: { sellerId } } },
            createdAt: { gte: prevStartDate, lte: prevEndDate },
            deletedAt: null,
          },
          select: { userId: true },
          distinct: ["userId"],
        }),
        // Total active products
        prisma.product.count({
          where: { sellerId, isActive: true, deletedAt: null },
        }),
      ]);

      const calcChange = (current: number, previous: number) => {
        if (previous === 0) return current > 0 ? 100 : 0;
        return Math.round(((current - previous) / previous) * 1000) / 10;
      };

      const currRev = currentRevenue._sum.totalPrice || 0;
      const prevRev = previousRevenue._sum.totalPrice || 0;
      const currCust = currentCustomers.length;
      const prevCust = previousCustomers.length;

      return {
        revenue: {
          value: Math.round(currRev * 100) / 100,
          change: calcChange(currRev, prevRev),
          trend: currRev >= prevRev ? "up" : "down",
        },
        orders: {
          value: currentOrders,
          change: calcChange(currentOrders, previousOrders),
          trend: currentOrders >= previousOrders ? "up" : "down",
        },
        customers: {
          value: currCust,
          change: calcChange(currCust, prevCust),
          trend: currCust >= prevCust ? "up" : "down",
        },
        products: {
          value: totalProducts,
        },
        period: input.period,
      };
    }),

  // Get low stock products (inventory alerts)
  getLowStockProducts: protectedProcedure
    .input(
      z.object({
        threshold: z.number().min(0).default(10), // Default low stock threshold
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const user = await ensureSellerProfile(ctx.session.userId);
      const sellerId = user.profile!.id;

      // Get products with inventory below threshold
      const productsWithStock = await prisma.product.findMany({
        where: {
          sellerId,
          isActive: true,
          deletedAt: null,
        },
        include: {
          variants: {
            where: { isActive: true, deletedAt: null },
            include: {
              productLocations: {
                select: {
                  quantity: true,
                },
              },
            },
          },
          category: {
            select: { name: true },
          },
        },
      });

      // Calculate total stock for each product
      const lowStockProducts = productsWithStock
        .map((product) => {
          const totalStock = product.variants.reduce((sum: number, variant) => {
            const variantStock = variant.productLocations.reduce(
              (vSum: number, loc) => vSum + loc.quantity,
              0
            );
            return sum + variantStock;
          }, 0);

          return {
            id: product.id,
            name: product.name,
            sku: product.sku,
            images: product.images,
            category: product.category.name,
            totalStock,
            variantCount: product.variants.length,
            status: totalStock <= 0 
              ? "out_of_stock" as const
              : totalStock <= input.threshold / 2 
                ? "critical" as const
                : "low" as const,
          };
        })
        .filter((p) => p.totalStock <= input.threshold)
        .sort((a, b) => a.totalStock - b.totalStock)
        .slice(0, input.limit);

      const outOfStockCount = lowStockProducts.filter(p => p.status === "out_of_stock").length;
      const criticalCount = lowStockProducts.filter(p => p.status === "critical").length;
      const lowCount = lowStockProducts.filter(p => p.status === "low").length;

      return {
        products: lowStockProducts,
        summary: {
          total: lowStockProducts.length,
          outOfStock: outOfStockCount,
          critical: criticalCount,
          low: lowCount,
        },
        threshold: input.threshold,
      };
    }),

  // Get inventory summary for all products
  getInventorySummary: protectedProcedure.query(async ({ ctx }) => {
    const user = await ensureSellerProfile(ctx.session.userId);
    const sellerId = user.profile!.id;

    // Get all active products with stock info
    const products = await prisma.product.findMany({
      where: {
        sellerId,
        isActive: true,
        deletedAt: null,
      },
      include: {
        variants: {
          where: { isActive: true, deletedAt: null },
          include: {
            productLocations: {
              select: {
                quantity: true,
              },
            },
          },
        },
      },
    });

    let totalProducts = products.length;
    let inStockProducts = 0;
    let lowStockProducts = 0;
    let outOfStockProducts = 0;
    let totalInventoryValue = 0;
    let totalUnits = 0;

    const LOW_STOCK_THRESHOLD = 10;

    products.forEach((product) => {
      const totalStock = product.variants.reduce((sum: number, variant) => {
        const variantStock = variant.productLocations.reduce(
          (vSum: number, loc) => vSum + loc.quantity,
          0
        );
        // Calculate inventory value
        totalInventoryValue += variantStock * variant.price;
        totalUnits += variantStock;
        return sum + variantStock;
      }, 0);

      if (totalStock <= 0) {
        outOfStockProducts++;
      } else if (totalStock <= LOW_STOCK_THRESHOLD) {
        lowStockProducts++;
      } else {
        inStockProducts++;
      }
    });

    return {
      totalProducts,
      inStockProducts,
      lowStockProducts,
      outOfStockProducts,
      totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
      totalUnits,
    };
  }),
});
