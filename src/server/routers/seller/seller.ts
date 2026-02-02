import { publicProcedure, router, protectedProcedure } from "../../trpc";
import { PrismaClient, type User, type UserProfile } from "@prisma/client";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import type { GSTVerificationResponse } from "./types/GSTVerificationResponse";
import { s3Client } from "../../modules/s3/client";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { getGSTData } from "./helpers/GST";
import { sellerLogger } from "../../utils/logger";
import { shouldAutoApproveSeller } from "../../utils/admin-settings";

const prisma = new PrismaClient();

const BUCKET_NAME = process.env.S3_BUCKET;
const S3_ENDPOINT = process.env.S3_ENDPOINT;
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '';
const RAPIDAPI_HOST = 'gst-verification-api-get-profile-returns-data.p.rapidapi.com';

// Helper function to ensure user has a profile
async function ensureUserProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: {
        include: {
          warehouses: true,
          shippingLocations: true,
        },
      },
    },
  });

  if (!user) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "User not found.",
    });
  }

  // If user doesn't have a profile, create a default customer profile
  if (!user.profile) {
    sellerLogger.debug("Creating default customer profile for user:", userId);
    const profile = await prisma.userProfile.create({
      data: {
        userId: user.id,
        role: "CUSTOMER",
      },
      include: {
        warehouses: true,
        shippingLocations: true,
      },
    });

    user.profile = profile;
  }

  return user;
}

// Helper function to upload file to S3/R2 or return base64 in demo mode
async function uploadFileToS3(
  file: Buffer,
  fileName: string,
  contentType: string,
  folder: string = ""
): Promise<string> {
  const isDemoMode = process.env.DEMO_MODE === 'true';
  const isDevelopment = process.env.NODE_ENV !== 'production';
  
  // In demo mode or development without S3, return base64 data URL
  if (isDemoMode || (!s3Client && isDevelopment)) {
    sellerLogger.debug(`[DEMO/DEV MODE] Storing file as base64: ${fileName}`);
    // Convert buffer to base64 data URL
    const base64 = file.toString('base64');
    const dataUrl = `data:${contentType};base64,${base64}`;
    sellerLogger.debug(`[DEMO/DEV MODE] Created data URL (${dataUrl.length} chars)`);
    return dataUrl;
  }
  
  // Production mode - require S3 configuration
  if (!s3Client) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "S3 client not configured. Please set S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY environment variables.",
    });
  }

  const key = folder ? `${folder}/${fileName}` : fileName;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: file,
    ContentType: contentType,
  });

  try {
    await s3Client.send(command);

    // Generate the correct URL for Cloudflare R2
    if (S3_ENDPOINT) {
      // Check if we have a custom public domain for certain folders
      const publicDomain = process.env.R2_PUBLIC_DOMAIN;
      const isPublicFolder = folder === 'product-images';
      
      if (publicDomain && isPublicFolder) {
        // Use public domain for product images
        return `${publicDomain}/${key}`;
      } else {
        // For Cloudflare R2 with regular endpoint
        return `${S3_ENDPOINT}/${BUCKET_NAME}/${key}`;
      }
    } else {
      // Fallback to AWS S3 format
      return `https://${BUCKET_NAME}.s3.${process.env.S3_REGION || "ap-south-1"}.amazonaws.com/${key}`;
    }
  } catch (error) {
    sellerLogger.error("S3 upload error:", error);
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Failed to upload file to S3",
    });
  }
}

// Onboarding data schema
const createSellerSchema = z.object({
  businessDetails: z.object({
    topCategories: z.array(z.string()),
    retailChannel: z.string(),
    referenceLink: z.string(),
    totalMonthlySales: z.string(),
    socialChannel: z.string(),
    socialMediaLink: z.string(),
    userCount: z.string(),
    firstName: z.string(),
    surname: z.string(),
    officialEmail: z.string().email(),
    designation: z.string(),
    mobileNumber: z.string(),
    countryCode: z.string(),
    secondaryFirstName: z.string().optional(),
    secondarySurname: z.string().optional(),
  }),
  sellerDetails: z.object({
    gstNumber: z.string(),
  }),
  brandDetails: z.object({
    brandName: z.string(),
    manufacturerName: z.string(),
    trademarkNumber: z.string(),
    sellerAuthDocumentUrl: z.string(),
    trademarkAuthDocumentUrl: z.string(),
    brandLogoUrl: z.string(),
  }),
  bankDetails: z.object({
    bankAccountNumber: z.string(),
    confirmBankAccountNumber: z.string(),
    ifscCode: z.string(),
    bankType: z.string(),
  }),
  digitalSignature: z.object({
    signature: z.string(),
  }),
  shippingLocations: z.object({
    isMainAddress: z.boolean(),
    selectedAddressId: z.string(),
  }),
});

