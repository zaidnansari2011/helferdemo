import { z } from "zod";
import { router, protectedProcedure } from "../../trpc";
import { TRPCError } from "@trpc/server";
import { PrismaClient } from "@prisma/client";


const prisma = new PrismaClient();

export const inventoryRouter = router({
  
}); 