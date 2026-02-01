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

// Helper function to generate SKU
function generateSKU(sellerId: string, productName: string): string {
  const sellerPrefix = sellerId.substring(0, 4).toUpperCase();
  const productPrefix = productName.substring(0, 3).toUpperCase();
  const timestamp = Date.now().toString().slice(-6);
  return `${sellerPrefix}-${productPrefix}-${timestamp}`;
}

// Helper function to generate product code (PRD-2026-00001)
async function generateProductCode(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `PRD-${year}-`;
  
  // Get the last product code for this year
  const lastProduct = await prisma.product.findFirst({
    where: {
      productCode: {
        startsWith: prefix,
      },
    },
    orderBy: {
      productCode: 'desc',
    },
    select: {
      productCode: true,
    },
  });

  let nextNumber = 1;
  if (lastProduct?.productCode) {
    const lastNumber = parseInt(lastProduct.productCode.split('-')[2], 10);
    if (!isNaN(lastNumber)) {
      nextNumber = lastNumber + 1;
    }
  }

  return `${prefix}${nextNumber.toString().padStart(5, '0')}`;
}

// Helper function to generate barcode
function generateBarcode(): string {
  // Generate 12-digit barcode for UPC-A format
  const digits = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10));
  return digits.join('');
}

// Enum values for validation
const unitOfMeasureValues = ['PIECE', 'KG', 'GRAM', 'LITER', 'ML', 'BOX', 'CARTON', 'PACK', 'DOZEN', 'METER', 'SQFT'] as const;
const coldChainValues = ['NONE', 'CHILLED', 'FROZEN', 'AMBIENT'] as const;
const hazardousTypeValues = ['NONE', 'FLAMMABLE', 'CORROSIVE', 'TOXIC', 'EXPLOSIVE', 'OXIDIZING', 'COMPRESSED_GAS', 'RADIOACTIVE', 'BIOHAZARD'] as const;
const productStatusValues = ['DRAFT', 'ACTIVE', 'OUT_OF_STOCK', 'DISCONTINUED'] as const;

// Validation schemas
const createProductSchema = z.object({
  // Basic Information
  name: z.string().min(1, "Name is required"),
  description: z.string().min(1, "Description is required"),
  brand: z.string().optional(),
  manufacturer: z.string().optional(),
  categoryId: z.string().min(1, "Category is required"),
  
  // Pricing & Tax
  basePrice: z.number().min(0, "Price must be positive"),
  taxInclusive: z.boolean().default(false),
  gstRate: z.number().min(0).max(28).default(0),
  cessPercentage: z.number().min(0).default(0),
  hsnCode: z.string().optional(),
  
  // Product Specifications
  unitOfMeasure: z.enum(unitOfMeasureValues).default('PIECE'),
  weight: z.number().positive().optional(),
  dimensions: z.object({
    length: z.number().positive().optional(),
    width: z.number().positive().optional(),
    height: z.number().positive().optional(),
    unit: z.enum(['cm', 'mm', 'in', 'm']).default('cm'),
  }).optional(),
  packagingType: z.string().optional(),
  itemsPerPackage: z.number().int().positive().default(1),
  
  // Regulatory & Compliance
  isHazardous: z.boolean().default(false),
  hazardousType: z.enum(hazardousTypeValues).default('NONE'),
  msdsDocument: z.string().url().optional().or(z.literal('')),
  certificates: z.array(z.string()).default([]),
  countryOfOrigin: z.string().default('India'),
  requiresBatchTracking: z.boolean().default(false),
  shelfLifeDays: z.number().int().positive().optional(),
  
  // Quick-Commerce Essentials
  coldChainRequired: z.enum(coldChainValues).default('NONE'),
  pickupInstructions: z.string().optional(),
  storageConditions: z.string().optional(),
  
  // Procurement Details
  minimumOrderQty: z.number().int().positive().default(1),
  leadTimeDays: z.number().int().min(0).default(0),
  manufacturerPartNumber: z.string().optional(),
  reorderLevel: z.number().int().min(0).default(10),
  
  // Additional Details
  warrantyMonths: z.number().int().min(0).default(0),
  isReturnable: z.boolean().default(true),
  returnWindowDays: z.number().int().positive().default(7),
  productDocuments: z.array(z.string()).default([]),
  
  // E-Invoice
  requiresEInvoice: z.boolean().default(true),
  
  // Media & Status
  images: z.array(z.string()).default([]),
  status: z.enum(productStatusValues).default('DRAFT'),
  
  // Warehouse association (optional)
  warehouseId: z.string().optional(),
});

