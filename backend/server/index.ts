import * as trpcExpress from "@trpc/server/adapters/express";
import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { appRouter } from "./routers/routes";
import { auth } from "./auth";
import { toNodeHandler } from "better-auth/node";
import { createContext } from "./trpc";
import { PORT, BASE_URL, IS_DEVELOPMENT } from "./config";
import { serverLogger } from "./utils/logger";
import prisma from "./db";

const app = express();

// Maintenance mode middleware
const maintenanceMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  // Skip maintenance check for:
  // 1. Auth routes (allow login/logout)
  // 2. Admin settings routes (allow admins to disable maintenance)
  // 3. Health checks
  const bypassPaths = [
    '/api/auth',
    '/health',
  ];
  
  const isAdminSettingsRoute = req.path.includes('/trpc/settings');
  const isBypassPath = bypassPaths.some(path => req.path.startsWith(path));
  
  if (isBypassPath || isAdminSettingsRoute) {
    return next();
  }
  
  try {
    const settings = await prisma.adminSettings.findUnique({
      where: { id: "global" },
      select: { maintenanceMode: true, maintenanceMessage: true },
    });
    
    if (settings?.maintenanceMode) {
      return res.status(503).json({
        error: "Service Unavailable",
        message: settings.maintenanceMessage || "We're currently performing maintenance. Please check back soon.",
        maintenance: true,
      });
    }
  } catch (error) {
    // If we can't check maintenance status, continue (fail open)
    serverLogger.error("Failed to check maintenance status:", error);
  }
  
  next();
};

// CORS configuration
const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) {
      return callback(null, true);
    }
    
    const allowedOrigins = IS_DEVELOPMENT
      ? [
          "http://localhost:3000",
          "http://localhost:3001",
          "http://localhost:8081",
          "http://192.168.0.103:8081",
          "http://192.168.0.103:3000",
          "http://192.168.0.103:3001",
          "http://192.168.0.103:4000",
          "http://192.168.56.1:3001",
        ]
      : ["https://helfer.in"];
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      serverLogger.warn(`CORS rejected origin: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));

// Health check endpoint (before maintenance middleware)
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Apply maintenance mode middleware
app.use(maintenanceMiddleware);

app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(
  "/trpc",
  trpcExpress.createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

app.listen(PORT, () => {
  serverLogger.info(`Server is running on port ${PORT}`);
  serverLogger.info(`Better Auth endpoints available at /api/auth/*`);
});
