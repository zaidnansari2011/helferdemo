import { protectedProcedure, publicProcedure, router } from "../../trpc";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { userLogger } from "../../utils/logger";

const prisma = new PrismaClient();

// Helper function to ensure user has a profile
async function ensureUserProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      profile: true,
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
    userLogger.debug("Creating default customer profile for user:", userId);
    const profile = await prisma.userProfile.create({
      data: {
        userId: user.id,
        role: "CUSTOMER",
      },
    });
    
    user.profile = profile;
  }

  return user;
}


export const userRouter = router({
  getProfile: protectedProcedure.query(async ({ctx}) => {
    const user = await ensureUserProfile(ctx.session.userId);
    return {
      id: user?.id,
      name: user?.name,
      profile: user?.profile,
    };
  }),

  // Address management endpoints
  getAddresses: protectedProcedure.query(async ({ ctx }) => {
    const user = await ensureUserProfile(ctx.session.userId);
    
    const addresses = await prisma.address.findMany({
      where: {
        userId: user?.profile?.id,
        deletedAt: null,
      },
      orderBy: {
        isDefault: 'desc',
      },
    });
    return addresses;
  }),

  createAddress: protectedProcedure
    .input(z.object({
      title: z.string(),
      fullAddress: z.string(),
      landmark: z.string().optional(),
      pincode: z.string(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      receiverName: z.string().optional(),
      receiverPhone: z.string().optional(),
      isDefault: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = await ensureUserProfile(ctx.session.userId);
      
      // If setting as default, unset all other default addresses
      if (input.isDefault) {
        await prisma.address.updateMany({
          where: {
            userId: user?.profile?.id,
            deletedAt: null,
          },
          data: {
            isDefault: false,
          },
        });
      }

      const address = await prisma.address.create({
        data: {
          ...input,
          userId: user?.profile?.id!,
        },
      });
      return address;
    }),

  updateAddress: protectedProcedure
    .input(z.object({
      id: z.string(),
      title: z.string().optional(),
      fullAddress: z.string().optional(),
      landmark: z.string().optional(),
      pincode: z.string().optional(),
      latitude: z.number().optional(),
      longitude: z.number().optional(),
      receiverName: z.string().optional(),
      receiverPhone: z.string().optional(),
      isDefault: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = await ensureUserProfile(ctx.session.userId);
      const { id, ...updateData } = input;

      // If setting as default, unset all other default addresses
      if (input.isDefault) {
        await prisma.address.updateMany({
          where: {
            userId: user?.profile?.id!,
            deletedAt: null,
            id: { not: id },
          },
          data: {
            isDefault: false,
          },
        });
      }

      const address = await prisma.address.update({
        where: {
          id,
          userId: user?.profile?.id!,
        },
        data: updateData,
      });
      return address;
    }),

  deleteAddress: protectedProcedure
    .input(z.object({
      id: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = await ensureUserProfile(ctx.session.userId);
      
      await prisma.address.update({
        where: {
          id: input.id,
          userId: user?.profile?.id!,
        },
        data: {
          deletedAt: new Date(),
        },
      });
      return { success: true };
    }),
});