import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import {
  getInvoicesSummary,
  getPurchaseOrdersSummary,
  getExpenseRequestsSummary,
  getAllInvoices,
  getAllPurchaseOrders,
  getAllExpenseRequests,
} from "../db";

/**
 * Administrative Router - Procedures para dashboard administrativo
 * Actualizado con queries reales de tablas financieras
 */
export const administrativeRouter = router({
  // Estadísticas financieras
  getFinancialStats: protectedProcedure.query(async ({ ctx }) => {
    const invoicesSummary = await getInvoicesSummary();
    const purchaseOrdersSummary = await getPurchaseOrdersSummary();
    const expenseRequestsSummary = await getExpenseRequestsSummary();

    const allInvoices = await getAllInvoices();
    const pendingInvoices = allInvoices.filter(
      inv => inv.estado === "pendiente"
    );

    const allPurchaseOrders = await getAllPurchaseOrders();
    const pendingPOs = allPurchaseOrders.filter(po => po.estado === "borrador");

    const allExpenseRequests = await getAllExpenseRequests();
    const pendingExpenses = allExpenseRequests.filter(
      req => req.estado === "pendiente"
    );

    return {
      pendingPaymentsAmount: invoicesSummary.montoTotal,
      pendingPaymentsCount: invoicesSummary.pendientes,
      purchaseOrdersCount: purchaseOrdersSummary.total,
      pendingPOCount: pendingPOs.length,
      paidCoursesCount: 0, // TODO: Implementar cuando se agregue relación con cursos
      pendingDocsCount: 0, // TODO: Implementar cuando se agregue documentación de cursos
      expenseRequestsCount: expenseRequestsSummary.total,
      pendingExpensesCount: expenseRequestsSummary.pendientes,
      coursesWithPendingDocs: [], // TODO: Implementar cuando se agregue documentación de cursos
    };
  }),

  // Pagos pendientes
  getPendingPayments: protectedProcedure.query(async ({ ctx }) => {
    const allInvoices = await getAllInvoices();
    const pendingInvoices = allInvoices
      .filter(inv => inv.estado === "pendiente" || inv.estado === "vencida")
      .map(inv => ({
        id: inv.id,
        supplier: inv.clienteNombre,
        invoiceNumber: inv.folio,
        amount: parseFloat(inv.monto.toString()),
        dueDate: new Date(inv.fechaVencimiento),
        status: inv.estado,
      }));

    return pendingInvoices;
  }),

  // Órdenes de compra
  getPurchaseOrders: protectedProcedure
    .input(
      z.object({
        status: z
          .enum(["borrador", "enviada", "recibida", "cancelada"])
          .optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const allOrders = await getAllPurchaseOrders();
      const filteredOrders = input.status
        ? allOrders.filter(order => order.estado === input.status)
        : allOrders;

      return filteredOrders.map(order => ({
        id: order.id,
        orderNumber: order.folio,
        supplier: order.proveedor,
        amount: parseFloat(order.monto.toString()),
        orderDate: new Date(order.fecha),
        status: order.estado,
      }));
    }),

  // Solicitudes de viáticos/gastos
  getExpenseRequests: protectedProcedure
    .input(
      z.object({
        status: z
          .enum(["pendiente", "aprobada", "rechazada", "pagada"])
          .optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const allRequests = await getAllExpenseRequests();
      const filteredRequests = input.status
        ? allRequests.filter(req => req.estado === input.status)
        : allRequests;

      return filteredRequests.map(req => ({
        id: req.id,
        employeeName: `Usuario ID: ${req.solicitanteId}`, // TODO: Join con tabla users para obtener nombre
        purpose: req.concepto,
        amount: parseFloat(req.monto.toString()),
        travelDate: req.fechaRequerida ? new Date(req.fechaRequerida) : null,
        status: req.estado,
        category: req.categoria,
      }));
    }),
});
