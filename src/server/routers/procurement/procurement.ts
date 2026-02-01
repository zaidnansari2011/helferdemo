/**
 * B2B Procurement Router
 * 
 * Handles all seller-side B2B procurement operations:
 * - Proforma Invoices (PIs): Create, update, send, track
 * - Purchase Orders (POs): View, acknowledge, fulfill
 * - Invoices: Generate, track payments
 * - Analytics: B2B-specific metrics
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, protectedProcedure } from "../../trpc";
import { prisma } from "../../db";
import { PIStatus, POStatus, InvoiceStatus } from "@prisma/client";

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Ensure user has seller access and return their profile
 */
async function ensureSellerProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { profile: true },
  });

  if (!user?.profile || user.profile.role !== "SELLER") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Seller access required",
    });
  }

  if (user.profile.verificationStatus !== "VERIFIED") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Seller account must be verified",
    });
  }

  return { user, profile: user.profile };
}

/**
 * Generate unique document numbers
 */
async function generateDocumentNumber(type: "PI" | "PO" | "INV"): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `${type}-${year}`;
  
  let count: number;
  
  if (type === "PI") {
    count = await prisma.proformaInvoice.count({
      where: { piNumber: { startsWith: prefix } },
    });
  } else if (type === "PO") {
    count = await prisma.purchaseOrder.count({
      where: { poNumber: { startsWith: prefix } },
    });
  } else {
    count = await prisma.invoice.count({
      where: { invoiceNumber: { startsWith: prefix } },
    });
  }
  
  return `${prefix}-${String(count + 1).padStart(5, "0")}`;
}

/**
 * Calculate PI/Invoice totals
 */
function calculateTotals(items: Array<{ quantity: number; unitPrice: number }>, taxRate: number, discount: number = 0) {
  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
  const taxAmount = (subtotal - discount) * (taxRate / 100);
  const total = subtotal - discount + taxAmount;
  
  return { subtotal, taxAmount, total };
}

/**
 * Get date range for analytics
 */
function getDateRange(period: string) {
  const now = new Date();
  let startDate: Date;
  
  switch (period) {
    case "7d":
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "30d":
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "90d":
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case "12m":
      startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      break;
    default:
      startDate = new Date(0); // All time
  }
  
  return { startDate, endDate: now };
}

// ============================================================================
// PROFORMA INVOICE (PI) PROCEDURES
// ============================================================================

