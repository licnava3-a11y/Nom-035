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
});
