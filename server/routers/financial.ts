import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { 
  getInvoicesSummary, 
  getPurchaseOrdersSummary, 
  getExpenseRequestsSummary,
  getAllInvoices,
  getAllPurchaseOrders,
  getAllExpenseRequests
} from "../db";
import { requirePermission } from "../permissions";

export const financialRouter = router({
  // ==================== DASHBOARD SUMMARIES ====================
  
  /**
   * Get financial dashboard summary
   * Requires: can_view permission
   */
  getDashboardSummary: protectedProcedure
    .use(requirePermission("can_view"))
    .query(async () => {
      const invoices = await getInvoicesSummary();
      const purchaseOrders = await getPurchaseOrdersSummary();
      const expenseRequests = await getExpenseRequestsSummary();
      
      return {
        invoices,
        purchaseOrders,
        expenseRequests,
      };
    }),

  // ==================== INVOICES ====================
  
  /**
   * Get all invoices
   * Requires: can_view permission
   */
  getAllInvoices: protectedProcedure
    .use(requirePermission("can_view"))
    .query(async () => {
      return await getAllInvoices();
    }),

  /**
   * Get invoices summary
   * Requires: can_view permission
   */
  getInvoicesSummary: protectedProcedure
    .use(requirePermission("can_view"))
    .query(async () => {
      return await getInvoicesSummary();
    }),

  /**
   * Create new invoice
   * Requires: can_create permission
   */
  createInvoice: protectedProcedure
    .use(requirePermission("can_create"))
    .input(z.object({
      folio: z.string().min(1).max(50),
      clienteNombre: z.string().min(1).max(255),
      clienteRFC: z.string().max(13).optional(),
      monto: z.string(), // decimal as string
      moneda: z.enum(["MXN", "USD", "EUR"]).default("MXN"),
      fechaEmision: z.string(), // date as string YYYY-MM-DD
      fechaVencimiento: z.string(),
      estado: z.enum(["pendiente", "pagada", "vencida", "cancelada"]).default("pendiente"),
      archivoUrl: z.string().max(500).optional(),
      notas: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await (await import("../db")).getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const { invoices } = await import("../../drizzle/schema");
      
      const { fechaEmision, fechaVencimiento, ...restInput } = input;
      const [invoice] = await db.insert(invoices).values({
        ...restInput,
        fechaEmision: new Date(fechaEmision),
        fechaVencimiento: new Date(fechaVencimiento),
        createdBy: ctx.user!.id,
      });
      
      return { success: true, invoiceId: invoice.insertId };
    }),

  /**
   * Update existing invoice
   * Requires: can_edit permission
   */
  updateInvoice: protectedProcedure
    .use(requirePermission("can_edit"))
    .input(z.object({
      id: z.number(),
      folio: z.string().min(1).max(50).optional(),
      clienteNombre: z.string().min(1).max(255).optional(),
      clienteRFC: z.string().max(13).optional(),
      monto: z.string().optional(),
      moneda: z.enum(["MXN", "USD", "EUR"]).optional(),
      fechaEmision: z.string().optional(),
      fechaVencimiento: z.string().optional(),
      estado: z.enum(["pendiente", "pagada", "vencida", "cancelada"]).optional(),
      archivoUrl: z.string().max(500).optional(),
      notas: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await (await import("../db")).getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const { invoices } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      
      const { id, fechaEmision, fechaVencimiento, ...updateData } = input;
      const updateFields = {
        ...updateData,
        ...(fechaEmision && { fechaEmision: new Date(fechaEmision) }),
        ...(fechaVencimiento && { fechaVencimiento: new Date(fechaVencimiento) }),
      };
      await db.update(invoices).set(updateFields).where(eq(invoices.id, id));
      
      return { success: true };
    }),

  /**
   * Delete invoice
   * Requires: can_delete permission
   */
  deleteInvoice: protectedProcedure
    .use(requirePermission("can_delete"))
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await (await import("../db")).getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const { invoices } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      
      await db.delete(invoices).where(eq(invoices.id, input.id));
      
      return { success: true };
    }),

  // ==================== PURCHASE ORDERS ====================
  
  /**
   * Get all purchase orders
   * Requires: can_view permission
   */
  getAllPurchaseOrders: protectedProcedure
    .use(requirePermission("can_view"))
    .query(async () => {
      return await getAllPurchaseOrders();
    }),

  /**
   * Get purchase orders summary
   * Requires: can_view permission
   */
  getPurchaseOrdersSummary: protectedProcedure
    .use(requirePermission("can_view"))
    .query(async () => {
      return await getPurchaseOrdersSummary();
    }),

  /**
   * Create new purchase order
   * Requires: can_create permission
   */
  createPurchaseOrder: protectedProcedure
    .use(requirePermission("can_create"))
    .input(z.object({
      folio: z.string().min(1).max(50),
      proveedor: z.string().min(1).max(255),
      proveedorRFC: z.string().max(13).optional(),
      monto: z.string(),
      moneda: z.enum(["MXN", "USD", "EUR"]).default("MXN"),
      fecha: z.string(),
      fechaEntregaEstimada: z.string().optional(),
      estado: z.enum(["borrador", "enviada", "recibida", "cancelada"]).default("borrador"),
      descripcion: z.string().optional(),
      archivoUrl: z.string().max(500).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await (await import("../db")).getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const { purchaseOrders } = await import("../../drizzle/schema");
      
      const { fecha, fechaEntregaEstimada, ...restInput } = input;
      const [order] = await db.insert(purchaseOrders).values({
        ...restInput,
        fecha: new Date(fecha),
        ...(fechaEntregaEstimada && { fechaEntregaEstimada: new Date(fechaEntregaEstimada) }),
        createdBy: ctx.user!.id,
      });
      
      return { success: true, orderId: order.insertId };
    }),

  /**
   * Update existing purchase order
   * Requires: can_edit permission
   */
  updatePurchaseOrder: protectedProcedure
    .use(requirePermission("can_edit"))
    .input(z.object({
      id: z.number(),
      folio: z.string().min(1).max(50).optional(),
      proveedor: z.string().min(1).max(255).optional(),
      proveedorRFC: z.string().max(13).optional(),
      monto: z.string().optional(),
      moneda: z.enum(["MXN", "USD", "EUR"]).optional(),
      fecha: z.string().optional(),
      fechaEntregaEstimada: z.string().optional(),
      estado: z.enum(["borrador", "enviada", "recibida", "cancelada"]).optional(),
      descripcion: z.string().optional(),
      archivoUrl: z.string().max(500).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await (await import("../db")).getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const { purchaseOrders } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      
      const { id, fecha, fechaEntregaEstimada, ...updateData } = input;
      const updateFields = {
        ...updateData,
        ...(fecha && { fecha: new Date(fecha) }),
        ...(fechaEntregaEstimada && { fechaEntregaEstimada: new Date(fechaEntregaEstimada) }),
      };
      await db.update(purchaseOrders).set(updateFields).where(eq(purchaseOrders.id, id));
      
      return { success: true };
    }),

  /**
   * Delete purchase order
   * Requires: can_delete permission
   */
  deletePurchaseOrder: protectedProcedure
    .use(requirePermission("can_delete"))
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await (await import("../db")).getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const { purchaseOrders } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      
      await db.delete(purchaseOrders).where(eq(purchaseOrders.id, input.id));
      
      return { success: true };
    }),

  // ==================== EXPENSE REQUESTS ====================
  
  /**
   * Get all expense requests
   * Requires: can_view permission
   */
  getAllExpenseRequests: protectedProcedure
    .use(requirePermission("can_view"))
    .query(async () => {
      return await getAllExpenseRequests();
    }),

  /**
   * Get expense requests summary
   * Requires: can_view permission
   */
  getExpenseRequestsSummary: protectedProcedure
    .use(requirePermission("can_view"))
    .query(async () => {
      return await getExpenseRequestsSummary();
    }),

  /**
   * Create new expense request
   * Requires: can_create permission
   */
  createExpenseRequest: protectedProcedure
    .use(requirePermission("can_create"))
    .input(z.object({
      folio: z.string().min(1).max(50),
      monto: z.string(),
      moneda: z.enum(["MXN", "USD", "EUR"]).default("MXN"),
      concepto: z.string().min(1).max(255),
      descripcion: z.string().optional(),
      categoria: z.enum(["viaje", "materiales", "servicios", "capacitacion", "otro"]),
      fechaSolicitud: z.string(),
      fechaRequerida: z.string().optional(),
      archivoUrl: z.string().max(500).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await (await import("../db")).getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const { expenseRequests } = await import("../../drizzle/schema");
      
      const { fechaSolicitud, fechaRequerida, ...restInput } = input;
      const [request] = await db.insert(expenseRequests).values({
        ...restInput,
        fechaSolicitud: new Date(fechaSolicitud),
        ...(fechaRequerida && { fechaRequerida: new Date(fechaRequerida) }),
        solicitanteId: ctx.user!.id,
        estado: "pendiente",
      });
      
      return { success: true, requestId: request.insertId };
    }),

  /**
   * Update existing expense request
   * Requires: can_edit permission
   */
  updateExpenseRequest: protectedProcedure
    .use(requirePermission("can_edit"))
    .input(z.object({
      id: z.number(),
      folio: z.string().min(1).max(50).optional(),
      monto: z.string().optional(),
      moneda: z.enum(["MXN", "USD", "EUR"]).optional(),
      concepto: z.string().min(1).max(255).optional(),
      descripcion: z.string().optional(),
      categoria: z.enum(["viaje", "materiales", "servicios", "capacitacion", "otro"]).optional(),
      fechaSolicitud: z.string().optional(),
      fechaRequerida: z.string().optional(),
      archivoUrl: z.string().max(500).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await (await import("../db")).getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const { expenseRequests } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      
      const { id, fechaSolicitud, fechaRequerida, ...updateData } = input;
      const updateFields = {
        ...updateData,
        ...(fechaSolicitud && { fechaSolicitud: new Date(fechaSolicitud) }),
        ...(fechaRequerida && { fechaRequerida: new Date(fechaRequerida) }),
      };
      await db.update(expenseRequests).set(updateFields).where(eq(expenseRequests.id, id));
      
      return { success: true };
    }),

  /**
   * Delete expense request
   * Requires: can_delete permission
   */
  deleteExpenseRequest: protectedProcedure
    .use(requirePermission("can_delete"))
    .input(z.object({
      id: z.number(),
    }))
    .mutation(async ({ input }) => {
      const db = await (await import("../db")).getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const { expenseRequests } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      
      await db.delete(expenseRequests).where(eq(expenseRequests.id, input.id));
      
      return { success: true };
    }),

  /**
   * Approve expense request
   * Requires: can_approve permission
   */
  approveExpenseRequest: protectedProcedure
    .use(requirePermission("can_approve"))
    .input(z.object({
      id: z.number(),
      approved: z.boolean(),
      comentarios: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await (await import("../db")).getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      const { expenseRequests } = await import("../../drizzle/schema");
      const { eq } = await import("drizzle-orm");
      
      await db.update(expenseRequests).set({
        estado: input.approved ? "aprobada" : "rechazada",
        aprobadorId: ctx.user!.id,
        fechaAprobacion: new Date(),
        comentariosAprobador: input.comentarios,
      }).where(eq(expenseRequests.id, input.id));
      
      return { success: true };
    }),
});