const piRouter = router({
  /**
   * Get all PIs for the seller with pagination and filters
   */
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        status: z.nativeEnum(PIStatus).optional(),
        search: z.string().optional(),
        sortBy: z.enum(["createdAt", "total", "piNumber", "validUntil"]).default("createdAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { profile } = await ensureSellerProfile(ctx.session.userId);
      const { page = 1, limit = 20, status, search, sortBy = "createdAt", sortOrder = "desc" } = input || {};
      
      const where = {
        sellerId: profile.id,
        deletedAt: null,
        ...(status && { status }),
        ...(search && {
          OR: [
            { piNumber: { contains: search } },
            { notes: { contains: search } },
          ],
        }),
      };
      
      const [pis, total] = await Promise.all([
        prisma.proformaInvoice.findMany({
          where,
          include: {
            items: true,
            _count: { select: { purchaseOrders: true, invoices: true } },
          },
          orderBy: { [sortBy]: sortOrder },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.proformaInvoice.count({ where }),
      ]);
      
      return {
        data: pis,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }),

  /**
   * Get single PI by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { profile } = await ensureSellerProfile(ctx.session.userId);
      
      const pi = await prisma.proformaInvoice.findFirst({
        where: {
          id: input.id,
          sellerId: profile.id,
          deletedAt: null,
        },
        include: {
          items: true,
          purchaseOrders: {
            include: { items: true },
          },
          invoices: {
            include: { payments: true },
          },
        },
      });
      
      if (!pi) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Proforma Invoice not found" });
      }
      
      return pi;
    }),

  /**
   * Create new PI
   */
  create: protectedProcedure
    .input(
      z.object({
        validUntil: z.string().transform((s) => new Date(s)),
        creditTerms: z.enum(["IMMEDIATE", "NET_30", "NET_60", "NET_90"]).default("NET_30"),
        deliveryTerms: z.string().optional(),
        notes: z.string().optional(),
        taxRate: z.number().min(0).max(100).default(18),
        discount: z.number().min(0).default(0),
        items: z.array(
          z.object({
            productId: z.string(),
            variantId: z.string().optional(),
            description: z.string(),
            quantity: z.number().min(1),
            unitPrice: z.number().min(0),
          })
        ).min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { profile } = await ensureSellerProfile(ctx.session.userId);
      
      const piNumber = await generateDocumentNumber("PI");
      const { subtotal, taxAmount, total } = calculateTotals(input.items, input.taxRate, input.discount);
      
      const pi = await prisma.proformaInvoice.create({
        data: {
          piNumber,
          sellerId: profile.id,
          validUntil: input.validUntil,
          creditTerms: input.creditTerms,
          deliveryTerms: input.deliveryTerms,
          notes: input.notes,
          taxRate: input.taxRate,
          discount: input.discount,
          subtotal,
          taxAmount,
          total,
          items: {
            create: input.items.map((item) => ({
              productId: item.productId,
              variantId: item.variantId,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.quantity * item.unitPrice,
            })),
          },
        },
        include: { items: true },
      });
      
      return pi;
    }),

  /**
   * Update PI (only DRAFT status)
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        validUntil: z.string().transform((s) => new Date(s)).optional(),
        creditTerms: z.enum(["IMMEDIATE", "NET_30", "NET_60", "NET_90"]).optional(),
        deliveryTerms: z.string().optional(),
        notes: z.string().optional(),
        taxRate: z.number().min(0).max(100).optional(),
        discount: z.number().min(0).optional(),
        items: z.array(
          z.object({
            productId: z.string(),
            variantId: z.string().optional(),
            description: z.string(),
            quantity: z.number().min(1),
            unitPrice: z.number().min(0),
          })
        ).min(1).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { profile } = await ensureSellerProfile(ctx.session.userId);
      
      const existing = await prisma.proformaInvoice.findFirst({
        where: { id: input.id, sellerId: profile.id, deletedAt: null },
      });
      
      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Proforma Invoice not found" });
      }
      
      if (existing.status !== "DRAFT") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Can only edit PI in DRAFT status" });
      }
      
      // Calculate new totals if items are being updated
      let totals = {};
      if (input.items) {
        const taxRate = input.taxRate ?? existing.taxRate;
        const discount = input.discount ?? existing.discount;
        totals = calculateTotals(input.items, taxRate, discount);
      }
      
      // Update PI with transaction
      const pi = await prisma.$transaction(async (tx) => {
        // Delete existing items if new items provided
        if (input.items) {
          await tx.pIItem.deleteMany({ where: { piId: input.id } });
        }
        
        return tx.proformaInvoice.update({
          where: { id: input.id },
          data: {
            ...(input.validUntil && { validUntil: input.validUntil }),
            ...(input.creditTerms && { creditTerms: input.creditTerms }),
            ...(input.deliveryTerms !== undefined && { deliveryTerms: input.deliveryTerms }),
            ...(input.notes !== undefined && { notes: input.notes }),
            ...(input.taxRate !== undefined && { taxRate: input.taxRate }),
            ...(input.discount !== undefined && { discount: input.discount }),
            ...totals,
            ...(input.items && {
              items: {
                create: input.items.map((item) => ({
                  productId: item.productId,
                  variantId: item.variantId,
                  description: item.description,
                  quantity: item.quantity,
                  unitPrice: item.unitPrice,
                  totalPrice: item.quantity * item.unitPrice,
                })),
              },
            }),
          },
          include: { items: true },
        });
      });
      
      return pi;
    }),

  /**
   * Send PI to client (change status from DRAFT to SENT)
   */
  send: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { profile } = await ensureSellerProfile(ctx.session.userId);
      
      const pi = await prisma.proformaInvoice.findFirst({
        where: { id: input.id, sellerId: profile.id, deletedAt: null },
        include: { items: true },
      });
      
      if (!pi) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Proforma Invoice not found" });
      }
      
      if (pi.status !== "DRAFT") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "PI must be in DRAFT status to send" });
      }
      
      if (pi.items.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "PI must have at least one item" });
      }
      
      return prisma.proformaInvoice.update({
        where: { id: input.id },
        data: { status: "SENT" },
        include: { items: true },
      });
    }),

  /**
   * Cancel PI (seller can cancel DRAFT or SENT PIs)
   */
  cancel: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { profile } = await ensureSellerProfile(ctx.session.userId);
      
      const pi = await prisma.proformaInvoice.findFirst({
        where: { id: input.id, sellerId: profile.id, deletedAt: null },
      });
      
      if (!pi) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Proforma Invoice not found" });
      }
      
      if (!["DRAFT", "SENT"].includes(pi.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Can only cancel PI in DRAFT or SENT status" });
      }
      
      return prisma.proformaInvoice.update({
        where: { id: input.id },
        data: { status: "CANCELLED" },
      });
    }),

  /**
   * Delete PI (soft delete, only DRAFT or CANCELLED)
   */
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { profile } = await ensureSellerProfile(ctx.session.userId);
      
      const pi = await prisma.proformaInvoice.findFirst({
        where: { id: input.id, sellerId: profile.id, deletedAt: null },
      });
      
      if (!pi) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Proforma Invoice not found" });
      }
      
      if (!["DRAFT", "CANCELLED"].includes(pi.status)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Can only delete PI in DRAFT or CANCELLED status" });
      }
      
      return prisma.proformaInvoice.update({
        where: { id: input.id },
        data: { deletedAt: new Date() },
      });
    }),
});

