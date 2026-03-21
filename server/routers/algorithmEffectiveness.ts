import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { predictionHistory, departments } from "../../drizzle/schema";
import { eq, and, gte, lte, sql, desc, isNull, isNotNull } from "drizzle-orm";

export const algorithmEffectivenessRouter = router({
  /**
   * Obtener métricas de precisión del algoritmo
   */
  getAccuracyMetrics: protectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { startDate, endDate } = input;

      // Construir condiciones de fecha
      const dateConditions = [];
      if (startDate) {
        dateConditions.push(gte(predictionHistory.predictionDate, new Date(startDate)));
      }
      if (endDate) {
        dateConditions.push(lte(predictionHistory.predictionDate, new Date(endDate)));
      }

      // Obtener predicciones evaluadas (con datos reales)
      const evaluatedPredictions = await db
        .select({
          id: predictionHistory.id,
          departmentId: predictionHistory.departmentId,
          departmentName: predictionHistory.departmentName,
          predictedRiskScore: predictionHistory.predictedRiskScore,
          predictedTurnoverRate: predictionHistory.predictedTurnoverRate,
          actualTurnoverRate: predictionHistory.actualTurnoverRate,
          accuracyScore: predictionHistory.accuracyScore,
          predictionError: predictionHistory.predictionError,
          predictionDate: predictionHistory.predictionDate,
          evaluationDate: predictionHistory.evaluationDate,
        })
        .from(predictionHistory)
        .where(
          and(
            eq(predictionHistory.status, "evaluated"),
            isNotNull(predictionHistory.actualTurnoverRate),
            ...dateConditions
          )
        )
        .execute();

      // Calcular métricas de precisión
      const totalPredictions = evaluatedPredictions.length;
      
      if (totalPredictions === 0) {
        return {
          totalPredictions: 0,
          averageAccuracy: 0,
          averageError: 0,
          highAccuracyCount: 0,
          mediumAccuracyCount: 0,
          lowAccuracyCount: 0,
        };
      }

      const totalAccuracy = evaluatedPredictions.reduce(
        (sum, pred) => sum + (Number(pred.accuracyScore) || 0),
        0
      );
      const totalError = evaluatedPredictions.reduce(
        (sum, pred) => sum + (Number(pred.predictionError) || 0),
        0
      );

      const averageAccuracy = totalAccuracy / totalPredictions;
      const averageError = totalError / totalPredictions;

      // Clasificar por nivel de precisión
      const highAccuracyCount = evaluatedPredictions.filter(
        (pred) => Number(pred.accuracyScore) >= 80
      ).length;
      const mediumAccuracyCount = evaluatedPredictions.filter(
        (pred) => Number(pred.accuracyScore) >= 60 && Number(pred.accuracyScore) < 80
      ).length;
      const lowAccuracyCount = evaluatedPredictions.filter(
        (pred) => Number(pred.accuracyScore) < 60
      ).length;

      return {
        totalPredictions,
        averageAccuracy: Math.round(averageAccuracy * 100) / 100,
        averageError: Math.round(averageError * 100) / 100,
        highAccuracyCount,
        mediumAccuracyCount,
        lowAccuracyCount,
      };
    }),

  /**
   * Obtener tendencias de predicciones vs realidad
   */
  getPredictionTrends: protectedProcedure
    .input(
      z.object({
        months: z.number().default(12),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { months } = input;

      // Fecha de inicio (hace N meses)
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      // Obtener predicciones evaluadas agrupadas por mes
      const trends = await db
        .select({
          month: sql<string>`DATE_FORMAT(${predictionHistory.predictionDate}, '%Y-%m')`,
          avgPredictedRate: sql<number>`AVG(${predictionHistory.predictedTurnoverRate})`,
          avgActualRate: sql<number>`AVG(${predictionHistory.actualTurnoverRate})`,
          avgAccuracy: sql<number>`AVG(${predictionHistory.accuracyScore})`,
          count: sql<number>`COUNT(*)`,
        })
        .from(predictionHistory)
        .where(
          and(
            gte(predictionHistory.predictionDate, startDate),
            eq(predictionHistory.status, "evaluated"),
            isNotNull(predictionHistory.actualTurnoverRate)
          )
        )
        .groupBy(sql`DATE_FORMAT(${predictionHistory.predictionDate}, '%Y-%m')`)
        .orderBy(sql`DATE_FORMAT(${predictionHistory.predictionDate}, '%Y-%m')`)
        .execute();

      return trends.map((trend: any) => ({
        month: trend.month,
        avgPredictedRate: Math.round(Number(trend.avgPredictedRate) * 100) / 100,
        avgActualRate: Math.round(Number(trend.avgActualRate) * 100) / 100,
        avgAccuracy: Math.round(Number(trend.avgAccuracy) * 100) / 100,
        count: Number(trend.count),
      }));
    }),

  /**
   * Obtener histórico completo de predicciones
   */
  getPredictionHistory: protectedProcedure
    .input(
      z.object({
        page: z.number().default(1),
        pageSize: z.number().default(20),
        departmentId: z.number().optional(),
        status: z.enum(["pending", "evaluated"]).optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { page, pageSize, departmentId, status } = input;
      const offset = (page - 1) * pageSize;

      // Construir condiciones
      const conditions = [];
      if (departmentId) {
        conditions.push(eq(predictionHistory.departmentId, departmentId));
      }
      if (status) {
        conditions.push(eq(predictionHistory.status, status));
      }

      // Obtener predicciones
      const predictions = await db
        .select()
        .from(predictionHistory)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(predictionHistory.predictionDate))
        .limit(pageSize)
        .offset(offset)
        .execute();

      // Contar total
      const [countResult] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(predictionHistory)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .execute();

      const total = Number(countResult?.count || 0);

      return {
        predictions,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    }),

  /**
   * Actualizar datos reales de una predicción (para evaluación manual)
   */
  updateActualData: protectedProcedure
    .input(
      z.object({
        predictionId: z.number(),
        actualTurnoverRate: z.number(),
        actualTerminations: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { predictionId, actualTurnoverRate, actualTerminations } = input;

      // Obtener la predicción
      const [prediction] = await db
        .select()
        .from(predictionHistory)
        .where(eq(predictionHistory.id, predictionId))
        .execute();

      if (!prediction) {
        throw new Error("Prediction not found");
      }

      // Calcular precisión
      const predictedRate = Number(prediction.predictedTurnoverRate) || 0;
      const predictionError = Math.abs(predictedRate - actualTurnoverRate);
      const accuracyScore = Math.max(0, 100 - (predictionError / predictedRate) * 100);

      // Actualizar predicción
      await db
        .update(predictionHistory)
        .set({
          actualTurnoverRate,
          actualTerminations,
          accuracyScore,
          predictionError,
          evaluationDate: new Date(),
          status: "evaluated",
          updatedAt: new Date(),
        } as any)
        .where(eq(predictionHistory.id, predictionId))
        .execute();

      return { success: true };
    }),
});
