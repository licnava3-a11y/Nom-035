import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { alertHistory } from "../../drizzle/schema";
import { and, desc, eq, gte, sql } from "drizzle-orm";

/**
 * Router for predictive analytics on alerts
 * Uses historical data to predict when alerts are likely to occur
 */
export const predictiveAlertsRouter = router({
  /**
   * Get predictive insights for a specific alert type
   * Analyzes historical patterns to predict future occurrences
   */
  getPrediction: protectedProcedure
    .input(
      z.object({
        alertType: z.enum(["critical_cases", "low_coverage", "excellent_compliance"]),
        daysAhead: z.number().min(1).max(90).default(30), // Predict up to 90 days ahead
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      const { alertType, daysAhead } = input;

      // Get historical alerts from the last 180 days
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180);

      const historicalAlerts = await db
        .select()
        .from(alertHistory)
        .where(
          and(
            eq(alertHistory.alertType, alertType),
            gte(alertHistory.triggeredAt, sixMonthsAgo)
          )
        )
        .orderBy(desc(alertHistory.triggeredAt));

      if (historicalAlerts.length < 3) {
        return {
          hasSufficientData: false,
          message: "Datos insuficientes para análisis predictivo (mínimo 3 alertas históricas)",
          alertType,
          historicalCount: historicalAlerts.length,
        };
      }

      // Calculate time intervals between alerts (in days)
      const intervals: number[] = [];
      for (let i = 0; i < historicalAlerts.length - 1; i++) {
        const current = new Date(historicalAlerts[i].triggeredAt).getTime();
        const next = new Date(historicalAlerts[i + 1].triggeredAt).getTime();
        const daysDiff = Math.abs((current - next) / (1000 * 60 * 60 * 24));
        intervals.push(daysDiff);
      }

      // Calculate average interval
      const avgInterval = intervals.reduce((sum: any, val: any) => sum + val, 0) / intervals.length;

      // Calculate standard deviation for confidence level
      const variance = intervals.reduce((sum: any, val: any) => sum + Math.pow(val - avgInterval, 2), 0) / intervals.length;
      const stdDev = Math.sqrt(variance);

      // Predict next occurrence
      const lastAlert = historicalAlerts[0];
      const lastAlertDate = new Date(lastAlert.triggeredAt);
      const predictedDate = new Date(lastAlertDate);
      predictedDate.setDate(predictedDate.getDate() + Math.round(avgInterval));

      // Calculate days until predicted occurrence
      const today = new Date();
      const daysUntilPredicted = Math.round((predictedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      // Determine confidence level based on standard deviation
      const coefficientOfVariation = (stdDev / avgInterval) * 100;
      let confidenceLevel: "high" | "medium" | "low";
      if (coefficientOfVariation < 20) {
        confidenceLevel = "high";
      } else if (coefficientOfVariation < 40) {
        confidenceLevel = "medium";
      } else {
        confidenceLevel = "low";
      }

      // Calculate trend (increasing or decreasing frequency)
      let trend: "increasing" | "stable" | "decreasing" = "stable";
      if (intervals.length >= 3) {
        const recentAvg = intervals.slice(0, Math.floor(intervals.length / 2)).reduce((sum: any, val: any) => sum + val, 0) / Math.floor(intervals.length / 2);
        const olderAvg = intervals.slice(Math.floor(intervals.length / 2)).reduce((sum: any, val: any) => sum + val, 0) / (intervals.length - Math.floor(intervals.length / 2));
        
        if (recentAvg < olderAvg * 0.8) {
          trend = "increasing"; // Alerts happening more frequently
        } else if (recentAvg > olderAvg * 1.2) {
          trend = "decreasing"; // Alerts happening less frequently
        }
      }

      // Determine if proactive notification should be sent
      const shouldNotify = daysUntilPredicted <= 7 && daysUntilPredicted > 0 && confidenceLevel !== "low";

      return {
        hasSufficientData: true,
        alertType,
        historicalCount: historicalAlerts.length,
        analysis: {
          averageIntervalDays: Math.round(avgInterval * 10) / 10,
          standardDeviation: Math.round(stdDev * 10) / 10,
          confidenceLevel,
          trend,
          coefficientOfVariation: Math.round(coefficientOfVariation * 10) / 10,
        },
        prediction: {
          predictedDate: predictedDate.toISOString(),
          daysUntilPredicted,
          shouldNotify,
          notificationMessage: shouldNotify
            ? `Se predice una alerta de tipo "${alertType}" en aproximadamente ${daysUntilPredicted} días (${predictedDate.toLocaleDateString("es-MX")})`
            : null,
        },
        lastAlert: {
          date: lastAlert.triggeredAt,
          description: lastAlert.description,
          currentValue: lastAlert.currentValue,
          threshold: lastAlert.threshold,
        },
      };
    }),

  /**
   * Get predictions for all alert types
   */
  getAllPredictions: protectedProcedure
    .input(
      z.object({
        daysAhead: z.number().min(1).max(90).default(30),
      })
    )
    .query(async ({ ctx, input }) => {
      const alertTypes: Array<"critical_cases" | "low_coverage" | "excellent_compliance"> = [
        "critical_cases",
        "low_coverage",
        "excellent_compliance",
      ];

      const predictions = [];

      for (const alertType of alertTypes) {
        const db = await getDb();
        if (!db) continue;

        const sixMonthsAgo = new Date();
        sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180);

        const historicalAlerts = await db
          .select()
          .from(alertHistory)
          .where(
            and(
              eq(alertHistory.alertType, alertType),
              gte(alertHistory.triggeredAt, sixMonthsAgo)
            )
          )
          .orderBy(desc(alertHistory.triggeredAt));

        if (historicalAlerts.length >= 3) {
          // Calculate intervals
          const intervals: number[] = [];
          for (let i = 0; i < historicalAlerts.length - 1; i++) {
            const current = new Date(historicalAlerts[i].triggeredAt).getTime();
            const next = new Date(historicalAlerts[i + 1].triggeredAt).getTime();
            const daysDiff = Math.abs((current - next) / (1000 * 60 * 60 * 24));
            intervals.push(daysDiff);
          }

          const avgInterval = intervals.reduce((sum: any, val: any) => sum + val, 0) / intervals.length;
          const lastAlert = historicalAlerts[0];
          const lastAlertDate = new Date(lastAlert.triggeredAt);
          const predictedDate = new Date(lastAlertDate);
          predictedDate.setDate(predictedDate.getDate() + Math.round(avgInterval));

          const today = new Date();
          const daysUntilPredicted = Math.round((predictedDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

          const variance = intervals.reduce((sum: any, val: any) => sum + Math.pow(val - avgInterval, 2), 0) / intervals.length;
          const stdDev = Math.sqrt(variance);
          const coefficientOfVariation = (stdDev / avgInterval) * 100;

          let confidenceLevel: "high" | "medium" | "low";
          if (coefficientOfVariation < 20) {
            confidenceLevel = "high";
          } else if (coefficientOfVariation < 40) {
            confidenceLevel = "medium";
          } else {
            confidenceLevel = "low";
          }

          predictions.push({
            alertType,
            predictedDate: predictedDate.toISOString(),
            daysUntilPredicted,
            confidenceLevel,
            shouldNotify: daysUntilPredicted <= 7 && daysUntilPredicted > 0 && confidenceLevel !== "low",
          });
        }
      }

      return predictions;
    }),

  /**
   * Get alert frequency statistics by time period
   */
  getFrequencyStats: protectedProcedure
    .input(
      z.object({
        alertType: z.enum(["critical_cases", "low_coverage", "excellent_compliance"]).optional(),
        period: z.enum(["week", "month", "quarter"]).default("month"),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      const { alertType, period } = input;

      // Calculate date range based on period
      const endDate = new Date();
      const startDate = new Date();
      if (period === "week") {
        startDate.setDate(startDate.getDate() - 7 * 12); // Last 12 weeks
      } else if (period === "month") {
        startDate.setMonth(startDate.getMonth() - 12); // Last 12 months
      } else {
        startDate.setMonth(startDate.getMonth() - 12 * 3); // Last 12 quarters
      }

      const conditions = [gte(alertHistory.triggeredAt, startDate)];
      if (alertType) {
        conditions.push(eq(alertHistory.alertType, alertType));
      }

      const alerts = await db
        .select()
        .from(alertHistory)
        .where(and(...conditions))
        .orderBy(alertHistory.triggeredAt);

      // Group alerts by time period
      const groupedData: Record<string, number> = {};
      
      alerts.forEach((alert: any) => {
        const date = new Date(alert.triggeredAt);
        let key: string;
        
        if (period === "week") {
          const weekNumber = Math.floor((date.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
          key = `Semana ${weekNumber + 1}`;
        } else if (period === "month") {
          key = date.toLocaleDateString("es-MX", { year: "numeric", month: "short" });
        } else {
          const quarter = Math.floor(date.getMonth() / 3) + 1;
          key = `Q${quarter} ${date.getFullYear()}`;
        }
        
        groupedData[key] = (groupedData[key] || 0) + 1;
      });

      return {
        period,
        alertType: alertType || "all",
        data: Object.entries(groupedData).map(([label, count]: [string, any]) => ({ label, count })),
        totalAlerts: alerts.length,
      };
    }),
});
