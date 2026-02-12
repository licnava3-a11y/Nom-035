import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";

/**
 * Administrative Router - Procedures para dashboard administrativo
 * NOTA: Estos procedures retornan datos mock temporales.
 * Reemplazar con queries reales cuando se implementen las funcionalidades de gestión financiera.
 */
export const administrativeRouter = router({
  // Estadísticas financieras
  getFinancialStats: protectedProcedure.query(async ({ ctx }) => {
    // TODO: Implementar queries reales cuando se creen tablas de:
    // - Facturas y pagos
    // - Órdenes de compra
    // - Cursos con información de pago
    // - Solicitudes de viáticos

    return {
      pendingPaymentsAmount: 125000,
      pendingPaymentsCount: 8,
      purchaseOrdersCount: 15,
      pendingPOCount: 5,
      paidCoursesCount: 12,
      pendingDocsCount: 3,
      expenseRequestsCount: 7,
      pendingExpensesCount: 4,
      coursesWithPendingDocs: [
        {
          id: 1,
          courseName: "Capacitación NOM-035 - Grupo A",
          instructorName: "Lic. María González",
          completionDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        },
        {
          id: 2,
          courseName: "Manejo de Estrés Laboral",
          instructorName: "Psic. Juan Pérez",
          completionDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        },
      ],
    };
  }),

  // Pagos pendientes
  getPendingPayments: protectedProcedure.query(async ({ ctx }) => {
    // TODO: Implementar query real cuando se cree tabla de facturas/pagos
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const nextMonth = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

    return [
      {
        id: 1,
        supplier: "Capacitación Integral S.A.",
        invoiceNumber: "FAC-2024-001",
        amount: 45000,
        dueDate: nextWeek,
      },
      {
        id: 2,
        supplier: "Consultoría RH Profesional",
        invoiceNumber: "FAC-2024-002",
        amount: 32000,
        dueDate: nextWeek,
      },
      {
        id: 3,
        supplier: "Material Didáctico Express",
        invoiceNumber: "FAC-2024-003",
        amount: 18500,
        dueDate: nextMonth,
      },
    ];
  }),

  // Órdenes de compra
  getPurchaseOrders: protectedProcedure
    .input(
      z.object({
        status: z.enum(["pending", "approved", "paid", "rejected"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // TODO: Implementar query real cuando se cree tabla de órdenes de compra
      const today = new Date();
      const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      return [
        {
          id: 1,
          orderNumber: "001",
          supplier: "Papelería Corporativa",
          amount: 12000,
          orderDate: lastWeek,
          status: "pending" as const,
        },
        {
          id: 2,
          orderNumber: "002",
          supplier: "Equipos de Oficina Pro",
          amount: 28000,
          orderDate: lastWeek,
          status: "approved" as const,
        },
      ];
    }),

  // Solicitudes de viáticos
  getExpenseRequests: protectedProcedure
    .input(
      z.object({
        status: z.enum(["pending", "approved", "paid", "rejected"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // TODO: Implementar query real cuando se cree tabla de solicitudes de viáticos
      const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      return [
        {
          id: 1,
          employeeName: "Ing. Carlos Ramírez",
          purpose: "Curso de certificación en CDMX",
          amount: 8500,
          travelDate: nextWeek,
          status: "pending" as const,
        },
        {
          id: 2,
          employeeName: "Lic. Ana Martínez",
          purpose: "Congreso Nacional de RH",
          amount: 12000,
          travelDate: nextMonth,
          status: "pending" as const,
        },
      ];
    }),
});