const createVariantSchema = z.object({
  productId: z.string().min(1, "Product ID is required"),
  name: z.string().min(1, "Variant name is required"),
  price: z.number().min(0, "Price must be positive"),
  attributes: z.record(z.string(), z.string()).optional().default({}),
});

const updateProductSchema = createProductSchema.partial();
const updateVariantSchema = createVariantSchema.omit({ productId: true }).partial();

const assignLocationSchema = z.object({
  productId: z.string().optional(),
  productVariantId: z.string().optional(),
  binId: z.string().min(1, "Bin ID is required"),
  quantity: z.number().int().positive("Quantity must be positive"),
}).refine(
  (data) => data.productId || data.productVariantId,
  { message: "Either productId or productVariantId must be provided" }
).refine(
  (data) => !(data.productId && data.productVariantId),
  { message: "Only one of productId or productVariantId should be provided" }
);

const updateLocationSchema = z.object({
  id: z.string().min(1, "Location ID is required"),
  quantity: z.number().int().positive("Quantity must be positive"),
});

export const inventoryProductsRouter = router({
  // Get all products for the current seller
  list: protectedProcedure.query(async ({ ctx }) => {
    const sellerProfileId = await getUserProfileId(ctx.session.userId);

    const products = await prisma.product.findMany({
      where: {
        sellerId: sellerProfileId,
        deletedAt: null,
      },
      select: {
        id: true,
        productCode: true,
        name: true,
        sku: true,
        status: true,
        basePrice: true,
        images: true,
        createdAt: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            variants: {
              where: { deletedAt: null },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return products;
  }),

  // Get product by ID with full details
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ input, ctx }) => {
      const sellerProfileId = await getUserProfileId(ctx.session.userId);

      const product = await prisma.product.findFirst({
        where: {
          id: input.id,
          sellerId: sellerProfileId,
          deletedAt: null,
        },
        include: {
          category: true,
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
          variants: {
            where: { deletedAt: null },
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
            orderBy: { createdAt: 'asc' },
          },
        },
      });

      if (!product) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Product not found',
        });
      }

      return product;
    }),

  // Create new product
  create: protectedProcedure
    .input(createProductSchema)
    .mutation(async ({ input, ctx }) => {
      try {
        console.log('Create product mutation called with input:', JSON.stringify(input, null, 2));
        
        const sellerProfileId = await getUserProfileId(ctx.session.userId);
        console.log('Seller profile ID:', sellerProfileId);

        // Verify category exists
        const category = await prisma.category.findFirst({
          where: {
            id: input.categoryId,
            deletedAt: null,
          },
        });

        if (!category) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Category not found',
          });
        }
        console.log('Category found:', category.name);

        // Generate unique SKU and Product Code
        const sku = generateSKU(sellerProfileId, input.name);
        const productCode = await generateProductCode();
        const barcode = generateBarcode();
        
        console.log('Generated codes - SKU:', sku, 'ProductCode:', productCode, 'Barcode:', barcode);

        // Extract warehouse ID and prepare product data
        const { warehouseId: inputWarehouseId, dimensions, certificates, productDocuments, ...productData } = input;
        
        console.log('Creating product with data...');
        const product = await prisma.product.create({
          data: {
            ...productData,
            productCode,
            sku,
            barcode,
            sellerId: sellerProfileId,
            images: JSON.stringify(input.images),
            dimensions: dimensions ? JSON.stringify(dimensions) : null,
            certificates: JSON.stringify(certificates || []),
            productDocuments: JSON.stringify(productDocuments || []),
          },
          include: {
            category: true,
            _count: {
              select: {
                variants: true,
              },
            },
          },
        });

        console.log('Product created successfully:', product.id);
        return product;
      } catch (error) {
        console.error('Error creating product:', error);
        throw error;
      }
    }),

  // Update product
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: updateProductSchema,
      })
    )
    .mutation(async ({ input, ctx }) => {
      const sellerProfileId = await getUserProfileId(ctx.session.userId);

      const product = await prisma.product.findFirst({
        where: {
          id: input.id,
          sellerId: sellerProfileId,
          deletedAt: null,
        },
      });

      if (!product) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Product not found',
        });
      }

      // Verify category if being updated
      if (input.data.categoryId) {
        const category = await prisma.category.findFirst({
          where: {
            id: input.data.categoryId,
            deletedAt: null,
          },
        });

        if (!category) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Category not found',
          });
        }
      }

      const updateData: any = {};
      
      // Only include fields that are actually being updated
      if (input.data.name !== undefined) updateData.name = input.data.name;
      if (input.data.description !== undefined) updateData.description = input.data.description;
      if (input.data.brand !== undefined) updateData.brand = input.data.brand;
      if (input.data.basePrice !== undefined) updateData.basePrice = input.data.basePrice;
      if (input.data.categoryId !== undefined) updateData.categoryId = input.data.categoryId;
      if (input.data.images !== undefined) {
        updateData.images = JSON.stringify(input.data.images);
      }

      const updatedProduct = await prisma.product.update({
        where: { id: input.id },
        data: updateData,
        include: {
          category: true,
          _count: {
            select: {
              variants: true,
            },
          },
        },
      });

      return updatedProduct;
    }),

  // Delete product (soft delete)
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const sellerProfileId = await getUserProfileId(ctx.session.userId);

      const product = await prisma.product.findFirst({
        where: {
          id: input.id,
          sellerId: sellerProfileId,
          deletedAt: null,
        },
      });

      if (!product) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'Product not found',
        });
      }

      await prisma.product.update({
        where: { id: input.id },
        data: { deletedAt: new Date() },
      });

      return { success: true };
    }),

  // Variant management
  variants: router({
    // Create variant
    create: protectedProcedure
      .input(createVariantSchema)
      .mutation(async ({ input, ctx }) => {
        const sellerProfileId = await getUserProfileId(ctx.session.userId);

        // Verify product ownership
        const product = await prisma.product.findFirst({
          where: {
            id: input.productId,
            sellerId: sellerProfileId,
            deletedAt: null,
          },
        });

        if (!product) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Product not found',
          });
        }

        // Generate unique SKU and barcode
        const sku = generateSKU(sellerProfileId, `${product.name}-${input.name}`);
        const barcode = generateBarcode();

        const variant = await prisma.productVariant.create({
          data: {
            ...input,
            sku,
            barcode,
            attributes: JSON.stringify(input.attributes || {}),
          },
        });

        return variant;
      }),

    // Update variant
    update: protectedProcedure
      .input(
        z.object({
          id: z.string(),
          data: updateVariantSchema,
        })
      )
      .mutation(async ({ input, ctx }) => {
        const sellerProfileId = await getUserProfileId(ctx.session.userId);

        const variant = await prisma.productVariant.findFirst({
          where: {
            id: input.id,
            product: {
              sellerId: sellerProfileId,
            },
            deletedAt: null,
          },
        });

        if (!variant) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Variant not found',
          });
        }

        const updateData: any = {};
        
        // Only include fields that are actually being updated
        if (input.data.name !== undefined) updateData.name = input.data.name;
        if (input.data.price !== undefined) updateData.price = input.data.price;
        if (input.data.attributes !== undefined) {
          updateData.attributes = JSON.stringify(input.data.attributes);
        }

        const updatedVariant = await prisma.productVariant.update({
          where: { id: input.id },
          data: updateData,
        });

        return updatedVariant;
      }),

    // Delete variant (soft delete)
    delete: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const sellerProfileId = await getUserProfileId(ctx.session.userId);

        const variant = await prisma.productVariant.findFirst({
          where: {
            id: input.id,
            product: {
              sellerId: sellerProfileId,
            },
            deletedAt: null,
          },
        });

        if (!variant) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Variant not found',
          });
        }

        await prisma.productVariant.update({
          where: { id: input.id },
          data: { deletedAt: new Date() },
        });

        return { success: true };
      }),
  }),

  // Location management
  locations: router({
    // Assign product or variant to warehouse location
    assign: protectedProcedure
      .input(assignLocationSchema)
      .mutation(async ({ input, ctx }) => {
        const sellerProfileId = await getUserProfileId(ctx.session.userId);

        let productOwned = false;

        // Verify ownership based on what's being assigned
        if (input.productVariantId) {
          // Verify variant ownership
          const variant = await prisma.productVariant.findFirst({
            where: {
              id: input.productVariantId,
              product: {
                sellerId: sellerProfileId,
              },
              deletedAt: null,
            },
          });

          if (!variant) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Product variant not found',
            });
          }
          productOwned = true;
        } else if (input.productId) {
          // Verify product ownership
          const product = await prisma.product.findFirst({
            where: {
              id: input.productId,
              sellerId: sellerProfileId,
              deletedAt: null,
            },
          });

          if (!product) {
            throw new TRPCError({
              code: 'NOT_FOUND',
              message: 'Product not found',
            });
          }
          productOwned = true;
        }

        if (!productOwned) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Product or variant not found',
          });
        }

        // Verify bin ownership
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
        });

        if (!bin) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Warehouse bin not found',
          });
        }

        // Check if location already exists
        const existingLocation = input.productVariantId 
          ? await prisma.productLocation.findUnique({
              where: {
                productVariantId_binId: {
                  productVariantId: input.productVariantId,
                  binId: input.binId,
                },
              },
            })
          : await prisma.productLocation.findUnique({
              where: {
                productId_binId: {
                  productId: input.productId!,
                  binId: input.binId,
                },
              },
            });

        if (existingLocation) {
          throw new TRPCError({
            code: 'CONFLICT',
            message: input.productVariantId 
              ? 'Product variant is already assigned to this location'
              : 'Product is already assigned to this location',
          });
        }

        const location = await prisma.productLocation.create({
          data: input,
          include: {
            product: true,
            productVariant: true,
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
        });

        return location;
      }),

    // Update location quantity
    update: protectedProcedure
      .input(updateLocationSchema)
      .mutation(async ({ input, ctx }) => {
        const sellerProfileId = await getUserProfileId(ctx.session.userId);

        const location = await prisma.productLocation.findFirst({
          where: {
            id: input.id,
            OR: [
              {
                productVariant: {
                  product: {
                    sellerId: sellerProfileId,
                  },
                },
              },
              {
                product: {
                  sellerId: sellerProfileId,
                },
              },
            ],
            bin: {
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
          },
        });

        if (!location) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Product location not found',
          });
        }

        const updatedLocation = await prisma.productLocation.update({
          where: { id: input.id },
          data: { quantity: input.quantity },
          include: {
            product: true,
            productVariant: true,
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
        });

        return updatedLocation;
      }),

    // Remove product or variant from location
    remove: protectedProcedure
      .input(z.object({ id: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const sellerProfileId = await getUserProfileId(ctx.session.userId);

        const location = await prisma.productLocation.findFirst({
          where: {
            id: input.id,
            OR: [
              {
                productVariant: {
                  product: {
                    sellerId: sellerProfileId,
                  },
                },
              },
              {
                product: {
                  sellerId: sellerProfileId,
                },
              },
            ],
            bin: {
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
          },
        });

        if (!location) {
          throw new TRPCError({
            code: 'NOT_FOUND',
            message: 'Product location not found',
          });
        }

        await prisma.productLocation.delete({
          where: { id: input.id },
        });

        return { success: true };
      }),

    // Get available bins for a warehouse
    getAvailableBins: protectedProcedure
      .input(z.object({ warehouseId: z.string() }))
      .query(async ({ input, ctx }) => {
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

        const bins = await prisma.warehouseBin.findMany({
          where: {
            shelf: {
              rack: {
                area: {
                  floorPlan: {
                    warehouseId: input.warehouseId,
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
            _count: {
              select: {
                productLocations: true,
              },
            },
          },
          orderBy: [
            { shelf: { rack: { area: { floorPlan: { floor: 'asc' } } } } },
            { shelf: { rack: { area: { code: 'asc' } } } },
            { shelf: { rack: { number: 'asc' } } },
            { shelf: { level: 'asc' } },
            { code: 'asc' },
          ],
        });

        return bins.map(bin => ({
          ...bin,
          locationCode: `${bin.shelf.rack.area.floorPlan.floor}-${bin.shelf.rack.area.code}-${bin.shelf.rack.number.padStart(3, '0')}-${bin.shelf.level.toString().padStart(2, '0')}-${bin.code}`,
          fullPath: `${bin.shelf.rack.area.floorPlan.floor} > ${bin.shelf.rack.area.name} > Rack ${bin.shelf.rack.number} > Shelf ${bin.shelf.level} > Bin ${bin.code}`,
        }));
      }),
  }),

  // Get categories for product creation
  getCategories: protectedProcedure.query(async ({ ctx }) => {
    const categories = await prisma.category.findMany({
      where: {
        deletedAt: null,
        isActive: true,
      },
      include: {
        children: {
          where: {
            deletedAt: null,
            isActive: true,
          },
          orderBy: { name: 'asc' },
        },
      },
      orderBy: { name: 'asc' },
    });

    return categories;
  }),

  // Get warehouses for location assignment
  getWarehouses: protectedProcedure.query(async ({ ctx }) => {
    const sellerProfileId = await getUserProfileId(ctx.session.userId);

    const warehouses = await prisma.warehouse.findMany({
      where: {
        sellerId: sellerProfileId,
        deletedAt: null,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        code: true,
        address: true,
      },
      orderBy: {
        name: 'asc',
      },
    });

    return warehouses;
  }),
});
