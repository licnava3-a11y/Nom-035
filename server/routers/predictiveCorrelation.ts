/**
 * Router: Predictive Correlation Dashboard
 * Evalúa la precisión del modelo predictivo de rotación comparando predicciones vs rotación real
 */

import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc.ts";
import { getDb } from "../db.ts";
import { employeeTurnoverHistory, users } from "../../drizzle/schema.ts";
import { eq, and, gte, lte, sql } from "drizzle-orm";

export const predictiveCorrelationRouter = router({
  /**
   * Obtener métricas de precisión del modelo predictivo
   * Calcula: Precisión, Recall, F1-Score, Accuracy
   */
  getModelAccuracy: protectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

        // Obtener empleados de alto riesgo (probabilidad >= 60%)
        const highRiskQuery = await db.execute(sql`
          SELECT 
            u.id,
            u.nombre,
            u.apellido,
            u.email,
            u.departamento,
            COALESCE(
              (SELECT COUNT(*) * 40 
               FROM sentiment_analysis sa 
               WHERE sa.userId = u.id 
               AND sa.riskLevel IN ('high', 'very_high')
               AND sa.analyzedAt >= DATE_SUB(NOW(), INTERVAL 90 DAY)
              ) +
              (SELECT COUNT(*) * 30 
               FROM nom035_cases nc 
               WHERE nc.employeeId = u.id 
               AND nc.status = 'open'
              ) +
              (SELECT CASE WHEN sr.riskLevel IN ('high', 'very_high') THEN 30 ELSE 0 END
               FROM survey_results sr 
               WHERE sr.userId = u.id 
               ORDER BY sr.createdAt DESC 
               LIMIT 1
              ),
              0
            ) as riskScore
          FROM users u
          WHERE u.activo = 1
          HAVING riskScore >= 60
        `);

        const highRiskEmployees = ((highRiskQuery) as any)[0] as any[];
        const highRiskIds = highRiskEmployees.map((e: any) => e.id);

        // Obtener empleados que rotaron
        let turnoverQuery = db.select().from(employeeTurnoverHistory);

        if (input.startDate && input.endDate) {
          turnoverQuery = turnoverQuery.where(
            and(
              gte(employeeTurnoverHistory.exitDate, new Date(input.startDate)),
              lte(employeeTurnoverHistory.exitDate, new Date(input.endDate))
            )
          ) as any;
        }

        const turnoverEmployees = await turnoverQuery;
        const turnoverIds = turnoverEmployees.map((e: any) => e.userId);

        // Calcular métricas de confusión
        const truePositives = turnoverEmployees.filter((e: any) => e.wasHighRisk).length;
        const falsePositives = highRiskIds.filter((id: any) => !turnoverIds.includes(id)).length;
        const falseNegatives = turnoverEmployees.filter((e: any) => !e.wasHighRisk).length;
        const trueNegatives = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(users)
          .where(
            and(
              eq(sql`1`, true),
              sql`${users.id} NOT IN (${highRiskIds.length > 0 ? highRiskIds.join(",") : "0"})`,
              sql`${users.id} NOT IN (${turnoverIds.length > 0 ? turnoverIds.join(",") : "0"})`
            )
          );

        const tn = trueNegatives[0]?.count || 0;

        // Calcular métricas
        const precision = truePositives + falsePositives > 0 
          ? (truePositives / (truePositives + falsePositives)) * 100 
          : 0;
        
        const recall = truePositives + falseNegatives > 0 
          ? (truePositives / (truePositives + falseNegatives)) * 100 
          : 0;
        
        const f1Score = precision + recall > 0 
          ? (2 * (precision * recall)) / (precision + recall) 
          : 0;
        
        const accuracy = truePositives + tn + falsePositives + falseNegatives > 0
          ? ((truePositives + tn) / (truePositives + tn + falsePositives + falseNegatives)) * 100
          : 0;

        return {
          metrics: {
            precision: Math.round(precision * 10) / 10,
            recall: Math.round(recall * 10) / 10,
            f1Score: Math.round(f1Score * 10) / 10,
            accuracy: Math.round(accuracy * 10) / 10,
          },
          confusionMatrix: {
            truePositives,
            falsePositives,
            falseNegatives,
            trueNegatives: tn,
          },
          totalHighRisk: highRiskIds.length,
          totalTurnover: turnoverEmployees.length,
        };
      } catch (error) {
        console.error("[PredictiveCorrelation] Error getting model accuracy:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Error al obtener métricas",
        });
      }
    }),

  /**
   * Obtener casos verdaderos positivos (alto riesgo + rotaron)
   */
  getTruePositives: protectedProcedure.query(async () => {
    try {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      const result = await db
        .select({
          id: employeeTurnoverHistory.id,
          userId: employeeTurnoverHistory.userId,
          nombre: users.name,
          apellido: users.name,
          email: users.email,
          departamento: users.departamento,
          exitDate: employeeTurnoverHistory.exitDate,
          exitReason: employeeTurnoverHistory.exitReason,
          riskScoreAtExit: employeeTurnoverHistory.riskScoreAtExit,
        })
        .from(employeeTurnoverHistory)
        .innerJoin(users, eq(employeeTurnoverHistory.userId, users.id))
        .where(eq(employeeTurnoverHistory.wasHighRisk, true))
        .orderBy(employeeTurnoverHistory.exitDate);

      return result;
    } catch (error) {
      console.error("[PredictiveCorrelation] Error getting true positives:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Error al obtener verdaderos positivos",
      });
    }
  }),

  /**
   * Obtener casos falsos positivos (alto riesgo + no rotaron)
   */
  getFalsePositives: protectedProcedure.query(async () => {
    try {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      // Obtener IDs de empleados que rotaron
      const turnoverEmployees = await db.select({ userId: employeeTurnoverHistory.userId }).from(employeeTurnoverHistory);
      const turnoverIds = turnoverEmployees.map((e: any) => e.userId);

      // Obtener empleados de alto riesgo que NO rotaron
      const highRiskQuery = await db.execute(sql`
        SELECT 
          u.id,
          u.nombre,
          u.apellido,
          u.email,
          u.departamento,
          COALESCE(
            (SELECT COUNT(*) * 40 
             FROM sentiment_analysis sa 
             WHERE sa.userId = u.id 
             AND sa.riskLevel IN ('high', 'very_high')
             AND sa.analyzedAt >= DATE_SUB(NOW(), INTERVAL 90 DAY)
            ) +
            (SELECT COUNT(*) * 30 
             FROM nom035_cases nc 
             WHERE nc.employeeId = u.id 
             AND nc.status = 'open'
            ) +
            (SELECT CASE WHEN sr.riskLevel IN ('high', 'very_high') THEN 30 ELSE 0 END
             FROM survey_results sr 
             WHERE sr.userId = u.id 
             ORDER BY sr.createdAt DESC 
             LIMIT 1
            ),
            0
          ) as riskScore
        FROM users u
        WHERE u.activo = 1
        AND u.id NOT IN (${turnoverIds.length > 0 ? turnoverIds.join(",") : "0"})
        HAVING riskScore >= 60
      `);

      return ((highRiskQuery) as any)[0] as any[];
    } catch (error) {
      console.error("[PredictiveCorrelation] Error getting false positives:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Error al obtener falsos positivos",
      });
    }
  }),

  /**
   * Obtener casos falsos negativos (bajo riesgo + rotaron)
   */
  getFalseNegatives: protectedProcedure.query(async () => {
    try {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      const result = await db
        .select({
          id: employeeTurnoverHistory.id,
          userId: employeeTurnoverHistory.userId,
          nombre: users.name,
          apellido: users.name,
          email: users.email,
          departamento: users.departamento,
          exitDate: employeeTurnoverHistory.exitDate,
          exitReason: employeeTurnoverHistory.exitReason,
          riskScoreAtExit: employeeTurnoverHistory.riskScoreAtExit,
        })
        .from(employeeTurnoverHistory)
        .innerJoin(users, eq(employeeTurnoverHistory.userId, users.id))
        .where(eq(employeeTurnoverHistory.wasHighRisk, false))
        .orderBy(employeeTurnoverHistory.exitDate);

      return result;
    } catch (error) {
      console.error("[PredictiveCorrelation] Error getting false negatives:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error instanceof Error ? error.message : "Error al obtener falsos negativos",
      });
    }
  }),
});
