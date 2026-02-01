import { initTRPC, TRPCError } from "@trpc/server";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import { auth } from "./auth";
import { fromNodeHeaders } from "better-auth/node";
import superjson from "superjson";

export const createContext = ({ req, res }: CreateExpressContextOptions) => ({
  req,
  res,
  auth: auth,
});

const t = initTRPC.context<typeof createContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(ctx.req.headers),
  });
  if (!session?.session?.token) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { session: session.session } });
});
