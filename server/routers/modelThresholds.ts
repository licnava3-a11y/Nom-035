import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { modelThresholds } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const modelThresholdsRouter = router({
  /**
   * Obtener configuración activa de umbrales del modelo
   */
  getActiveThresholds: protectedProcedure.query(async () => {
    try {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      const activeConfig = await db
        .select()
        .from(modelThresholds)
        .where(eq(modelThresholds.isActive, true))
        .orderBy(desc(modelThresholds.createdAt))
        .limit(1);

      if (activeConfig.length === 0) {
        // Si no hay configuración activa, crear una con valores por defecto
        const [defaultConfig] = await db!.insert(modelThresholds).values({
          criticalCommentsWeight: 40,
          openCasesWeight: 30,
          highRiskSurveysWeight: 30,
          highRiskThreshold: 70,
          mediumRiskThreshold: 40,
          description: "Configuración por defecto del modelo predictivo",
          isActive: true,
          createdBy: 1, // Admin por defecto
        });

        const [newConfig] = await db!
          .select()
          .from(modelThresholds)
          .where(eq(modelThresholds.id, defaultConfig.insertId));

        return newConfig;
      }

      return activeConfig[0];
    } catch (error) {
      console.error("Error al obtener umbrales activos:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Error al obtener configuración de umbrales",
      });
    }
  }),

  /**
   * Obtener historial de configuraciones
   */
  getThresholdsHistory: protectedProcedure.query(async () => {
    try {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      const history = await db
        .select()
        .from(modelThresholds)
        .orderBy(desc(modelThresholds.createdAt))
        .limit(10);

      return history;
    } catch (error) {
      console.error("Error al obtener historial de umbrales:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Error al obtener historial de configuraciones",
      });
    }
  }),

  /**
   * Actualizar umbrales del modelo (crea nueva configuración y desactiva la anterior)
   */
  updateThresholds: protectedProcedure
    .input(
      z.object({
        criticalCommentsWeight: z.number().min(0).max(100),
        openCasesWeight: z.number().min(0).max(100),
        highRiskSurveysWeight: z.number().min(0).max(100),
        highRiskThreshold: z.number().min(0).max(100),
        mediumRiskThreshold: z.number().min(0).max(100),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        // Validar que los pesos sumen 100
        const totalWeight =
          input.criticalCommentsWeight +
          input.openCasesWeight +
          input.highRiskSurveysWeight;

        if (totalWeight !== 100) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Los pesos deben sumar 100%. Suma actual: ${totalWeight}%`,
          });
        }

        // Validar que mediumRiskThreshold < highRiskThreshold
        if (input.mediumRiskThreshold >= input.highRiskThreshold) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message:
              "El umbral de riesgo medio debe ser menor que el umbral de riesgo alto",
          });
        }

        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        // Desactivar configuración actual
        await db
          .update(modelThresholds)
          .set({ isActive: false })
          .where(eq(modelThresholds.isActive, true));

        // Crear nueva configuración activa
        const [newConfig] = await db!.insert(modelThresholds).values({
          criticalCommentsWeight: input.criticalCommentsWeight,
          openCasesWeight: input.openCasesWeight,
          highRiskSurveysWeight: input.highRiskSurveysWeight,
          highRiskThreshold: input.highRiskThreshold,
          mediumRiskThreshold: input.mediumRiskThreshold,
          description: input.description || "Configuración personalizada",
          isActive: true,
          createdBy: ctx.user.id,
        });

        const [result] = await db!
          .select()
          .from(modelThresholds)
          .where(eq(modelThresholds.id, newConfig.insertId));

        return {
          success: true,
          message: "Configuración de umbrales actualizada exitosamente",
          config: result,
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error al actualizar umbrales:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al actualizar configuración de umbrales",
        });
      }
    }),

  /**
   * Restaurar valores por defecto
   */
  resetToDefaults: protectedProcedure.mutation(async ({ ctx }) => {
    try {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
      
      // Desactivar configuración actual
      await db
        .update(modelThresholds)
        .set({ isActive: false })
        .where(eq(modelThresholds.isActive, true));

      // Crear configuración con valores por defecto
      const [newConfig] = await db!.insert(modelThresholds).values({
        criticalCommentsWeight: 40,
        openCasesWeight: 30,
        highRiskSurveysWeight: 30,
        highRiskThreshold: 70,
        mediumRiskThreshold: 40,
        description: "Configuración por defecto restaurada",
        isActive: true,
        createdBy: ctx.user.id,
      });

      const [result] = await db!
        .select()
        .from(modelThresholds)
        .where(eq(modelThresholds.id, newConfig.insertId));

      return {
        success: true,
        message: "Valores por defecto restaurados exitosamente",
        config: result,
      };
    } catch (error) {
      console.error("Error al restaurar valores por defecto:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Error al restaurar configuración por defecto",
      });
    }
  }),

  /**
   * Activar una configuración histórica
   */
  activateConfig: protectedProcedure
    .input(z.object({ configId: z.number() }))
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });
        
        // Verificar que la configuración existe
        const [config] = await db
          .select()
          .from(modelThresholds)
          .where(eq(modelThresholds.id, input.configId));

        if (!config) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Configuración no encontrada",
          });
        }

        // Desactivar todas las configuraciones
        await db!
          .update(modelThresholds)
          .set({ isActive: false })
          .where(eq(modelThresholds.isActive, true));

        // Activar la configuración seleccionada
        await db!
          .update(modelThresholds)
          .set({ isActive: true })
          .where(eq(modelThresholds.id, input.configId));

        return {
          success: true,
          message: "Configuración activada exitosamente",
        };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }
        console.error("Error al activar configuración:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Error al activar configuración",
        });
      }
    }),
});
