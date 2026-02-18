/**
 * Router de Alertas de Rendimiento del Modelo
 * Gestiona alertas generadas cuando las métricas del modelo caen por debajo de umbrales críticos
 */

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { modelPerformanceAlerts } from "../../drizzle/schema";
import { eq, desc, and, isNull } from "drizzle-orm";

export const modelPerformanceAlertsRouter = router({
  /**
   * Obtener alertas activas (no resueltas)
   */
  getActiveAlerts: protectedProcedure.query(async () => {
    try {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      const alerts = await db
        .select()
        .from(modelPerformanceAlerts)
        .where(eq(modelPerformanceAlerts.isResolved, false))
        .orderBy(desc(modelPerformanceAlerts.createdAt));

      return alerts;
    } catch (error: any) {
      console.error("Error al obtener alertas activas:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error.message || "Error al obtener alertas activas",
      });
    }
  }),

  /**
   * Obtener historial completo de alertas
   */
  getAlertHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(50),
        severity: z.enum(["low", "medium", "high", "critical"]).optional(),
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

        let query = db
          .select()
          .from(modelPerformanceAlerts)
          .orderBy(desc(modelPerformanceAlerts.createdAt))
          .limit(input.limit);

        if (input.severity) {
          query = query.where(eq(modelPerformanceAlerts.severity, input.severity)) as any;
        }

        const alerts = await query;

        return alerts;
      } catch (error: any) {
        console.error("Error al obtener historial de alertas:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Error al obtener historial de alertas",
        });
      }
    }),

  /**
   * Marcar alerta como resuelta
   */
  resolveAlert: protectedProcedure
    .input(
      z.object({
        alertId: z.number(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database connection failed",
          });
        }

        await db
          .update(modelPerformanceAlerts)
          .set({
            isResolved: true,
            resolvedAt: new Date(),
            resolvedBy: ctx.user.id,
          })
          .where(eq(modelPerformanceAlerts.id, input.alertId));

        return {
          success: true,
          message: "Alerta marcada como resuelta",
        };
      } catch (error: any) {
        console.error("Error al resolver alerta:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Error al resolver alerta",
        });
      }
    }),

  /**
   * Obtener estadísticas de alertas
   */
  getAlertStats: protectedProcedure.query(async () => {
    try {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      const allAlerts = await db.select().from(modelPerformanceAlerts);

      const activeAlerts = allAlerts.filter(a => !a.isResolved);
      const criticalAlerts = activeAlerts.filter(a => a.severity === "critical");
      const highAlerts = activeAlerts.filter(a => a.severity === "high");
      const mediumAlerts = activeAlerts.filter(a => a.severity === "medium");
      const lowAlerts = activeAlerts.filter(a => a.severity === "low");

      // Alertas por tipo de métrica
      const precisionAlerts = activeAlerts.filter(a => a.metricName === "precision");
      const recallAlerts = activeAlerts.filter(a => a.metricName === "recall");
      const f1ScoreAlerts = activeAlerts.filter(a => a.metricName === "f1Score");
      const accuracyAlerts = activeAlerts.filter(a => a.metricName === "accuracy");

      return {
        total: allAlerts.length,
        active: activeAlerts.length,
        resolved: allAlerts.length - activeAlerts.length,
        bySeverity: {
          critical: criticalAlerts.length,
          high: highAlerts.length,
          medium: mediumAlerts.length,
          low: lowAlerts.length,
        },
        byMetric: {
          precision: precisionAlerts.length,
          recall: recallAlerts.length,
          f1Score: f1ScoreAlerts.length,
          accuracy: accuracyAlerts.length,
        },
      };
    } catch (error: any) {
      console.error("Error al obtener estadísticas de alertas:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error.message || "Error al obtener estadísticas de alertas",
      });
    }
  }),
});
