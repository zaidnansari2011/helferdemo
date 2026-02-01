import { initTRPC, TRPCError } from "@trpc/server";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";
import { auth } from "./auth";
import { fromNodeHeaders } from "better-auth/node";
import superjson from "superjson";

// Support both Express and Next.js contexts
export const createContext = (
  opts: CreateExpressContextOptions | FetchCreateContextFnOptions
) => {
  if ('req' in opts && 'res' in opts) {
    // Express context
    return { req: opts.req, res: opts.res, auth };
  }
  // Next.js fetch context
  return { req: opts.req, auth };
};

const t = initTRPC.context<ReturnType<typeof createContext>>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  const headers = 'headers' in ctx.req ? ctx.req.headers : (ctx.req as any).headers;
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(headers),
  });
  if (!session?.session?.token) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { session: session.session } });
});