// ============================================================================
// PURCHASE ORDER (PO) PROCEDURES
// ============================================================================

const poRouter = router({
  /**
   * List POs received by seller
   */
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        status: z.nativeEnum(POStatus).optional(),
        search: z.string().optional(),
        sortBy: z.enum(["createdAt", "total", "poNumber", "expectedDelivery"]).default("createdAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { profile } = await ensureSellerProfile(ctx.session.userId);
      const { page = 1, limit = 20, status, search, sortBy = "createdAt", sortOrder = "desc" } = input || {};
      
      const where = {
        sellerId: profile.id,
        deletedAt: null,
        ...(status && { status }),
        ...(search && {
          OR: [
            { poNumber: { contains: search } },
            { clientNotes: { contains: search } },
          ],
        }),
      };
      
      const [pos, total] = await Promise.all([
        prisma.purchaseOrder.findMany({
          where,
          include: {
            items: true,
            pi: { select: { piNumber: true } },
            _count: { select: { invoices: true } },
          },
          orderBy: { [sortBy]: sortOrder },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.purchaseOrder.count({ where }),
      ]);
      
      return {
        data: pos,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }),

  /**
   * Get single PO by ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { profile } = await ensureSellerProfile(ctx.session.userId);
      
      const po = await prisma.purchaseOrder.findFirst({
        where: {
          id: input.id,
          sellerId: profile.id,
          deletedAt: null,
        },
        include: {
          items: true,
          pi: { include: { items: true } },
          invoices: { include: { payments: true } },
        },
      });
      
      if (!po) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Purchase Order not found" });
      }
      
      return po;
    }),

  /**
   * Acknowledge PO (seller confirms they received it)
   */
  acknowledge: protectedProcedure
    .input(z.object({ 
      id: z.string(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { profile } = await ensureSellerProfile(ctx.session.userId);
      
      const po = await prisma.purchaseOrder.findFirst({
        where: { id: input.id, sellerId: profile.id, deletedAt: null },
      });
      
      if (!po) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Purchase Order not found" });
      }
      
      if (po.status !== "PENDING") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "PO must be in PENDING status to acknowledge" });
      }
      
      return prisma.purchaseOrder.update({
        where: { id: input.id },
        data: {
          status: "ACKNOWLEDGED",
          acknowledgedAt: new Date(),
          ...(input.notes && { internalNotes: input.notes }),
        },
      });
    }),

  /**
   * Update PO status (IN_PROGRESS, SHIPPED, DELIVERED)
   */
  updateStatus: protectedProcedure
    .input(z.object({
      id: z.string(),
      status: z.enum(["IN_PROGRESS", "SHIPPED", "DELIVERED"]),
      trackingNumber: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { profile } = await ensureSellerProfile(ctx.session.userId);
      
      const po = await prisma.purchaseOrder.findFirst({
        where: { id: input.id, sellerId: profile.id, deletedAt: null },
      });
      
      if (!po) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Purchase Order not found" });
      }
      
      // Validate status transitions
      const validTransitions: Record<string, string[]> = {
        ACKNOWLEDGED: ["IN_PROGRESS", "SHIPPED"],
        IN_PROGRESS: ["SHIPPED"],
        SHIPPED: ["DELIVERED"],
      };
      
      if (!validTransitions[po.status]?.includes(input.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot transition from ${po.status} to ${input.status}`,
        });
      }
      
      const updateData: Record<string, unknown> = {
        status: input.status,
        ...(input.notes && { internalNotes: input.notes }),
      };
      
      if (input.status === "SHIPPED") {
        updateData.shippedAt = new Date();
        if (input.trackingNumber) {
          updateData.trackingNumber = input.trackingNumber;
        }
      }
      
      if (input.status === "DELIVERED") {
        updateData.deliveredAt = new Date();
      }
      
      return prisma.purchaseOrder.update({
        where: { id: input.id },
        data: updateData,
        include: { items: true },
      });
    }),

  /**
   * Update item fulfillment quantities
   */
  updateItemQuantities: protectedProcedure
    .input(z.object({
      id: z.string(),
      items: z.array(z.object({
        itemId: z.string(),
        quantityShipped: z.number().min(0),
        quantityReceived: z.number().min(0).optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const { profile } = await ensureSellerProfile(ctx.session.userId);
      
      const po = await prisma.purchaseOrder.findFirst({
        where: { id: input.id, sellerId: profile.id, deletedAt: null },
        include: { items: true },
      });
      
      if (!po) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Purchase Order not found" });
      }
      
      // Update each item
      await Promise.all(
        input.items.map((item) =>
          prisma.pOItem.update({
            where: { id: item.itemId },
            data: {
              quantityShipped: item.quantityShipped,
              ...(item.quantityReceived !== undefined && { quantityReceived: item.quantityReceived }),
            },
          })
        )
      );
      
      return prisma.purchaseOrder.findUnique({
        where: { id: input.id },
        include: { items: true },
      });
    }),
});

// ============================================================================
// INVOICE PROCEDURES
// ============================================================================

const invoiceRouter = router({
  /**
   * List invoices
   */
  list: protectedProcedure
    .input(
      z.object({
        page: z.number().min(1).default(1),
        limit: z.number().min(1).max(100).default(20),
        status: z.nativeEnum(InvoiceStatus).optional(),
        search: z.string().optional(),
        sortBy: z.enum(["createdAt", "totalAmount", "invoiceNumber", "dueDate"]).default("createdAt"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { profile } = await ensureSellerProfile(ctx.session.userId);
      const { page = 1, limit = 20, status, search, sortBy = "createdAt", sortOrder = "desc" } = input || {};
      
      const where = {
        sellerId: profile.id,
        deletedAt: null,
        ...(status && { status }),
        ...(search && {
          OR: [
            { invoiceNumber: { contains: search } },
            { notes: { contains: search } },
          ],
        }),
      };
      
      const [invoices, total] = await Promise.all([
        prisma.invoice.findMany({
          where,
          include: {
            items: true,
            po: { select: { poNumber: true } },
            pi: { select: { piNumber: true } },
            payments: true,
          },
          orderBy: { [sortBy]: sortOrder },
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.invoice.count({ where }),
      ]);
      
      return {
        data: invoices,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    }),

  /**
   * Get single invoice
   */
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const { profile } = await ensureSellerProfile(ctx.session.userId);
      
      const invoice = await prisma.invoice.findFirst({
        where: {
          id: input.id,
          sellerId: profile.id,
          deletedAt: null,
        },
        include: {
          items: true,
          po: { include: { items: true } },
          pi: { include: { items: true } },
          payments: true,
        },
      });
      
      if (!invoice) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
      }
      
      return invoice;
    }),

  /**
   * Generate invoice from fulfilled PO
   */
  generateFromPO: protectedProcedure
    .input(z.object({
      poId: z.string(),
      notes: z.string().optional(),
      paymentTerms: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const { profile } = await ensureSellerProfile(ctx.session.userId);
      
      const po = await prisma.purchaseOrder.findFirst({
        where: { id: input.poId, sellerId: profile.id, deletedAt: null },
        include: { items: true, pi: true },
      });
      
      if (!po) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Purchase Order not found" });
      }
      
      if (po.status !== "DELIVERED") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Can only generate invoice for DELIVERED POs" });
      }
      
      // Check if invoice already exists for this PO
      const existingInvoice = await prisma.invoice.findFirst({
        where: { poId: po.id, deletedAt: null },
      });
      
      if (existingInvoice) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invoice already exists for this PO" });
      }
      
      // Calculate due date based on credit terms
      const creditTerms = po.pi?.creditTerms || "NET_30";
      const daysToAdd = creditTerms === "IMMEDIATE" ? 0 :
                        creditTerms === "NET_30" ? 30 :
                        creditTerms === "NET_60" ? 60 : 90;
      
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + daysToAdd);
      
      const invoiceNumber = await generateDocumentNumber("INV");
      const taxRate = po.pi?.taxRate || 18;
      
      const invoice = await prisma.invoice.create({
        data: {
          invoiceNumber,
          poId: po.id,
          piId: po.piId,
          sellerId: profile.id,
          dueDate,
          taxRate,
          subtotal: po.subtotal,
          taxAmount: po.taxAmount,
          discount: po.discount,
          totalAmount: po.total,
          balanceAmount: po.total,
          notes: input.notes,
          paymentTerms: input.paymentTerms,
          items: {
            create: po.items.map((item) => ({
              productId: item.productId,
              variantId: item.variantId,
              description: item.description,
              quantity: item.quantityReceived || item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: (item.quantityReceived || item.quantity) * item.unitPrice,
            })),
          },
        },
        include: { items: true },
      });
      
      // Update PI status to BILLED
      if (po.piId) {
        await prisma.proformaInvoice.update({
          where: { id: po.piId },
          data: { status: "BILLED" },
        });
      }
      
      return invoice;
    }),

  /**
   * Send invoice (change status from DRAFT to SENT)
   */
  send: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { profile } = await ensureSellerProfile(ctx.session.userId);
      
      const invoice = await prisma.invoice.findFirst({
        where: { id: input.id, sellerId: profile.id, deletedAt: null },
      });
      
      if (!invoice) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
      }
      
      if (invoice.status !== "DRAFT") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invoice must be in DRAFT status to send" });
      }
      
      return prisma.invoice.update({
        where: { id: input.id },
        data: { status: "SENT" },
      });
    }),

  /**
   * Mark invoice as sent/unpaid
   */
  markUnpaid: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const { profile } = await ensureSellerProfile(ctx.session.userId);
      
      const invoice = await prisma.invoice.findFirst({
        where: { id: input.id, sellerId: profile.id, deletedAt: null },
      });
      
      if (!invoice) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Invoice not found" });
      }
      
      return prisma.invoice.update({
        where: { id: input.id },
        data: { status: "UNPAID" },
      });
    }),
});

// ============================================================================
// B2B ANALYTICS PROCEDURES
// ============================================================================

const analyticsRouter = router({
  /**
   * Get B2B dashboard summary
   */
  getDashboardSummary: protectedProcedure
    .input(
      z.object({
        period: z.enum(["7d", "30d", "90d", "12m", "all"]).default("30d"),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { profile } = await ensureSellerProfile(ctx.session.userId);
      const { startDate, endDate } = getDateRange(input?.period || "30d");
      
      // Get PI metrics
      const [
        totalPIs,
        draftPIs,
        sentPIs,
        approvedPIs,
        piValue,
      ] = await Promise.all([
        prisma.proformaInvoice.count({
          where: { sellerId: profile.id, deletedAt: null, createdAt: { gte: startDate, lte: endDate } },
        }),
        prisma.proformaInvoice.count({
          where: { sellerId: profile.id, deletedAt: null, status: "DRAFT" },
        }),
        prisma.proformaInvoice.count({
          where: { sellerId: profile.id, deletedAt: null, status: "SENT" },
        }),
        prisma.proformaInvoice.count({
          where: { sellerId: profile.id, deletedAt: null, status: "APPROVED" },
        }),
        prisma.proformaInvoice.aggregate({
          where: { sellerId: profile.id, deletedAt: null, status: { in: ["SENT", "APPROVED", "FULFILLED", "BILLED", "PAID"] } },
          _sum: { total: true },
        }),
      ]);
      
      // Get PO metrics
      const [
        totalPOs,
        pendingPOs,
        inProgressPOs,
        deliveredPOs,
        poValue,
      ] = await Promise.all([
        prisma.purchaseOrder.count({
          where: { sellerId: profile.id, deletedAt: null, createdAt: { gte: startDate, lte: endDate } },
        }),
        prisma.purchaseOrder.count({
          where: { sellerId: profile.id, deletedAt: null, status: "PENDING" },
        }),
        prisma.purchaseOrder.count({
          where: { sellerId: profile.id, deletedAt: null, status: { in: ["ACKNOWLEDGED", "IN_PROGRESS", "SHIPPED"] } },
        }),
        prisma.purchaseOrder.count({
          where: { sellerId: profile.id, deletedAt: null, status: "DELIVERED", createdAt: { gte: startDate, lte: endDate } },
        }),
        prisma.purchaseOrder.aggregate({
          where: { sellerId: profile.id, deletedAt: null, status: { not: "CANCELLED" } },
          _sum: { total: true },
        }),
      ]);
      
      // Get Invoice metrics
      const [
        totalInvoices,
        unpaidInvoices,
        paidInvoices,
        overdueInvoices,
        totalBilled,
        totalPaid,
      ] = await Promise.all([
        prisma.invoice.count({
          where: { sellerId: profile.id, deletedAt: null, createdAt: { gte: startDate, lte: endDate } },
        }),
        prisma.invoice.count({
          where: { sellerId: profile.id, deletedAt: null, status: { in: ["UNPAID", "SENT"] } },
        }),
        prisma.invoice.count({
          where: { sellerId: profile.id, deletedAt: null, status: "PAID", createdAt: { gte: startDate, lte: endDate } },
        }),
        prisma.invoice.count({
          where: { sellerId: profile.id, deletedAt: null, status: "OVERDUE" },
        }),
        prisma.invoice.aggregate({
          where: { sellerId: profile.id, deletedAt: null, status: { not: "CANCELLED" } },
          _sum: { totalAmount: true },
        }),
        prisma.invoice.aggregate({
          where: { sellerId: profile.id, deletedAt: null, status: "PAID" },
          _sum: { paidAmount: true },
        }),
      ]);
      
      // Get pending payment amount
      const pendingPayments = await prisma.invoice.aggregate({
        where: { 
          sellerId: profile.id, 
          deletedAt: null, 
          status: { in: ["UNPAID", "PARTIAL_PAID", "SENT"] },
        },
        _sum: { balanceAmount: true },
      });
      
      // Get overdue amount
      const overdueAmount = await prisma.invoice.aggregate({
        where: { 
          sellerId: profile.id, 
          deletedAt: null, 
          status: "OVERDUE",
        },
        _sum: { balanceAmount: true },
      });
      
      return {
        proformaInvoices: {
          total: totalPIs,
          draft: draftPIs,
          sent: sentPIs,
          approved: approvedPIs,
          totalValue: piValue._sum.total || 0,
        },
        purchaseOrders: {
          total: totalPOs,
          pending: pendingPOs,
          inProgress: inProgressPOs,
          delivered: deliveredPOs,
          totalValue: poValue._sum.total || 0,
        },
        invoices: {
          total: totalInvoices,
          unpaid: unpaidInvoices,
          paid: paidInvoices,
          overdue: overdueInvoices,
          totalBilled: totalBilled._sum.totalAmount || 0,
          totalPaid: totalPaid._sum.paidAmount || 0,
        },
        payments: {
          pending: pendingPayments._sum.balanceAmount || 0,
          overdue: overdueAmount._sum.balanceAmount || 0,
          collected: totalPaid._sum.paidAmount || 0,
        },
      };
    }),

  /**
   * Get PI status pipeline data
   */
  getPIPipeline: protectedProcedure.query(async ({ ctx }) => {
    const { profile } = await ensureSellerProfile(ctx.session.userId);
    
    const statuses = ["DRAFT", "SENT", "UNDER_REVIEW", "APPROVED", "FULFILLED", "BILLED", "PAID"] as const;
    
    const pipeline = await Promise.all(
      statuses.map(async (status) => {
        const [count, value] = await Promise.all([
          prisma.proformaInvoice.count({
            where: { sellerId: profile.id, deletedAt: null, status },
          }),
          prisma.proformaInvoice.aggregate({
            where: { sellerId: profile.id, deletedAt: null, status },
            _sum: { total: true },
          }),
        ]);
        
        return {
          status,
          count,
          value: value._sum.total || 0,
        };
      })
    );
    
    return pipeline;
  }),

  /**
   * Get recent PIs
   */
  getRecentPIs: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(20).default(5) }).optional())
    .query(async ({ ctx, input }) => {
      const { profile } = await ensureSellerProfile(ctx.session.userId);
      
      return prisma.proformaInvoice.findMany({
        where: { sellerId: profile.id, deletedAt: null },
        include: { items: true },
        orderBy: { createdAt: "desc" },
        take: input?.limit || 5,
      });
    }),

  /**
   * Get recent POs
   */
  getRecentPOs: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(20).default(5) }).optional())
    .query(async ({ ctx, input }) => {
      const { profile } = await ensureSellerProfile(ctx.session.userId);
      
      return prisma.purchaseOrder.findMany({
        where: { sellerId: profile.id, deletedAt: null },
        include: { 
          items: true,
          pi: { select: { piNumber: true } },
        },
        orderBy: { createdAt: "desc" },
        take: input?.limit || 5,
      });
    }),

  /**
   * Get payment aging report
   */
  getPaymentAging: protectedProcedure.query(async ({ ctx }) => {
    const { profile } = await ensureSellerProfile(ctx.session.userId);
    const now = new Date();
    
    // Get all unpaid/partial invoices
    const unpaidInvoices = await prisma.invoice.findMany({
      where: {
        sellerId: profile.id,
        deletedAt: null,
        status: { in: ["UNPAID", "PARTIAL_PAID", "SENT", "OVERDUE"] },
      },
      select: {
        dueDate: true,
        balanceAmount: true,
      },
    });
    
    // Categorize by aging buckets
    const aging = {
      current: 0,      // Not yet due
      days1to30: 0,    // 1-30 days overdue
      days31to60: 0,   // 31-60 days overdue
      days61to90: 0,   // 61-90 days overdue
      over90: 0,       // 90+ days overdue
    };
    
    unpaidInvoices.forEach((invoice) => {
      const daysOverdue = Math.floor((now.getTime() - invoice.dueDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysOverdue <= 0) {
        aging.current += invoice.balanceAmount;
      } else if (daysOverdue <= 30) {
        aging.days1to30 += invoice.balanceAmount;
      } else if (daysOverdue <= 60) {
        aging.days31to60 += invoice.balanceAmount;
      } else if (daysOverdue <= 90) {
        aging.days61to90 += invoice.balanceAmount;
      } else {
        aging.over90 += invoice.balanceAmount;
      }
    });
    
    return aging;
  }),

  /**
   * Get revenue trend (monthly)
   */
  getRevenueTrend: protectedProcedure
    .input(z.object({ months: z.number().min(1).max(24).default(6) }).optional())
    .query(async ({ ctx, input }) => {
      const { profile } = await ensureSellerProfile(ctx.session.userId);
      const months = input?.months || 6;
      
      const trend = [];
      const now = new Date();
      
      for (let i = months - 1; i >= 0; i--) {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        
        const [invoiced, collected] = await Promise.all([
          prisma.invoice.aggregate({
            where: {
              sellerId: profile.id,
              deletedAt: null,
              createdAt: { gte: startOfMonth, lte: endOfMonth },
            },
            _sum: { totalAmount: true },
          }),
          prisma.paymentRecord.aggregate({
            where: {
              invoice: { sellerId: profile.id },
              paymentDate: { gte: startOfMonth, lte: endOfMonth },
            },
            _sum: { amount: true },
          }),
        ]);
        
        trend.push({
          month: startOfMonth.toLocaleString("default", { month: "short", year: "numeric" }),
          invoiced: invoiced._sum.totalAmount || 0,
          collected: collected._sum.amount || 0,
        });
      }
      
      return trend;
    }),

  /**
   * Get top products by PI value
   */
  getTopProducts: protectedProcedure
    .input(z.object({ limit: z.number().min(1).max(20).default(5) }).optional())
    .query(async ({ ctx, input }) => {
      const { profile } = await ensureSellerProfile(ctx.session.userId);
      
      // Get PI items aggregated by product
      const piItems = await prisma.pIItem.findMany({
        where: {
          pi: { sellerId: profile.id, deletedAt: null, status: { not: "CANCELLED" } },
        },
        select: {
          productId: true,
          description: true,
          quantity: true,
          totalPrice: true,
        },
      });
      
      // Aggregate by product
      const productMap = new Map<string, { description: string; quantity: number; value: number }>();
      
      piItems.forEach((item) => {
        const existing = productMap.get(item.productId);
        if (existing) {
          existing.quantity += item.quantity;
          existing.value += item.totalPrice;
        } else {
          productMap.set(item.productId, {
            description: item.description,
            quantity: item.quantity,
            value: item.totalPrice,
          });
        }
      });
      
      // Sort and take top N
      const topProducts = Array.from(productMap.entries())
        .map(([productId, data]) => ({ productId, ...data }))
        .sort((a, b) => b.value - a.value)
        .slice(0, input?.limit || 5);
      
      return topProducts;
    }),
});

// ============================================================================
// MAIN PROCUREMENT ROUTER
// ============================================================================

export const procurementRouter = router({
  pi: piRouter,
  po: poRouter,
  invoice: invoiceRouter,
  analytics: analyticsRouter,
});
