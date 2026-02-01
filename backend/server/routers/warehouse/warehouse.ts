
import { z } from "zod";
import { router, protectedProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Helper function to get user profile ID
async function getUserProfileId(userId: string): Promise<string> {
  const userProfile = await prisma.userProfile.findUnique({
    where: { userId },
    select: { id: true }
  });

  if (!userProfile) {
    throw new TRPCError({
      code: 'NOT_FOUND',
      message: 'User profile not found',
    });
  }

  return userProfile.id;
}

// Validation schemas
const createWarehouseSchema = z.object({
  name: z.string().min(1, "Name is required"),
  code: z.string().min(1, "Code is required").max(10, "Code must be 10 characters or less"),
  pincode: z.string().min(6, "Valid pincode required").max(6),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  shippingLocationId: z.string().min(1, "Shipping location is required"),
});

const createFloorPlanSchema = z.object({
  warehouseId: z.string().min(1),
  floor: z.string().min(1, "Floor is required"),
});

const createAreaSchema = z.object({
  floorPlanId: z.string().min(1),
  code: z.string().min(1, "Area code is required"),
  name: z.string().min(1, "Area name is required"),
});

const createRackSchema = z.object({
  areaId: z.string().min(1),
  number: z.string().min(1, "Rack number is required"),
});

const createShelfSchema = z.object({
  rackId: z.string().min(1),
  level: z.number().int().positive("Shelf level must be positive"),
});

const createBinSchema = z.object({
  shelfId: z.string().min(1),
  code: z.string().min(1, "Bin code is required"),
});

// Utility function to generate location code
function generateLocationCode(
  floor: string,
  areaCode: string,
  rackNumber: string,
  shelfLevel: number,
  binCode: string
): string {
  return `${floor}-${areaCode}-${rackNumber.padStart(3, '0')}-${shelfLevel.toString().padStart(2, '0')}-${binCode}`;
}

export const warehouseRouter = router({
  // Get all warehouses for the current seller
  list: protectedProcedure.query(async ({ ctx }) => {
    const sellerProfileId = await getUserProfileId(ctx.session.userId);

    const warehouses = await prisma.warehouse.findMany({
      where: {
        sellerId: sellerProfileId,
        deletedAt: null,
      },
      include: {
        shippingLocation: true,
        _count: {
          select: {
            floorPlans: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return warehouses;
  }),

  // Get warehouse by ID with full hierarchy
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const sellerProfileId = await getUserProfileId(ctx.session.userId);

      const warehouse = await prisma.warehouse.findFirst({
        where: {
          id: input.id,
          sellerId: sellerProfileId,
          deletedAt: null,
        },
        include: {
          shippingLocation: true,
          floorPlans: {
            where: { deletedAt: null },
            include: {
              areas: {
                include: {
                  racks: {
                    include: {
                      shelves: {
                        include: {
                          bins: {
                            include: {
                              _count: {
                                select: {
                                  productLocations: true,
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
            orderBy: { floor: 'asc' },
          },
        },
      });

      if (!warehouse) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Warehouse not found',
        });
      }

      return warehouse;
    }),

  // Create new warehouse
  create: protectedProcedure
    .input(createWarehouseSchema)
    .mutation(async ({ input, ctx }) => {
      const sellerProfileId = await getUserProfileId(ctx.session.userId);

      // Check if code is unique for this seller
      const existingWarehouse = await prisma.warehouse.findFirst({
        where: {
          code: input.code,
          sellerId: sellerProfileId,
          deletedAt: null,
        },
      });

      if (existingWarehouse) {
        throw new TRPCError({
          code: 'CONFLICT',
          message: 'Warehouse code already exists',
        });
      }

      // Verify shipping location belongs to seller
      const shippingLocation = await prisma.shippingLocation.findFirst({
        where: {
          id: input.shippingLocationId,
          sellerId: sellerProfileId,
          deletedAt: null,
        },
      });

      if (!shippingLocation) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Shipping location not found',
        });
      }

      const warehouse = await prisma.warehouse.create({
        data: {
          ...input,
          sellerId: sellerProfileId,
          address: shippingLocation.address,
        },
        include: {
          shippingLocation: true,
        },
      });

      return warehouse;
    }),

  // Update warehouse
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: createWarehouseSchema.partial(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const sellerProfileId = await getUserProfileId(ctx.session.userId);

      const warehouse = await prisma.warehouse.findFirst({
        where: {
          id: input.id,
          sellerId: sellerProfileId,
          deletedAt: null,
        },
      });

      if (!warehouse) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Warehouse not found',
        });
      }

      // Check code uniqueness if code is being updated
      if (input.data.code && input.data.code !== warehouse.code) {
        const existingWarehouse = await prisma.warehouse.findFirst({
          where: {
            code: input.data.code,
            sellerId: sellerProfileId,
            deletedAt: null,
            NOT: {
              id: input.id,
            },
          },
        });

        if (existingWarehouse) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Warehouse code already exists',
          });
        }
      }

      const updatedWarehouse = await prisma.warehouse.update({
        where: { id: input.id },
        data: input.data,
        include: {
          shippingLocation: true,
        },
      });

      return updatedWarehouse;
    }),

  // Delete warehouse (soft delete)
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const sellerProfileId = await getUserProfileId(ctx.session.userId);

      const warehouse = await prisma.warehouse.findFirst({
        where: {
          id: input.id,
          sellerId: sellerProfileId,
          deletedAt: null,
        },
      });

      if (!warehouse) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Warehouse not found',
        });
      }

      await prisma.warehouse.update({
        where: { id: input.id },
        data: { deletedAt: new Date() },
      });

      return { success: true };
    }),

  // Floor Plan Management
  floorPlan: router({
    create: protectedProcedure
      .input(createFloorPlanSchema)
      .mutation(async ({ input, ctx }) => {
        const sellerProfileId = await getUserProfileId(ctx.session.userId);

        // Verify warehouse ownership
        const warehouse = await prisma.warehouse.findFirst({
          where: {
            id: input.warehouseId,
            sellerId: sellerProfileId,
            deletedAt: null,
          },
        });

        if (!warehouse) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Warehouse not found',
          });
        }

        // Check if floor already exists
        const existingFloor = await prisma.warehouseFloorPlan.findFirst({
          where: {
            warehouseId: input.warehouseId,
            floor: input.floor,
            deletedAt: null,
          },
        });

        if (existingFloor) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: 'Floor already exists',
          });
        }

        const floorPlan = await prisma.warehouseFloorPlan.create({
          data: input,
          include: {
            areas: true,
          },
        });

        return floorPlan;
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const sellerProfileId = await getUserProfileId(ctx.session.userId);

        const floorPlan = await prisma.warehouseFloorPlan.findFirst({
          where: {
            id: input.id,
            warehouse: {
              sellerId: sellerProfileId,
            },
            deletedAt: null,
          },
        });

        if (!floorPlan) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Floor plan not found',
          });
        }

        await prisma.warehouseFloorPlan.update({
          where: { id: input.id },
          data: { deletedAt: new Date() },
        });

        return { success: true };
      }),
  }),

  // Area Management
  area: router({
    create: protectedProcedure
      .input(createAreaSchema)
      .mutation(async ({ input, ctx }) => {
        const sellerProfileId = await getUserProfileId(ctx.session.userId);

        // Verify floor plan ownership
        const floorPlan = await prisma.warehouseFloorPlan.findFirst({
          where: {
            id: input.floorPlanId,
            warehouse: {
              sellerId: sellerProfileId,
            },
            deletedAt: null,
          },
        });

        if (!floorPlan) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Floor plan not found',
          });
        }

        const area = await prisma.warehouseArea.create({
          data: input,
          include: {
            racks: true,
          },
        });

        return area;
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const sellerProfileId = await getUserProfileId(ctx.session.userId);

        const area = await prisma.warehouseArea.findFirst({
          where: {
            id: input.id,
            floorPlan: {
              warehouse: {
                sellerId: sellerProfileId,
              },
            },
          },
        });

        if (!area) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Area not found',
          });
        }

        await prisma.warehouseArea.delete({
          where: { id: input.id },
        });

        return { success: true };
      }),
  }),

  // Rack Management
  rack: router({
    create: protectedProcedure
      .input(createRackSchema)
      .mutation(async ({ input, ctx }) => {
        const sellerProfileId = await getUserProfileId(ctx.session.userId);

        const area = await prisma.warehouseArea.findFirst({
          where: {
            id: input.areaId,
            floorPlan: {
              warehouse: {
                sellerId: sellerProfileId,
              },
            },
          },
        });

        if (!area) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Area not found',
          });
        }

        const rack = await prisma.warehouseRack.create({
          data: input,
          include: {
            shelves: true,
          },
        });

        return rack;
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const sellerProfileId = await getUserProfileId(ctx.session.userId);

        const rack = await prisma.warehouseRack.findFirst({
          where: {
            id: input.id,
            area: {
              floorPlan: {
                warehouse: {
                  sellerId: sellerProfileId,
                },
              },
            },
          },
        });

        if (!rack) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Rack not found',
          });
        }

        await prisma.warehouseRack.delete({
          where: { id: input.id },
        });

        return { success: true };
      }),
  }),

  // Shelf Management
  shelf: router({
    create: protectedProcedure
      .input(createShelfSchema)
      .mutation(async ({ input, ctx }) => {
        const sellerProfileId = await getUserProfileId(ctx.session.userId);

        const rack = await prisma.warehouseRack.findFirst({
          where: {
            id: input.rackId,
            area: {
              floorPlan: {
                warehouse: {
                  sellerId: sellerProfileId,
                },
              },
            },
          },
        });

        if (!rack) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Rack not found',
          });
        }

        const shelf = await prisma.warehouseShelf.create({
          data: input,
          include: {
            bins: true,
          },
        });

        return shelf;
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const sellerProfileId = await getUserProfileId(ctx.session.userId);

        const shelf = await prisma.warehouseShelf.findFirst({
          where: {
            id: input.id,
            rack: {
              area: {
                floorPlan: {
                  warehouse: {
                    sellerId: sellerProfileId,
                  },
                },
              },
            },
          },
        });

        if (!shelf) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Shelf not found',
          });
        }

        await prisma.warehouseShelf.delete({
          where: { id: input.id },
        });

        return { success: true };
      }),
  }),

  // Bin Management
  bin: router({
    create: protectedProcedure
      .input(createBinSchema)
      .mutation(async ({ input, ctx }) => {
        const sellerProfileId = await getUserProfileId(ctx.session.userId);

        const shelf = await prisma.warehouseShelf.findFirst({
          where: {
            id: input.shelfId,
            rack: {
              area: {
                floorPlan: {
                  warehouse: {
                    sellerId: sellerProfileId,
                  },
                },
              },
            },
          },
          include: {
            rack: {
              include: {
                area: {
                  include: {
                    floorPlan: true,
                  },
                },
              },
            },
          },
        });

        if (!shelf) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Shelf not found',
          });
        }

        const bin = await prisma.warehouseBin.create({
          data: input,
          include: {
            shelf: {
              include: {
                rack: {
                  include: {
                    area: {
                      include: {
                        floorPlan: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });

        // Generate location code for reference
        const locationCode = generateLocationCode(
          bin.shelf.rack.area.floorPlan.floor,
          bin.shelf.rack.area.code,
          bin.shelf.rack.number,
          bin.shelf.level,
          bin.code
        );

        return {
          ...bin,
          locationCode,
        };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const sellerProfileId = await getUserProfileId(ctx.session.userId);

        const bin = await prisma.warehouseBin.findFirst({
          where: {
            id: input.id,
            shelf: {
              rack: {
                area: {
                  floorPlan: {
                    warehouse: {
                      sellerId: sellerProfileId,
                    },
                  },
                },
              },
            },
          },
        });

        if (!bin) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Bin not found',
          });
        }

        await prisma.warehouseBin.delete({
          where: { id: input.id },
        });

        return { success: true };
      }),

    // Get location code for a bin
    getLocationCode: protectedProcedure
      .input(z.object({ binId: z.string() }))
      .query(async ({ input, ctx }) => {
        const sellerProfileId = await getUserProfileId(ctx.session.userId);

        const bin = await prisma.warehouseBin.findFirst({
          where: {
            id: input.binId,
            shelf: {
              rack: {
                area: {
                  floorPlan: {
                    warehouse: {
                      sellerId: sellerProfileId,
                    },
                  },
                },
              },
            },
          },
          include: {
            shelf: {
              include: {
                rack: {
                  include: {
                    area: {
                      include: {
                        floorPlan: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });

        if (!bin) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Bin not found',
          });
        }

        const locationCode = generateLocationCode(
          bin.shelf.rack.area.floorPlan.floor,
          bin.shelf.rack.area.code,
          bin.shelf.rack.number,
          bin.shelf.level,
          bin.code
        );

        return { locationCode };
      }),
  }),

  // Get shipping locations for warehouse creation
  getShippingLocations: protectedProcedure.query(async ({ ctx }) => {
    const sellerProfileId = await getUserProfileId(ctx.session.userId);

    const allShippingLocations = await prisma.shippingLocation.findMany({
      where: {
        deletedAt: null,
        isActive: true,
      },
    });
    
    const shippingLocations = await prisma.shippingLocation.findMany({
      where: {
        sellerId: sellerProfileId,
        deletedAt: null,
        isActive: true,
      },
      orderBy: {
        businessName: 'asc',
      },
    });

    return shippingLocations;
  }),
}); 