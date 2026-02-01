import { protectedProcedure, router } from "../../trpc";
import { TRPCError } from "@trpc/server";
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

export const inventoryRouter = router({
  // Get inventory overview for admin
  getInventoryOverview: adminProcedure.query(async () => {
    const [
      warehouseStats,
      lowStockAlerts,
      inventoryMovement,
    ] = await Promise.all([
      // Warehouse overview with floor plans and areas
      prisma.warehouse.findMany({
        where: { deletedAt: null },
        include: {
          floorPlans: {
            include: {
              areas: {
                include: {
                  racks: {
                    include: {
                      shelves: {
                        include: {
                          bins: {
                            include: {
                              productLocations: {
                                select: { quantity: true },
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
      }),
      // Low stock alerts
      prisma.productLocation.findMany({
        where: {
          quantity: { lt: 10 },
        },
        include: {
          productVariant: {
            include: {
              product: { select: { name: true, sellerId: true } },
            },
          },
          bin: {
            include: {
              shelf: {
                include: {
                  rack: {
                    include: {
                      area: {
                        include: {
                          floorPlan: {
                            include: { warehouse: { select: { id: true, name: true } } },
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
        take: 20,
        orderBy: { quantity: "asc" },
      }),
      // Total SKUs
      prisma.productVariant.count({ where: { deletedAt: null } }),
    ]);

    // Process warehouse stats
    const warehouseOverview = warehouseStats.map(warehouse => {
      let totalUnits = 0;
      let lowStockCount = 0;

      warehouse.floorPlans.forEach(floorPlan => {
        floorPlan.areas.forEach(area => {
          area.racks.forEach(rack => {
            rack.shelves.forEach(shelf => {
              shelf.bins.forEach(bin => {
                bin.productLocations.forEach(loc => {
                  totalUnits += loc.quantity;
                  if (loc.quantity < 10 && loc.quantity > 0) lowStockCount++;
                });
              });
            });
          });
        });
      });

      return {
        id: warehouse.id,
        name: warehouse.name,
        location: warehouse.address || "Unknown",
        totalUnits,
        lowStock: lowStockCount,
      };
    });

    // Get sellers for filter dropdown
    const sellers = await prisma.userProfile.findMany({
      where: { 
        role: "SELLER",
        verificationStatus: "VERIFIED",
        deletedAt: null,
      },
      select: { id: true, brandName: true, legalBusinessName: true },
      take: 100,
    });

    // Calculate inventory value
    const inventoryValue = await prisma.productLocation.findMany({
      include: {
        productVariant: {
          select: { price: true },
        },
      },
    });

    const totalInventoryValue = inventoryValue.reduce((sum, loc) => {
      return sum + (loc.quantity * (loc.productVariant?.price || 0));
    }, 0);

    // Get out of stock count
    const outOfStockCount = await prisma.productLocation.count({
      where: { quantity: 0 },
    });

    return {
      totalSKUs: inventoryMovement,
      totalUnits: warehouseOverview.reduce((sum, w) => sum + w.totalUnits, 0),
      lowStockItems: lowStockAlerts.length,
      outOfStockItems: outOfStockCount,
      totalInventoryValue,
      warehouses: warehouseOverview,
      sellers: sellers.map((s: { id: string; brandName: string | null; legalBusinessName: string | null }) => ({ id: s.id, name: s.brandName || s.legalBusinessName || "Unknown" })),
      alerts: lowStockAlerts.map(alert => ({
        productName: alert.productVariant?.product?.name || "Unknown",
        sku: alert.productVariant?.sku || "N/A",
        sellerId: alert.productVariant?.product?.sellerId || null,
        warehouse: alert.bin?.shelf?.rack?.area?.floorPlan?.warehouse?.name || "Unknown",
        warehouseId: alert.bin?.shelf?.rack?.area?.floorPlan?.warehouse?.id || null,
        currentStock: alert.quantity,
        threshold: 10,
        status: alert.quantity === 0 ? "out" : alert.quantity < 5 ? "critical" : "low",
        binLocation: alert.bin 
          ? `${alert.bin.shelf?.rack?.area?.name || "Area"} > R${alert.bin.shelf?.rack?.number || "?"} > L${alert.bin.shelf?.level || "?"} > ${alert.bin.code}`
          : "Unknown",
      })),
    };
  }),
});
