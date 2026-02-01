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

export const productsRouter = router({
  // Get all products for admin
  getAllProducts: adminProcedure
    .input(
      z.object({
        status: z.enum(["ALL", "ACTIVE", "INACTIVE"]).default("ALL"),
        stockLevel: z.enum(["ALL", "IN_STOCK", "LOW_STOCK", "OUT_OF_STOCK"]).default("ALL"),
        search: z.string().optional(),
        categoryId: z.string().optional(),
        sellerId: z.string().optional(),
        sortBy: z.enum(["recent", "name", "price", "stock"]).default("recent"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ input }) => {
      const { status, stockLevel, search, categoryId, sellerId, sortBy, sortOrder, page, limit } = input;
      const skip = (page - 1) * limit;

      const where: Prisma.ProductWhereInput = {
        deletedAt: null,
        ...(status === "ACTIVE" && { isActive: true }),
        ...(status === "INACTIVE" && { isActive: false }),
        ...(sellerId && { sellerId }),
        ...(categoryId && { categoryId }),
        ...(search && {
          OR: [
            { name: { contains: search } },
            { description: { contains: search } },
            { variants: { some: { sku: { contains: search } } } },
          ],
        }),
      };

      // Determine orderBy based on sortBy
      const orderByMap: Record<string, Prisma.ProductOrderByWithRelationInput> = {
        recent: { createdAt: sortOrder },
        name: { name: sortOrder },
        price: { basePrice: sortOrder },
        stock: { createdAt: sortOrder }, // Stock sorting handled in memory after fetching
      };

      const [products, total, stats] = await Promise.all([
        prisma.product.findMany({
          where,
          skip: stockLevel === "ALL" ? skip : 0, // Fetch all if filtering by stock level (done in memory)
          take: stockLevel === "ALL" ? limit : undefined,
          orderBy: orderByMap[sortBy] || { createdAt: "desc" },
          include: {
            seller: { select: { brandName: true, legalBusinessName: true } },
            category: { select: { name: true } },
            variants: {
              take: 1,
              include: {
                productLocations: {
                  select: { quantity: true },
                },
              },
            },
            _count: { select: { variants: true } },
          },
        }),
        prisma.product.count({ where }),
        prisma.product.groupBy({
          by: ["isActive"],
          where: { deletedAt: null },
          _count: { id: true },
        }),
      ]);

      // Get low stock count
      const lowStockCount = await prisma.productLocation.groupBy({
        by: ["productVariantId"],
        _sum: { quantity: true },
        having: { quantity: { _sum: { lt: 10, gt: 0 } } },
      });

      // Process products with stock calculation
      let processedProducts = products.map(product => {
        const variant = product.variants[0];
        const totalStock = variant?.productLocations.reduce((sum: number, loc: { quantity: number }) => sum + loc.quantity, 0) ?? 0;
        // Parse images JSON string
        let imageUrl: string | null = null;
        try {
          const images = JSON.parse(product.images || "[]");
          imageUrl = Array.isArray(images) && images.length > 0 ? images[0] : null;
        } catch {
          imageUrl = null;
        }
        return {
          id: product.id,
          name: product.name,
          description: product.description,
          image: imageUrl,
          seller: product.seller?.brandName || product.seller?.legalBusinessName || "Unknown",
          sellerId: product.sellerId,
          category: product.category?.name || "Uncategorized",
          price: variant?.price ?? product.basePrice,
          sku: variant?.sku || product.sku,
          stock: totalStock,
          isActive: product.isActive,
          variantCount: product._count.variants,
          createdAt: product.createdAt,
        };
      });

      // Filter by stock level if needed (in memory since stock is calculated from productLocations)
      if (stockLevel !== "ALL") {
        processedProducts = processedProducts.filter(p => {
          if (stockLevel === "OUT_OF_STOCK") return p.stock === 0;
          if (stockLevel === "LOW_STOCK") return p.stock > 0 && p.stock < 10;
          if (stockLevel === "IN_STOCK") return p.stock >= 10;
          return true;
        });
      }

      // Sort by stock if requested (done in memory since stock is calculated)
      if (sortBy === "stock") {
        processedProducts.sort((a, b) => {
          return sortOrder === "asc" ? a.stock - b.stock : b.stock - a.stock;
        });
      }

      // Apply pagination for stock level filtering
      const filteredTotal = stockLevel !== "ALL" ? processedProducts.length : total;
      const paginatedProducts = stockLevel !== "ALL" 
        ? processedProducts.slice(skip, skip + limit)
        : processedProducts;

      return {
        products: paginatedProducts,
        pagination: {
          total: filteredTotal,
          page,
          limit,
          totalPages: Math.ceil(filteredTotal / limit),
        },
        stats: {
          total: stats.reduce((sum, s) => sum + s._count.id, 0),
          active: stats.find(s => s.isActive)?._count.id ?? 0,
          inactive: stats.find(s => !s.isActive)?._count.id ?? 0,
          lowStock: lowStockCount.length,
        },
      };
    }),
});
