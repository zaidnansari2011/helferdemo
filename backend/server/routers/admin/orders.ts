import { protectedProcedure, router } from "../../trpc";
import { Prisma, OrderStatus, PaymentStatus, UserRole } from "@prisma/client";
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

export const ordersRouter = router({
  // Get all orders for admin
  getAllOrders: adminProcedure
    .input(
      z.object({
        status: z.enum(["ALL", "PENDING", "CONFIRMED", "PICKING", "PICKED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"]).default("ALL"),
        paymentStatus: z.enum(["ALL", "PENDING", "COMPLETED", "FAILED", "REFUNDED"]).default("ALL"),
        search: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        sortBy: z.enum(["recent", "amount", "status"]).default("recent"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ input }) => {
      const { status, paymentStatus, search, dateFrom, dateTo, sortBy, sortOrder, page, limit } = input;
      const skip = (page - 1) * limit;

      const where: Prisma.OrderWhereInput = {
        deletedAt: null,
        ...(status !== "ALL" && { status: status as OrderStatus }),
        ...(paymentStatus !== "ALL" && { paymentStatus: paymentStatus as PaymentStatus }),
        ...(dateFrom && { createdAt: { gte: new Date(dateFrom) } }),
        ...(dateTo && { createdAt: { lte: new Date(dateTo) } }),
        ...(search && {
          OR: [
            { orderNumber: { contains: search } },
            { user: { user: { name: { contains: search } } } },
            { user: { user: { email: { contains: search } } } },
          ],
        }),
      };

      // Determine orderBy
      const orderByMap: Record<string, Prisma.OrderOrderByWithRelationInput> = {
        recent: { createdAt: sortOrder },
        amount: { total: sortOrder },
        status: { status: sortOrder },
      };

      const [orders, total, statusCounts] = await Promise.all([
        prisma.order.findMany({
          where,
          skip,
          take: limit,
          orderBy: orderByMap[sortBy] || { createdAt: "desc" },
          include: {
            user: {
              include: { user: { select: { name: true, email: true } } },
            },
            address: { select: { fullAddress: true, pincode: true } },
            items: { take: 1 },
            _count: { select: { items: true } },
          },
        }),
        prisma.order.count({ where }),
        prisma.order.groupBy({
          by: ["status"],
          where: { deletedAt: null },
          _count: { status: true },
        }),
      ]);

      // Calculate payment status counts
      const paymentStatusCounts = await prisma.order.groupBy({
        by: ["paymentStatus"],
        where: { deletedAt: null },
        _count: { paymentStatus: true },
      });

      return {
        orders: orders.map(order => ({
          id: order.id,
          orderNumber: order.orderNumber,
          customer: order.user?.user?.name || "Unknown",
          email: order.user?.user?.email,
          itemCount: order._count.items,
          total: order.total,
          status: order.status,
          paymentStatus: order.paymentStatus,
          deliveryAddress: order.address 
            ? `${order.address.fullAddress} - ${order.address.pincode}`
            : null,
          createdAt: order.createdAt,
        })),
        pagination: {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit),
        },
        statusCounts: statusCounts.reduce((acc, item) => {
          acc[item.status] = item._count.status;
          return acc;
        }, {} as Record<string, number>),
        paymentStatusCounts: paymentStatusCounts.reduce((acc, item) => {
          acc[item.paymentStatus] = item._count.paymentStatus;
          return acc;
        }, {} as Record<string, number>),
      };
    }),

  // Get single order details for admin
  getOrderDetails: adminProcedure
    .input(z.object({ orderId: z.string() }))
    .query(async ({ input }) => {
      const order = await prisma.order.findUnique({
        where: { id: input.orderId },
        include: {
          user: {
            include: {
              user: { select: { name: true, email: true, phoneNumber: true } },
            },
          },
          items: {
            include: {
              productVariant: {
                include: {
                  product: { select: { name: true, images: true, sellerId: true } },
                },
              },
            },
          },
          address: true,
          deliveryDriver: {
            include: {
              user: { select: { name: true, phoneNumber: true } },
            },
          },
        },
      });

      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      }

      // Get seller info from first item
      let sellerInfo = { name: "Unknown" };
      if (order.items[0]?.productVariant?.product?.sellerId) {
        const seller = await prisma.userProfile.findUnique({
          where: { id: order.items[0].productVariant.product.sellerId },
          select: { brandName: true, legalBusinessName: true },
        });
        if (seller) {
          sellerInfo.name = seller.brandName || seller.legalBusinessName || "Unknown";
        }
      }

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        total: order.total,
        subtotal: order.subtotal,
        deliveryFee: order.deliveryFee,
        tax: order.taxes,
        discount: 0,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        deliveredAt: order.deliveredAt,
        cancelledAt: null,
        cancellationReason: order.status === "CANCELLED" ? (order.notes || "Cancelled") : null,
        paymentMethod: order.paymentMethod,
        paymentStatus: order.paymentStatus,
        notes: order.notes,
        customer: {
          name: order.user?.user?.name || "Unknown",
          email: order.user?.user?.email,
          phone: order.user?.user?.phoneNumber,
        },
        seller: sellerInfo,
        driver: order.deliveryDriver ? {
          name: order.deliveryDriver.user?.name || "Unknown",
          phone: order.deliveryDriver.user?.phoneNumber,
        } : null,
        deliveryAddress: order.address ? {
          address: order.address.fullAddress,
          landmark: order.address.landmark,
          pincode: order.address.pincode,
        } : null,
        items: order.items.map((item) => {
          let imageUrl: string | null = null;
          try {
            const images = JSON.parse(item.productVariant?.product?.images || "[]");
            imageUrl = Array.isArray(images) && images.length > 0 ? images[0] : null;
          } catch {
            imageUrl = null;
          }
          return {
            id: item.id,
            name: item.productVariant?.product?.name || "Unknown Product",
            sku: item.productVariant?.sku || "N/A",
            quantity: item.quantity,
            price: item.unitPrice,
            total: item.totalPrice,
            image: imageUrl,
          };
        }),
      };
    }),

  // Update order status (admin override)
  updateOrderStatus: adminProcedure
    .input(z.object({
      orderId: z.string(),
      status: z.enum(["PENDING", "CONFIRMED", "PICKING", "PICKED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"]),
      notes: z.string().optional(),
      cancellationReason: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const { orderId, status, notes, cancellationReason } = input;

      const order = await prisma.order.findUnique({ where: { id: orderId } });
      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      }

      // Build update data - store cancellation reason in notes field
      const updateData: Prisma.OrderUpdateInput = {
        status,
        ...(notes && { notes }),
        ...(status === "CANCELLED" && cancellationReason && { notes: cancellationReason }),
        ...(status === "DELIVERED" && { deliveredAt: new Date() }),
      };

      const updated = await prisma.order.update({
        where: { id: orderId },
        data: updateData,
      });

      return {
        success: true,
        order: {
          id: updated.id,
          status: updated.status,
          updatedAt: updated.updatedAt,
        },
      };
    }),

  // Reassign order to different driver
  reassignOrder: adminProcedure
    .input(z.object({
      orderId: z.string(),
      driverId: z.string(),
    }))
    .mutation(async ({ input }) => {
      const { orderId, driverId } = input;

      // Verify order exists
      const order = await prisma.order.findUnique({ where: { id: orderId } });
      if (!order) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Order not found" });
      }

      // Verify driver exists and is verified
      const driver = await prisma.userProfile.findUnique({
        where: { id: driverId },
        include: { user: { select: { name: true } } },
      });
      if (!driver || (driver.role !== UserRole.DELIVERY_DRIVER && driver.role !== UserRole.PICKUP_HELPER)) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Driver not found" });
      }
      if (driver.verificationStatus !== "VERIFIED") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Driver is not verified" });
      }

      const updated = await prisma.order.update({
        where: { id: orderId },
        data: { deliveryDriverId: driverId },
      });

      return {
        success: true,
        order: {
          id: updated.id,
          driverId: updated.deliveryDriverId,
        },
        driver: {
          id: driver.id,
          name: driver.user?.name,
        },
      };
    }),

  // Get available drivers for reassignment
  getAvailableDrivers: adminProcedure.query(async () => {
    const drivers = await prisma.userProfile.findMany({
      where: {
        role: { in: [UserRole.DELIVERY_DRIVER, UserRole.PICKUP_HELPER] },
        verificationStatus: "VERIFIED",
        isOnline: true,
        deletedAt: null,
      },
      include: {
        user: { select: { name: true, phoneNumber: true } },
        _count: {
          select: {
            driverOrders: {
              where: { status: { in: ["OUT_FOR_DELIVERY", "PICKING", "PICKED"] } },
            },
          },
        },
      },
      orderBy: { user: { name: "asc" } },
    });

    return drivers.map(d => ({
      id: d.id,
      name: d.user?.name || "Unknown",
      phone: d.user?.phoneNumber,
      role: d.role,
      activeOrders: d._count.driverOrders,
    }));
  }),
});
