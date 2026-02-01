import { publicProcedure, router } from "../../trpc";
import { PrismaClient, Prisma } from "@prisma/client";
import { z } from "zod";
import { getAdminSettings, calculateDeliveryFee, validateMinimumOrder } from "../../utils/admin-settings";

const prisma = new PrismaClient();

export const productsRouter = router({
  // Get delivery configuration (for checkout screens)
  getDeliveryConfig: publicProcedure.query(async () => {
    const settings = await getAdminSettings();
    
    return {
      deliveryRadius: settings.deliveryRadius,
      minimumOrderAmount: settings.minimumOrderAmount,
      expressDeliveryFee: settings.expressDeliveryFee,
      standardDeliveryFee: settings.standardDeliveryFee,
      freeDeliveryThreshold: settings.freeDeliveryThreshold,
    };
  }),

  // Calculate delivery fee for an order
  calculateDeliveryFee: publicProcedure
    .input(z.object({
      orderAmount: z.number().min(0),
      isExpress: z.boolean().default(false),
    }))
    .query(async ({ input }) => {
      const fee = await calculateDeliveryFee(input.orderAmount, input.isExpress);
      const settings = await getAdminSettings();
      
      return {
        deliveryFee: fee,
        isFreeDelivery: fee === 0,
        freeDeliveryThreshold: settings.freeDeliveryThreshold,
        amountForFreeDelivery: Math.max(0, settings.freeDeliveryThreshold - input.orderAmount),
      };
    }),

  // Validate minimum order amount
  validateOrderAmount: publicProcedure
    .input(z.object({
      orderAmount: z.number().min(0),
    }))
    .query(async ({ input }) => {
      return await validateMinimumOrder(input.orderAmount);
    }),

  // Get all categories with hierarchical structure
  getCategories: publicProcedure.query(async () => {
    const categories = await prisma.category.findMany({
      where: {
        isActive: true,
        deletedAt: null,
      },
      orderBy: {
        sortOrder: 'asc',
      },
      include: {
        children: {
          where: {
            isActive: true,
            deletedAt: null,
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
        _count: {
          select: {
            products: {
              where: {
                isActive: true,
                deletedAt: null,
              },
            },
          },
        },
      },
    });
    return categories;
  }),

  // Get main categories only (no children)
  getMainCategories: publicProcedure.query(async () => {
    const categories = await prisma.category.findMany({
      where: {
        isActive: true,
        deletedAt: null,
        parentId: null,
      },
      orderBy: {
        sortOrder: 'asc',
      },
      include: {
        _count: {
          select: {
            products: {
              where: {
                isActive: true,
                deletedAt: null,
              },
            },
          },
        },
      },
    });
    return categories;
  }),

  // Get products by category with pagination
  getProductsByCategory: publicProcedure
    .input(z.object({
      categoryId: z.string(),
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(50).default(20),
      sortBy: z.enum(['name', 'price', 'createdAt']).default('name'),
      sortOrder: z.enum(['asc', 'desc']).default('asc'),
    }))
    .query(async ({ input }) => {
      const { categoryId, page, limit, sortBy, sortOrder } = input;
      const skip = (page - 1) * limit;

      // Get category and its subcategories
      const category = await prisma.category.findUnique({
        where: { id: categoryId },
        include: {
          children: {
            where: {
              isActive: true,
              deletedAt: null,
            },
          },
        },
      });

      if (!category) {
        throw new Error('Category not found');
      }

      // Include products from this category and all subcategories
      const categoryIds = [categoryId, ...category.children.map(child => child.id)];

      const orderBy = sortBy === 'price' ? { basePrice: sortOrder } : { [sortBy]: sortOrder };

      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where: {
            categoryId: { in: categoryIds },
            isActive: true,
            deletedAt: null,
          },
          include: {
            category: true,
            seller: {
              select: {
                id: true,
                brandName: true,
                user: {
                  select: {
                    name: true,
                  },
                },
              },
            },
            variants: {
              where: {
                isActive: true,
                deletedAt: null,
              },
              orderBy: {
                price: 'asc',
              },
            },
          },
          orderBy,
          skip,
          take: limit,
        }),
        prisma.product.count({
          where: {
            categoryId: { in: categoryIds },
            isActive: true,
            deletedAt: null,
          },
        }),
      ]);

      return {
        products: products.map(product => ({
          ...product,
          images: JSON.parse(product.images),
          lowestPrice: product.variants.length > 0 
            ? Math.min(...product.variants.map(v => v.price))
            : product.basePrice,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
        category,
      };
    }),

  // Get featured/bestseller products
  getFeaturedProducts: publicProcedure
    .input(z.object({
      type: z.enum(['bestsellers', 'featured', 'new']).default('bestsellers'),
      limit: z.number().min(1).max(20).default(10),
    }))
    .query(async ({ input }) => {
      const { type, limit } = input;

      let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' }; // Default for 'new'
      
      if (type === 'bestsellers') {
        // For now, we'll order by created date desc. 
        // In a real app, you'd track sales/orders to determine bestsellers
        orderBy = { createdAt: 'desc' };
      } else if (type === 'featured') {
        // For featured, you might have a featured flag or use other criteria
        orderBy = { basePrice: 'asc' };
      }

      const products = await prisma.product.findMany({
        where: {
          isActive: true,
          deletedAt: null,
        },
        include: {
          category: true,
          seller: {
            select: {
              id: true,
              brandName: true,
              user: {
                select: {
                  name: true,
                },
              },
            },
          },
          variants: {
            where: {
              isActive: true,
              deletedAt: null,
            },
            orderBy: {
              price: 'asc',
            },
          },
        },
        orderBy,
        take: limit,
      });

      return products.map(product => ({
        ...product,
        images: JSON.parse(product.images),
        lowestPrice: product.variants.length > 0 
          ? Math.min(...product.variants.map(v => v.price))
          : product.basePrice,
      }));
    }),

  // Search products
  searchProducts: publicProcedure
    .input(z.object({
      query: z.string().min(1),
      page: z.number().min(1).default(1),
      limit: z.number().min(1).max(50).default(20),
      categoryId: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const { query, page, limit, categoryId } = input;
      const skip = (page - 1) * limit;

      const whereCondition: Prisma.ProductWhereInput = {
        isActive: true,
        deletedAt: null,
        OR: [
          { name: { contains: query } },
          { description: { contains: query } },
          { brand: { contains: query } },
          { sku: { contains: query } },
        ],
        ...(categoryId && { categoryId }),
      };

      const [products, total] = await Promise.all([
        prisma.product.findMany({
          where: whereCondition,
          include: {
            category: true,
            seller: {
              select: {
                id: true,
                brandName: true,
                user: {
                  select: {
                    name: true,
                  },
                },
              },
            },
            variants: {
              where: {
                isActive: true,
                deletedAt: null,
              },
              orderBy: {
                price: 'asc',
              },
            },
          },
          orderBy: {
            name: 'asc',
          },
          skip,
          take: limit,
        }),
        prisma.product.count({
          where: whereCondition,
        }),
      ]);

      return {
        products: products.map(product => ({
          ...product,
          images: JSON.parse(product.images),
          lowestPrice: product.variants.length > 0 
            ? Math.min(...product.variants.map(v => v.price))
            : product.basePrice,
        })),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }),

  // Get single product by ID
  getProduct: publicProcedure
    .input(z.object({
      id: z.string(),
    }))
    .query(async ({ input }) => {
      const product = await prisma.product.findUnique({
        where: {
          id: input.id,
          isActive: true,
          deletedAt: null,
        },
        include: {
          category: {
            include: {
              parent: true,
            },
          },
          seller: {
            select: {
              id: true,
              brandName: true,
              user: {
                select: {
                  name: true,
                  email: true,
                },
              },
            },
          },
          variants: {
            where: {
              isActive: true,
              deletedAt: null,
            },
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
            orderBy: {
              price: 'asc',
            },
          },
        },
      });

      if (!product) {
        throw new Error('Product not found');
      }

      return {
        ...product,
        images: JSON.parse(product.images) as string[],
        variants: product.variants.map(variant => ({
          ...variant,
          attributes: JSON.parse(variant.attributes || '{}'),
          totalStock: variant.productLocations.reduce((sum, loc) => sum + loc.quantity, 0),
        })),
      };
    }),

  // Get product variants by product ID
  getProductVariants: publicProcedure
    .input(z.object({
      productId: z.string(),
    }))
    .query(async ({ input }) => {
      const variants = await prisma.productVariant.findMany({
        where: {
          productId: input.productId,
          isActive: true,
          deletedAt: null,
        },
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
        orderBy: {
          price: 'asc',
        },
      });

      return variants.map(variant => ({
        ...variant,
        attributes: JSON.parse(variant.attributes || '{}'),
        totalStock: variant.productLocations.reduce((sum, loc) => sum + loc.quantity, 0),
        warehouses: variant.productLocations.map(loc => ({
          warehouse: loc.bin.shelf.rack.area.floorPlan.warehouse,
          bin: loc.bin,
          stock: loc.quantity,
        })),
      }));
    }),
});
