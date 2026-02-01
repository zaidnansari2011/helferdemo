import { protectedProcedure, router } from "../../trpc";
import { Prisma } from "@prisma/client";
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

export const customersRouter = router({
  // Get all customers for admin
  getAllCustomers: adminProcedure
    .input(
      z.object({
        status: z.enum(["ALL", "ACTIVE", "INACTIVE"]).default("ALL"),
        search: z.string().optional(),
        sortBy: z.enum(["recent", "orders", "spent", "name"]).default("recent"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
        minOrders: z.number().optional(),
        maxOrders: z.number().optional(),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ input }) => {
      const { status, search, sortBy, sortOrder, minOrders, maxOrders, page, limit } = input;
      const skip = (page - 1) * limit;

      // Build where clause
      const where: Prisma.UserProfileWhereInput = {
        role: "CUSTOMER",
        deletedAt: null,
        ...(search && {
          OR: [
            { user: { name: { contains: search } } },
            { user: { email: { contains: search } } },
            { user: { phoneNumber: { contains: search } } },
          ],
        }),
      };

      // Status filter based on orders
      if (status === "ACTIVE") {
        where.orders = { some: { deletedAt: null } };
      } else if (status === "INACTIVE") {
        where.orders = { none: { deletedAt: null } };
      }

      // Determine orderBy
      const orderBy: Prisma.UserProfileOrderByWithRelationInput = 
        sortBy === "name" 
          ? { user: { name: sortOrder } }
          : { user: { createdAt: sortOrder } };

      // Get all matching customers
      const allCustomers = await prisma.userProfile.findMany({
        where,
        orderBy,
        include: {
          user: {
            select: { id: true, name: true, email: true, phoneNumber: true, createdAt: true, image: true },
          },
          orders: {
            where: { deletedAt: null },
            select: { total: true, createdAt: true },
            orderBy: { createdAt: "desc" },
          },
          _count: { select: { orders: { where: { deletedAt: null } } } },
        },
      });

      // Process and filter customers
      type ProcessedCustomer = {
        id: string;
        userId: string;
        name: string | null;
        email: string;
        phone: string | null;
        image: string | null;
        totalOrders: number;
        totalSpent: number;
        avgOrderValue: number;
        createdAt: Date;
        lastOrderAt: Date | null;
      };

      let processedCustomers: ProcessedCustomer[] = allCustomers.map(customer => {
        const totalSpent = customer.orders.reduce((sum: number, order) => sum + (order.total || 0), 0);
        const lastOrder = customer.orders[0];
        return {
          id: customer.id,
          userId: customer.userId,
          name: customer.user.name,
          email: customer.user.email,
          phone: customer.user.phoneNumber,
          image: customer.user.image,
          totalOrders: customer._count.orders,
          totalSpent,
          avgOrderValue: customer._count.orders > 0 ? totalSpent / customer._count.orders : 0,
          createdAt: customer.user.createdAt,
          lastOrderAt: lastOrder?.createdAt || null,
        };
      });

      // Apply order count filters
      if (minOrders !== undefined || maxOrders !== undefined) {
        processedCustomers = processedCustomers.filter(c => {
          if (minOrders !== undefined && c.totalOrders < minOrders) return false;
          if (maxOrders !== undefined && c.totalOrders > maxOrders) return false;
          return true;
        });
      }

      // Sort by orders or spent
      if (sortBy === "orders") {
        processedCustomers.sort((a, b) => {
          const diff = a.totalOrders - b.totalOrders;
          return sortOrder === "desc" ? -diff : diff;
        });
      } else if (sortBy === "spent") {
        processedCustomers.sort((a, b) => {
          return sortOrder === "desc" ? b.totalSpent - a.totalSpent : a.totalSpent - b.totalSpent;
        });
      }

      const total = processedCustomers.length;
      const paginatedCustomers = processedCustomers.slice(skip, skip + limit);

      // Calculate stats
      const [totalCustomers, activeCustomers, totalOrdersCount] = await Promise.all([
        prisma.userProfile.count({ where: { role: "CUSTOMER", deletedAt: null } }),
        prisma.userProfile.count({
          where: { role: "CUSTOMER", deletedAt: null, orders: { some: { deletedAt: null } } },
        }),
        prisma.order.count({ where: { deletedAt: null } }),
      ]);

      return {
        customers: paginatedCustomers,
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
        stats: {
          totalCustomers,
          activeCustomers,
          totalOrders: totalOrdersCount,
        },
      };
    }),
});
