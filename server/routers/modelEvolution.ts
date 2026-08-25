import { router, protectedProcedure } from "../_core/trpc.js";
import { z } from "zod";
import { getDb } from "../db.js";
import { employeeTurnoverHistory } from "../../drizzle/schema.js";
import { sql, and, gte, lte } from "drizzle-orm";

export const modelEvolutionRouter = router({
  getMetricsByMonth: protectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const { startDate, endDate } = input;

      // Calcular rango de fechas (últimos 12 meses por defecto)
      const end = endDate ? new Date(endDate) : new Date();
      const start = startDate
        ? new Date(startDate)
        : new Date(end.getFullYear(), end.getMonth() - 11, 1);

      // Obtener datos de rotación agrupados por mes
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const turnoverData = await db
        .select({
          month: sql<string>`DATE_FORMAT(${employeeTurnoverHistory.exitDate}, '%Y-%m')`,
          totalTurnover: sql<number>`COUNT(*)`,
          highRiskTurnover: sql<number>`SUM(CASE WHEN ${employeeTurnoverHistory.wasHighRisk} = 1 THEN 1 ELSE 0 END)`,
          lowRiskTurnover: sql<number>`SUM(CASE WHEN ${employeeTurnoverHistory.wasHighRisk} = 0 THEN 1 ELSE 0 END)`,
        })
        .from(employeeTurnoverHistory)
        .where(
          and(
            gte(employeeTurnoverHistory.exitDate, start),
            lte(employeeTurnoverHistory.exitDate, end)
          )
        )
        .groupBy(sql`DATE_FORMAT(${employeeTurnoverHistory.exitDate}, '%Y-%m')`)
        .orderBy(
          sql`DATE_FORMAT(${employeeTurnoverHistory.exitDate}, '%Y-%m')`
        );

      // Calcular métricas por mes
      const metricsByMonth = turnoverData.map((row: any) => {
        const truePositives = row.highRiskTurnover;
        const falseNegatives = row.lowRiskTurnover;
        const totalPredictedHigh = truePositives + falseNegatives; // Simplificación: asumimos que todos los que rotaron fueron predichos

        const precision =
          totalPredictedHigh > 0 ? truePositives / totalPredictedHigh : 0;
        const recall =
          row.totalTurnover > 0 ? truePositives / row.totalTurnover : 0;
        const f1Score =
          precision + recall > 0
            ? (2 * precision * recall) / (precision + recall)
            : 0;

        return {
          month: row.month,
          precision: Math.round(precision * 100),
          recall: Math.round(recall * 100),
          f1Score: Math.round(f1Score * 100),
          totalTurnover: row.totalTurnover,
        };
      });

      // Calcular tendencia (comparar últimos 3 meses vs 3 meses anteriores)
      const recentMetrics = metricsByMonth.slice(-3);
      const previousMetrics = metricsByMonth.slice(-6, -3);

      const avgRecent = recentMetrics.reduce(
        (acc, m) => ({
          precision: acc.precision + m.precision,
          recall: acc.recall + m.recall,
          f1Score: acc.f1Score + m.f1Score,
        }),
        { precision: 0, recall: 0, f1Score: 0 }
      );

      const avgPrevious = previousMetrics.reduce(
        (acc, m) => ({
          precision: acc.precision + m.precision,
          recall: acc.recall + m.recall,
          f1Score: acc.f1Score + m.f1Score,
        }),
        { precision: 0, recall: 0, f1Score: 0 }
      );

      const recentCount = recentMetrics.length || 1;
      const previousCount = previousMetrics.length || 1;

      const trend = {
        precision: Math.round(
          avgRecent.precision / recentCount -
            avgPrevious.precision / previousCount
        ),
        recall: Math.round(
          avgRecent.recall / recentCount - avgPrevious.recall / previousCount
        ),
        f1Score: Math.round(
          avgRecent.f1Score / recentCount - avgPrevious.f1Score / previousCount
        ),
      };

      return {
        metricsByMonth,
        trend,
        summary: {
          avgPrecision: Math.round(avgRecent.precision / recentCount),
          avgRecall: Math.round(avgRecent.recall / recentCount),
          avgF1Score: Math.round(avgRecent.f1Score / recentCount),
        },
      };
    }),
});
