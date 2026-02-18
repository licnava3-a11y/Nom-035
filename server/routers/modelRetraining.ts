/**
 * Router de Historial de Reentrenamiento del Modelo
 * Gestiona el historial de reentrena mientos automáticos del modelo predictivo
 */

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { modelRetrainingHistory, modelThresholds } from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

export const modelRetrainingRouter = router({
  /**
   * Obtener historial de reentrena mientos
   */
  getRetrainingHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(20),
      })
    )
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database connection failed",
          });
        }

        const retrainingRecords = await db
          .select()
          .from(modelRetrainingHistory)
          .orderBy(desc(modelRetrainingHistory.appliedAt))
          .limit(input.limit);

        // Obtener configuraciones asociadas
        const recordsWithConfigs = await Promise.all(
          retrainingRecords.map(async (record) => {
            const [oldConfig] = await db
              .select()
              .from(modelThresholds)
              .where(eq(modelThresholds.id, record.oldConfigId));

            const [newConfig] = await db
              .select()
              .from(modelThresholds)
              .where(eq(modelThresholds.id, record.newConfigId));

            return {
              ...record,
              oldConfig,
              newConfig,
            };
          })
        );

        return recordsWithConfigs;
      } catch (error: any) {
        console.error("Error al obtener historial de reentrena mientos:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Error al obtener historial de reentrena mientos",
        });
      }
    }),

  /**
   * Obtener último reentrenamiento
   */
  getLastRetraining: protectedProcedure.query(async () => {
    try {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      const [lastRetraining] = await db
        .select()
        .from(modelRetrainingHistory)
        .orderBy(desc(modelRetrainingHistory.appliedAt))
        .limit(1);

      if (!lastRetraining) {
        return null;
      }

      const [oldConfig] = await db
        .select()
        .from(modelThresholds)
        .where(eq(modelThresholds.id, lastRetraining.oldConfigId));

      const [newConfig] = await db
        .select()
        .from(modelThresholds)
        .where(eq(modelThresholds.id, lastRetraining.newConfigId));

      return {
        ...lastRetraining,
        oldConfig,
        newConfig,
      };
    } catch (error: any) {
      console.error("Error al obtener último reentrenamiento:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error.message || "Error al obtener último reentrenamiento",
      });
    }
  }),

  /**
   * Obtener estadísticas de reentrena mientos
   */
  getRetrainingStats: protectedProcedure.query(async () => {
    try {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      const allRetrainings = await db.select().from(modelRetrainingHistory);

      const totalRetrainings = allRetrainings.length;
      const appliedRetrainings = allRetrainings.filter(r => r.status === "applied").length;
      const revertedRetrainings = allRetrainings.filter(r => r.status === "reverted").length;

      // Calcular mejora promedio
      const improvements = allRetrainings
        .filter(r => r.improvementPercentage)
        .map(r => parseFloat(r.improvementPercentage || "0"));

      const averageImprovement = improvements.length > 0
        ? improvements.reduce((a, b) => a + b, 0) / improvements.length
        : 0;

      return {
        total: totalRetrainings,
        applied: appliedRetrainings,
        reverted: revertedRetrainings,
        averageImprovement: averageImprovement.toFixed(2),
      };
    } catch (error: any) {
      console.error("Error al obtener estadísticas de reentrena mientos:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error.message || "Error al obtener estadísticas de reentrena mientos",
      });
    }
  }),
});