export const sellerRouter = router({
  // Verify seller access (for role-based routing protection)
  verifySellerAccess: protectedProcedure.query(async ({ ctx }) => {
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
      return {
        isSeller: false,
        role: null,
      };
    }

    // In demo mode, always return approved status
    const isDemoMode = process.env.DEMO_MODE === 'true';
    
    return {
      isSeller: userProfile.role === "SELLER",
      role: userProfile.role,
      profile: {
        ...userProfile,
        verificationStatus: isDemoMode ? "VERIFIED" : userProfile.verificationStatus,
      },
    };
  }),

  // Get seller dashboard data
  getDashboardData: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.userId;

    // Get user and ensure profile exists
    const user = await ensureUserProfile(userId);

    // Better debugging
    sellerLogger.debug("User found:", !!user);
    sellerLogger.debug("User profile found:", !!user?.profile);
    sellerLogger.debug("User profile role:", user?.profile?.role);

    if (user?.profile?.role !== "SELLER") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Access denied. Seller account required.",
      });
    }

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      profile: {
        id: user.profile.id,
        role: user.profile.role,
        onboardingStep: user.profile.onboardingStep,
        verificationStatus: user.profile.verificationStatus,
        brandName: user.profile.brandName,
        brandDescription: user.profile.brandDescription,
        approvedAt: user.profile.approvedAt,
        rejectedAt: user.profile.rejectedAt,
        rejectionReason: user.profile.rejectionReason,
      },
    };
  }),

  // Get seller statistics
  getSellerStats: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.userId;

    // Get user and ensure profile exists
    const user = await ensureUserProfile(userId);

    if (user?.profile?.role !== "SELLER") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Access denied. Seller account required.",
      });
    }

    const userProfile = user.profile;

    // Get product count
    const productCount = await prisma.product.count({
      where: {
        sellerId: userProfile.id,
        deletedAt: null,
        isActive: true,
      },
    });

    // Get total orders through products
    const totalOrders = await prisma.orderItem.count({
      where: {
        product: {
          sellerId: userProfile.id,
          deletedAt: null,
        },
        deletedAt: null,
      },
    });

    // Get total revenue
    const revenueResult = await prisma.orderItem.aggregate({
      where: {
        product: {
          sellerId: userProfile.id,
          deletedAt: null,
        },
        order: {
          paymentStatus: "COMPLETED",
        },
        deletedAt: null,
      },
      _sum: {
        totalPrice: true,
      },
    });

    // Get unique customers
    const uniqueCustomers = await prisma.order.findMany({
      where: {
        items: {
          some: {
            product: {
              sellerId: userProfile.id,
            },
          },
        },
        deletedAt: null,
      },
      select: {
        userId: true,
      },
      distinct: ["userId"],
    });

    return {
      totalProducts: productCount,
      totalOrders: totalOrders,
      totalRevenue: revenueResult._sum.totalPrice || 0,
      totalCustomers: uniqueCustomers.length,
    };
  }),

  // Upload file to S3
  uploadFile: publicProcedure
    .input(
      z.object({
        fileName: z.string(),
        fileType: z.string(),
        fileData: z.string(), // base64 encoded file data
        folder: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const isDemoMode = process.env.DEMO_MODE === 'true';
      
      // In production mode, require S3 bucket
      if (!isDemoMode && !BUCKET_NAME) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "S3 bucket not configured",
        });
      }

      try {
        // Convert base64 to buffer
        const buffer = Buffer.from(input.fileData, "base64");

        // Generate unique filename
        const timestamp = Date.now();
        const uniqueFileName = `${timestamp}-${input.fileName}`;

        // Upload to S3 or return base64 in demo mode
        const fileUrl = await uploadFileToS3(
          buffer,
          uniqueFileName,
          input.fileType,
          input.folder || "seller-documents"
        );

        return {
          success: true,
          fileUrl,
          fileName: uniqueFileName,
        };
      } catch (error) {
        console.error("File upload error:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to upload file",
        });
      }
    }),

  // GST verification with formatted address data
  getGST: publicProcedure
    .input(
      z.object({
        gstNumber: z.string(),
      })
    )
    .query(async ({ input }) => {
      try {
        const gstData = await getGSTData(input.gstNumber);
        return gstData;
      } catch (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to verify GST number",
        });
      }
    }),

  // Get seller orders (orders containing seller's products)
  getOrders: protectedProcedure
    .input(
      z.object({
        status: z.enum(["ALL", "PENDING", "CONFIRMED", "PICKING", "PICKED", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"]).optional().default("ALL"),
        page: z.number().min(1).optional().default(1),
        limit: z.number().min(1).max(50).optional().default(20),
        search: z.string().optional(),
        dateFrom: z.string().optional(),
        dateTo: z.string().optional(),
        sortBy: z.enum(["createdAt", "total", "orderNumber"]).optional().default("createdAt"),
        sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.userId;
      const user = await ensureUserProfile(userId);

      if (user?.profile?.role !== "SELLER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied. Seller account required.",
        });
      }

      const sellerId = user.profile.id;
      const { status, page, limit, search, dateFrom, dateTo, sortBy, sortOrder } = input;
      const skip = (page - 1) * limit;

      // Build the where clause for orders that contain seller's products
      const whereClause: any = {
        deletedAt: null,
        items: {
          some: {
            product: {
              sellerId: sellerId,
              deletedAt: null,
            },
          },
        },
      };

      // Status filter
      if (status && status !== "ALL") {
        whereClause.status = status;
      }

      // Search by order number
      if (search) {
        whereClause.orderNumber = {
          contains: search,
        };
      }

      // Date range filter
      if (dateFrom) {
        whereClause.createdAt = {
          ...whereClause.createdAt,
          gte: new Date(dateFrom),
        };
      }
      if (dateTo) {
        whereClause.createdAt = {
          ...whereClause.createdAt,
          lte: new Date(dateTo),
        };
      }

      // Get orders with related data
      const [orders, totalCount] = await Promise.all([
        prisma.order.findMany({
          where: whereClause,
          include: {
            user: {
              include: {
                user: {
                  select: {
                    name: true,
                    email: true,
                    phoneNumber: true,
                  },
                },
              },
            },
            address: true,
            warehouse: {
              select: {
                id: true,
                name: true,
                code: true,
              },
            },
            items: {
              where: {
                product: {
                  sellerId: sellerId,
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
                productVariant: {
                  select: {
                    id: true,
                    name: true,
                    sku: true,
                  },
                },
              },
            },
          },
          orderBy: {
            [sortBy]: sortOrder,
          },
          skip,
          take: limit,
        }),
        prisma.order.count({
          where: whereClause,
        }),
      ]);

      // Calculate seller-specific totals for each order
      const ordersWithSellerTotals = orders.map((order) => {
        const sellerItemsTotal = order.items.reduce(
          (sum, item) => sum + item.totalPrice,
          0
        );
        const sellerItemsCount = order.items.reduce(
          (sum, item) => sum + item.quantity,
          0
        );

        return {
          ...order,
          sellerItemsTotal,
          sellerItemsCount,
        };
      });

      return {
        orders: ordersWithSellerTotals,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit),
          hasMore: skip + orders.length < totalCount,
        },
      };
    }),

  // Get single order detail
  getOrderById: protectedProcedure
    .input(z.object({ orderId: z.string() }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.session.userId;
      const user = await ensureUserProfile(userId);

      if (user?.profile?.role !== "SELLER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied. Seller account required.",
        });
      }

      const sellerId = user.profile.id;

      const order = await prisma.order.findFirst({
        where: {
          id: input.orderId,
          deletedAt: null,
          items: {
            some: {
              product: {
                sellerId: sellerId,
              },
            },
          },
        },
        include: {
          user: {
            include: {
              user: {
                select: {
                  name: true,
                  email: true,
                  phoneNumber: true,
                },
              },
            },
          },
          address: true,
          warehouse: true,
          pickupHelper: {
            include: {
              user: {
                select: {
                  name: true,
                  phoneNumber: true,
                },
              },
            },
          },
          deliveryDriver: {
            include: {
              user: {
                select: {
                  name: true,
                  phoneNumber: true,
                },
              },
            },
          },
          items: {
            where: {
              product: {
                sellerId: sellerId,
              },
              deletedAt: null,
            },
            include: {
              product: {
                include: {
                  category: true,
                },
              },
              productVariant: true,
            },
          },
          tracking: {
            orderBy: {
              timestamp: "desc",
            },
          },
        },
      });

      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Order not found or you don't have access to it.",
        });
      }

      // Calculate seller-specific totals
      const sellerItemsTotal = order.items.reduce(
        (sum, item) => sum + item.totalPrice,
        0
      );
      const sellerItemsCount = order.items.reduce(
        (sum, item) => sum + item.quantity,
        0
      );

      return {
        ...order,
        sellerItemsTotal,
        sellerItemsCount,
      };
    }),

  // Add note to order
  addOrderNote: protectedProcedure
    .input(
      z.object({
        orderId: z.string(),
        note: z.string().min(1).max(500),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.session.userId;
      const user = await ensureUserProfile(userId);

      if (user?.profile?.role !== "SELLER") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Access denied. Seller account required.",
        });
      }

      const sellerId = user.profile.id;

      // Verify seller has access to this order
      const order = await prisma.order.findFirst({
        where: {
          id: input.orderId,
          deletedAt: null,
          items: {
            some: {
              product: {
                sellerId: sellerId,
              },
            },
          },
        },
      });

      if (!order) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Order not found or you don't have access to it.",
        });
      }

      // Append note to existing notes
      const existingNotes = order.notes ? `${order.notes}\n---\n` : "";
      const newNote = `[${new Date().toISOString()}] Seller: ${input.note}`;

      const updatedOrder = await prisma.order.update({
        where: { id: input.orderId },
        data: {
          notes: `${existingNotes}${newNote}`,
        },
      });

      return {
        success: true,
        notes: updatedOrder.notes,
      };
    }),

  // Get order status counts for dashboard/filters
  getOrderStatusCounts: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.userId;
    const user = await ensureUserProfile(userId);

    if (user?.profile?.role !== "SELLER") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Access denied. Seller account required.",
      });
    }

    const sellerId = user.profile.id;

    const statusCounts = await prisma.order.groupBy({
      by: ["status"],
      where: {
        deletedAt: null,
        items: {
          some: {
            product: {
              sellerId: sellerId,
            },
          },
        },
      },
      _count: {
        status: true,
      },
    });

    // Convert to a more usable format
    const counts: Record<string, number> = {
      ALL: 0,
      PENDING: 0,
      CONFIRMED: 0,
      PICKING: 0,
      PICKED: 0,
      OUT_FOR_DELIVERY: 0,
      DELIVERED: 0,
      CANCELLED: 0,
    };

    statusCounts.forEach((item) => {
      counts[item.status] = item._count.status;
      counts.ALL += item._count.status;
    });

    return counts;
  }),

  // Create seller account with onboarding data
  createSeller: protectedProcedure
    .input(createSellerSchema)
    .mutation(async ({ input, ctx }) => {
      sellerLogger.info('Creating seller account for user:', ctx.session.userId);
      sellerLogger.debug('Input data:', JSON.stringify(input, null, 2));

      try {
        sellerLogger.debug('Fetching GST data for:', input.sellerDetails.gstNumber);
        const gstData = await getGSTData(input.sellerDetails.gstNumber);
        sellerLogger.debug('GST data received:', gstData ? 'success' : 'null');
        
        if (!gstData) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid GST number or verification failed",
          });
        }

        sellerLogger.debug('Finding user...');
        const user = await prisma.user.findUnique({
          where: {
            id: ctx.session.userId,
          },
          include: {
            profile: true,
          },
        });
        
        if (!user) {
          sellerLogger.error('User not found:', ctx.session.userId);
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "User not found",
          });
        }
        sellerLogger.debug('User found, profile exists:', !!user.profile);

        // Check if GST number is already used by another profile
        const existingGSTProfile = await prisma.userProfile.findFirst({
          where: {
            gstNumber: input.sellerDetails.gstNumber,
            NOT: {
              userId: ctx.session.userId,
            },
          },
        });

        if (existingGSTProfile) {
          sellerLogger.error('GST number already registered by another user');
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "This GST number is already registered with another seller account",
          });
        }

        // Update user name and email
        sellerLogger.debug('Updating user name and email...');
        await prisma.user.update({
          where: {
            id: ctx.session.userId,
          },
          data: {
            name: `${input.businessDetails.firstName} ${input.businessDetails.surname}`,
            email: input.businessDetails.officialEmail,
          },
        });

        // Check if profile exists, update or create accordingly
        const profileData = {
          role: "SELLER" as const,

          // Business Details
          businessCategories: JSON.stringify(
            input.businessDetails.topCategories
          ),
          retailChannels: JSON.stringify({
            type: input.businessDetails.retailChannel,
            link: input.businessDetails.referenceLink,
          }),
          socialChannels: JSON.stringify({
            platform: input.businessDetails.socialChannel,
            link: input.businessDetails.socialMediaLink,
          }),
          monthlySales: input.businessDetails.totalMonthlySales,
          designation: input.businessDetails.designation,

          // GST & Legal Details
          gstNumber: input.sellerDetails.gstNumber,
          gstVerificationStatus: "VERIFIED" as const,

          // Brand Details
          brandName: input.brandDetails.brandName,
          brandDescription: input.brandDetails.manufacturerName,
          manufacturerName: input.brandDetails.manufacturerName,
          trademarkNumber: input.brandDetails.trademarkNumber,
          trademarkAuthDocumentUrl: input.brandDetails.trademarkAuthDocumentUrl,
          sellerAuthDocumentUrl: input.brandDetails.sellerAuthDocumentUrl,
          brandLogoUrl: input.brandDetails.brandLogoUrl,

          // Primary Contact
          firstName: input.businessDetails.firstName,
          surname: input.businessDetails.surname,
          officialEmail: input.businessDetails.officialEmail,
          mobileNumber: input.businessDetails.mobileNumber,
          countryCode: input.businessDetails.countryCode,

          // Secondary Contact
          secondaryFirstName: input.businessDetails.secondaryFirstName,
          secondarySurname: input.businessDetails.secondarySurname,

          // Bank Details
          bankAccountNumber: input.bankDetails.bankAccountNumber,
          bankAccountConfirm: input.bankDetails.confirmBankAccountNumber,
          ifscCode: input.bankDetails.ifscCode,
          bankType: input.bankDetails.bankType,
          bankVerificationStatus: "PENDING" as const,

          // Digital Signature
          digitalSignature: input.digitalSignature.signature,
          signatureDate: new Date(),

          // Onboarding Progress
          onboardingStep: "COMPLETED" as const,
          verificationStatus: "PENDING" as "PENDING" | "VERIFIED" | "IN_PROGRESS" | "REJECTED",
          approvedAt: null as Date | null,
        };

        // Check if auto-approve is enabled (either from settings or demo mode)
        const autoApprove = await shouldAutoApproveSeller() || process.env.DEMO_MODE === 'true';
        if (autoApprove) {
          profileData.verificationStatus = "VERIFIED";
          profileData.approvedAt = new Date();
          sellerLogger.debug('Auto-approve enabled (settings or demo mode), setting status to VERIFIED');
        }

        sellerLogger.debug('Profile data prepared, creating/updating profile...');

        let userProfile;
        if (user.profile) {
          // Update existing profile
          sellerLogger.debug('Updating existing profile:', user.profile.id);
          userProfile = await prisma.userProfile.update({
            where: {
              id: user.profile.id,
            },
            data: profileData,
          });
          sellerLogger.debug('Profile updated successfully');
        } else {
          // Create new profile
          sellerLogger.debug('Creating new profile for user:', ctx.session.userId);
          userProfile = await prisma.userProfile.create({
            data: {
              userId: ctx.session.userId,
              ...profileData,
            },
          });
          sellerLogger.debug('Profile created successfully:', userProfile.id);
        }

        // Delete existing shipping locations for this seller
        if (user.profile) {
          sellerLogger.debug('Deleting existing shipping locations...');
          await prisma.shippingLocation.deleteMany({
            where: {
              sellerId: user.profile.id,
            },
          });
        }

        // Find the selected address from GST data
        const selectedAddress = gstData.addresses.find(
          (addr) => addr.id === input.shippingLocations.selectedAddressId
        );
        
        sellerLogger.debug('Selected address ID:', input.shippingLocations.selectedAddressId);
        sellerLogger.debug('Available addresses:', gstData.addresses.map(a => a.id));
        sellerLogger.debug('Selected address found:', selectedAddress ? 'yes' : 'no');

        // Create shipping location
        sellerLogger.debug('Creating shipping location...');
        await prisma.shippingLocation.create({
          data: {
            id: crypto.randomUUID(),
            sellerId: userProfile.id,
            businessName: input.brandDetails.brandName,
            gstNumber: input.sellerDetails.gstNumber,
            address: selectedAddress?.formattedAddress || "Default Address",
            pincode: selectedAddress?.pincode || "000000",
            state: selectedAddress?.state || "Unknown",
            isDefault: true,
          },
        });
        sellerLogger.debug('Shipping location created successfully');

        sellerLogger.info('Seller account created successfully for user:', ctx.session.userId);
        return {
          success: true,
          userId: ctx.session.userId,
          userProfileId: userProfile.id,
          message: "Seller account created successfully",
        };
      } catch (error: any) {
        sellerLogger.error("Error creating seller:", error);
        sellerLogger.error("Error message:", error?.message);
        sellerLogger.error("Error code:", error?.code);
        sellerLogger.error("Error stack:", error?.stack);
        
        // If it's already a TRPCError, rethrow it directly
        if (error instanceof TRPCError) {
          throw error;
        }
        
        // For Prisma errors, provide more context
        if (error?.code) {
          sellerLogger.error("Prisma error code:", error.code);
          if (error.code === 'P2002') {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `A unique constraint was violated: ${error.meta?.target || 'unknown field'}`,
            });
          }
          if (error.code === 'P2003') {
            throw new TRPCError({
              code: "BAD_REQUEST",
              message: `Foreign key constraint failed: ${error.meta?.field_name || 'unknown field'}`,
            });
          }
        }
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error?.message || "Failed to create seller account",
        });
      }
    }),

  // Get seller account data for account page
  getAccountData: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.userId;

    const user = await ensureUserProfile(userId);

    if (user?.profile?.role !== "SELLER") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Access denied. Seller account required.",
      });
    }

    const profile = user.profile;
    const shippingLocation = await prisma.shippingLocation.findFirst({
      where: {
        sellerId: profile.id,
        isDefault: true,
      },
    });

    return {
      businessName: profile.brandName || "N/A",
      businessType: "Partnership", // Could be stored in profile if needed
      gstNumber: profile.gstNumber || "N/A",
      businessEmail: profile.officialEmail || user.email,
      businessPhone: profile.mobileNumber || user.phoneNumber || "N/A",
      
      primaryContact: {
        firstName: profile.firstName || "N/A",
        surname: profile.surname || "N/A",
        designation: profile.designation || "N/A",
        phoneNumber: profile.mobileNumber || "N/A",
        email: profile.officialEmail || user.email,
      },
      
      secondaryContact: profile.secondaryFirstName ? {
        firstName: profile.secondaryFirstName,
        surname: profile.secondarySurname || "",
        designation: "Secondary Contact",
        phoneNumber: profile.secondaryMobileNumber || "N/A",
        email: profile.secondaryEmail || "N/A",
      } : null,
      
      registeredAddress: shippingLocation ? {
        line1: shippingLocation.address,
        line2: "",
        city: "",
        state: shippingLocation.state,
        pincode: shippingLocation.pincode,
        country: "India",
      } : null,
      
      bankDetails: {
        accountNumber: profile.bankAccountNumber || "N/A",
        ifscCode: profile.ifscCode || "N/A",
        bankName: "N/A", // Extract from IFSC if needed
        branchName: "N/A",
        bankType: profile.bankType || "N/A",
      },
      
      verificationStatus: profile.verificationStatus,
      onboardingDate: profile.approvedAt || user.createdAt,
      lastUpdated: user.updatedAt,
    };
  }),

  // Get seller profile settings
  getSettings: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.session.userId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: {
          include: {
            shippingLocations: true,
          },
        },
      },
    });

    if (!user || !user.profile) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Seller profile not found",
      });
    }

    const profile = user.profile;

    return {
      // Business Details
      businessDetails: {
        brandName: profile.brandName || "",
        brandDescription: profile.brandDescription || "",
        brandLogoUrl: profile.brandLogoUrl || profile.brandLogo || "",
        brandWebsite: profile.brandWebsite || "",
        businessCategories: profile.businessCategories ? JSON.parse(profile.businessCategories) : [],
        retailChannels: profile.retailChannels ? JSON.parse(profile.retailChannels) : { online: "", offline: "" },
        socialChannels: profile.socialChannels ? JSON.parse(profile.socialChannels) : { instagram: "", facebook: "" },
        monthlySales: profile.monthlySales || "",
        designation: profile.designation || "",
      },
      // GST Details
      gstDetails: {
        gstNumber: profile.gstNumber || "",
        legalBusinessName: profile.legalBusinessName || "",
        gstVerificationStatus: profile.gstVerificationStatus,
      },
      // Bank Details
      bankDetails: {
        bankAccountNumber: profile.bankAccountNumber || "",
        ifscCode: profile.ifscCode || "",
        bankType: profile.bankType || "",
        bankVerificationStatus: profile.bankVerificationStatus,
      },
      // Shipping Locations
      shippingLocations: profile.shippingLocations.map((loc) => ({
        id: loc.id,
        businessName: loc.businessName,
        address: loc.address,
        pincode: loc.pincode,
        state: loc.state,
        isDefault: loc.isDefault,
      })),
      // Account Details
      accountDetails: {
        email: user.email,
        phone: user.phoneNumber || "",
        name: user.name,
        verificationStatus: profile.verificationStatus,
        approvedAt: profile.approvedAt,
      },
    };
  }),

  // Update business details
  updateBusinessDetails: protectedProcedure
    .input(
      z.object({
        brandName: z.string().min(1, "Brand name is required"),
        brandDescription: z.string().optional(),
        brandWebsite: z.string().url().optional().or(z.literal("")),
        socialChannels: z.object({
          instagram: z.string().optional(),
          facebook: z.string().optional(),
        }).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.userId;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true },
      });

      if (!user?.profile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Seller profile not found",
        });
      }

      await prisma.userProfile.update({
        where: { id: user.profile.id },
        data: {
          brandName: input.brandName,
          brandDescription: input.brandDescription || null,
          brandWebsite: input.brandWebsite || null,
          socialChannels: input.socialChannels ? JSON.stringify(input.socialChannels) : null,
        },
      });

      return { success: true, message: "Business details updated successfully" };
    }),

  // Update bank details
  updateBankDetails: protectedProcedure
    .input(
      z.object({
        bankAccountNumber: z.string().min(9, "Invalid account number"),
        confirmBankAccountNumber: z.string(),
        ifscCode: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC code"),
        bankType: z.enum(["SAVINGS", "CURRENT"]),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (input.bankAccountNumber !== input.confirmBankAccountNumber) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Bank account numbers do not match",
        });
      }

      const userId = ctx.session.userId;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true },
      });

      if (!user?.profile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Seller profile not found",
        });
      }

      await prisma.userProfile.update({
        where: { id: user.profile.id },
        data: {
          bankAccountNumber: input.bankAccountNumber,
          bankAccountConfirm: input.confirmBankAccountNumber,
          ifscCode: input.ifscCode,
          bankType: input.bankType,
          bankVerificationStatus: "PENDING", // Reset verification on update
        },
      });

      return { success: true, message: "Bank details updated successfully" };
    }),

  // Upload brand logo
  updateBrandLogo: protectedProcedure
    .input(
      z.object({
        logoUrl: z.string().url(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.userId;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true },
      });

      if (!user?.profile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Seller profile not found",
        });
      }

      await prisma.userProfile.update({
        where: { id: user.profile.id },
        data: {
          brandLogoUrl: input.logoUrl,
          brandLogo: input.logoUrl,
        },
      });

      return { success: true, message: "Brand logo updated successfully" };
    }),

  // Add new shipping location
  addShippingLocation: protectedProcedure
    .input(
      z.object({
        businessName: z.string().min(1),
        address: z.string().min(1),
        pincode: z.string().length(6),
        state: z.string().min(1),
        isDefault: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.userId;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true },
      });

      if (!user?.profile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Seller profile not found",
        });
      }

      // If this is set as default, unset other defaults
      if (input.isDefault) {
        await prisma.shippingLocation.updateMany({
          where: { sellerId: user.profile.id },
          data: { isDefault: false },
        });
      }

      const location = await prisma.shippingLocation.create({
        data: {
          id: crypto.randomUUID(),
          sellerId: user.profile.id,
          businessName: input.businessName,
          gstNumber: user.profile.gstNumber || "",
          address: input.address,
          pincode: input.pincode,
          state: input.state,
          isDefault: input.isDefault || false,
        },
      });

      return { success: true, location };
    }),

  // Delete shipping location
  deleteShippingLocation: protectedProcedure
    .input(z.object({ locationId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.userId;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true },
      });

      if (!user?.profile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Seller profile not found",
        });
      }

      // Verify ownership
      const location = await prisma.shippingLocation.findFirst({
        where: {
          id: input.locationId,
          sellerId: user.profile.id,
        },
      });

      if (!location) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Shipping location not found",
        });
      }

      await prisma.shippingLocation.delete({
        where: { id: input.locationId },
      });

      return { success: true };
    }),

  // Set default shipping location
  setDefaultShippingLocation: protectedProcedure
    .input(z.object({ locationId: z.string() }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.session.userId;

      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true },
      });

      if (!user?.profile) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Seller profile not found",
        });
      }

      // Unset all defaults
      await prisma.shippingLocation.updateMany({
        where: { sellerId: user.profile.id },
        data: { isDefault: false },
      });

      // Set new default
      await prisma.shippingLocation.update({
        where: { id: input.locationId },
        data: { isDefault: true },
      });

      return { success: true };
    }),

  // GST Verification using RapidAPI
  verifyGSTIN: publicProcedure
    .input(z.object({
      GSTIN: z.string().length(15, "GST number must be 15 characters"),
    }))
    .mutation(async ({ input }) => {
      try {
        if (!RAPIDAPI_KEY) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "RapidAPI key not configured. Please set RAPIDAPI_KEY in environment variables.",
          });
        }

        const response = await fetch(
          `https://${RAPIDAPI_HOST}/v1/gstin/${input.GSTIN}/details`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'X-RapidAPI-Key': RAPIDAPI_KEY,
              'X-RapidAPI-Host': RAPIDAPI_HOST,
            },
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          sellerLogger.error("RapidAPI error:", errorText);
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid GST number or verification failed",
          });
        }

        const data = await response.json();
        
        // Log the full response for debugging
        sellerLogger.info("RapidAPI GST Response:", JSON.stringify(data, null, 2));

        // Extract the actual data - handle multiple response structures
        let gstInfo;
        if (Array.isArray(data)) {
          gstInfo = data[0];
        } else if (data.data && Array.isArray(data.data)) {
          gstInfo = data.data[0];
        } else if (data.data) {
          gstInfo = data.data;
        } else {
          gstInfo = data;
        }

        sellerLogger.info("Extracted GST Info:", JSON.stringify(gstInfo, null, 2));

        // Return the verified GST data with correct field names
        const principalAddress = gstInfo?.place_of_business_principal?.address;
        const formattedAddress = principalAddress 
          ? `${principalAddress.building_name || ''} ${principalAddress.street || ''}, ${principalAddress.location || ''}, ${principalAddress.district || ''}, ${principalAddress.state || ''} - ${principalAddress.pin_code || ''}`.trim()
          : '';

        return {
          success: true,
          data: {
            gstin: gstInfo?.gstin || input.GSTIN,
            legalName: gstInfo?.legal_name || 'N/A',
            tradeName: gstInfo?.trade_name || '',
            registrationDate: gstInfo?.registration_date || 'N/A',
            status: gstInfo?.status || 'N/A',
            businessType: gstInfo?.business_constitution || 'N/A',
            address: formattedAddress,
            addresses: formattedAddress ? [
              {
                id: 'principal',
                formattedAddress: `Principal Address: ${formattedAddress}`,
              }
            ] : [],
          },
        };
      } catch (error) {
        sellerLogger.error("Error verifying GSTIN:", error);
        
        if (error instanceof TRPCError) {
          throw error;
        }

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to verify GST number. Please try again.",
        });
      }
    }),
});
