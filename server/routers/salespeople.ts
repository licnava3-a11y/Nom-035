import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { 
  getDb, 
  getAllSalespeople, 
  getActiveSalespeople,
  getSalespersonById,
  createSalesperson,
  updateSalesperson,
  toggleSalespersonActive,
  getSalespeopleDistributionStats,
  getSalespersonPerformance,
} from "../db";
import { TRPCError } from "@trpc/server";

export const salespeopleRouter = router({
  /**
   * Obtener todos los vendedores (activos e inactivos)
   */
  getAll: protectedProcedure.query(async () => {
    return await getAllSalespeople();
  }),

  /**
   * Obtener solo vendedores activos
   */
  getActive: protectedProcedure.query(async () => {
    return await getActiveSalespeople();
  }),

  /**
   * Obtener vendedor por ID
   */
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const salesperson = await getSalespersonById(input.id);
      if (!salesperson) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Vendedor no encontrado' });
      }
      return salesperson;
    }),

  /**
   * Crear nuevo vendedor
   */
  create: protectedProcedure
    .input(
      z.object({
        nombre: z.string().min(1, "El nombre es requerido"),
        email: z.string().email("Email inválido"),
        userId: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const newId = await createSalesperson(input);
      return { success: true, id: newId };
    }),

  /**
   * Actualizar vendedor
   */
  update: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        nombre: z.string().min(1).optional(),
        email: z.string().email().optional(),
        activo: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { id, ...data } = input;
      await updateSalesperson(id, data);
      return { success: true };
    }),

  /**
   * Activar/desactivar vendedor
   */
  toggleActive: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await toggleSalespersonActive(input.id);
      return { success: true };
    }),

  /**
   * Obtener estadísticas de distribución de leads por vendedor
   */
  getDistributionStats: protectedProcedure.query(async () => {
    return await getSalespeopleDistributionStats();
  }),
  
  /**
   * Obtener rendimiento individual de un vendedor
   */
  getIndividualPerformance: protectedProcedure
    .input(
      z.object({
        salespersonId: z.number(),
        months: z.number().min(1).max(24).optional().default(6),
      })
    )
    .query(async ({ input }) => {
      const performance = await getSalespersonPerformance(input.salespersonId, input.months);
      if (!performance) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'No se encontraron datos de rendimiento' });
      }
      return performance;
    }),

  /**
   * Obtener métricas comparativas de todos los vendedores
   */
  getComparativeMetrics: protectedProcedure
    .input(
      z.object({
        months: z.number().min(1).max(24).optional().default(6),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const { salespeople, leads } = await import("../../drizzle/schema");
      const { eq, and, gte, sql } = await import("drizzle-orm");

      // Fecha de inicio para el período
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - input.months);

      // Obtener todos los vendedores activos
      const allSalespeople = await db.select().from(salespeople).where(eq(salespeople.activo, true));

      // Obtener métricas de cada vendedor
      const metrics = await Promise.all(
        allSalespeople.map(async (sp) => {
          // Total leads asignados
          const totalLeads = await db
            .select({ count: sql<number>`COUNT(*)` })
            .from(leads)
            .where(
              and(
                eq(leads.asignadoA, sp.id),
                gte(leads.createdAt, startDate)
              )
            );

          // Leads ganados
          const wonLeads = await db
            .select({ count: sql<number>`COUNT(*)` })
            .from(leads)
            .where(
              and(
                eq(leads.asignadoA, sp.id),
                eq(leads.estado, "ganado"),
                gte(leads.createdAt, startDate)
              )
            );

          // Leads perdidos
          const lostLeads = await db
            .select({ count: sql<number>`COUNT(*)` })
            .from(leads)
            .where(
              and(
                eq(leads.asignadoA, sp.id),
                eq(leads.estado, "perdido"),
                gte(leads.createdAt, startDate)
              )
            );

          const total = Number(totalLeads[0]?.count || 0);
          const won = Number(wonLeads[0]?.count || 0);
          const lost = Number(lostLeads[0]?.count || 0);
          const conversionRate = total > 0 ? (won / total) * 100 : 0;

          return {
            salespersonId: sp.id,
            nombre: sp.nombre,
            email: sp.email,
            totalLeads: total,
            wonLeads: won,
            lostLeads: lost,
            activeLeads: total - won - lost,
            conversionRate: Math.round(conversionRate * 100) / 100,
          };
        })
      );

      // Ordenar por tasa de conversión descendente
      metrics.sort((a: any, b: any) => b.conversionRate - a.conversionRate);

      return {
        salespeople: metrics,
        periodMonths: input.months,
        generatedAt: new Date(),
      };
    }),
});
