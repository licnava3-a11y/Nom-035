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
});
