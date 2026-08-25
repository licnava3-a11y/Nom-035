/**
 * Router de Experimentos A/B de Umbrales
 * Permite comparar el rendimiento de diferentes configuraciones de umbrales del modelo predictivo
 */

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import {
  thresholdExperiments,
  modelThresholds,
  employeeTurnoverHistory,
} from "../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

export const thresholdExperimentsRouter = router({
  /**
   * Crear nuevo experimento A/B
   */
  createExperiment: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "El nombre es requerido"),
        description: z.string().optional(),
        configIdA: z.number(),
        configIdB: z.number(),
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

        // Verificar que las configuraciones existen
        const [configA] = await db
          .select()
          .from(modelThresholds)
          .where(eq(modelThresholds.id, input.configIdA));

        const [configB] = await db
          .select()
          .from(modelThresholds)
          .where(eq(modelThresholds.id, input.configIdB));

        if (!configA || !configB) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Una o ambas configuraciones no existen",
          });
        }

        // Calcular métricas para ambas configuraciones
        const metricsA = await calculateMetricsForConfig(configA);
        const metricsB = await calculateMetricsForConfig(configB);

        // Determinar ganador basado en F1-Score (balance entre precisión y recall)
        const winnerConfigId =
          metricsA.f1Score >= metricsB.f1Score
            ? input.configIdA
            : input.configIdB;

        // Crear experimento
        const [experiment] = await (
          db.insert(thresholdExperiments) as any
        ).values({
          name: input.name,
          description: input.description || null,
          configIdA: input.configIdA,
          configIdB: input.configIdB,
          startDate: new Date(),
          precisionA: metricsA.precision.toFixed(2),
          recallA: metricsA.recall.toFixed(2),
          f1ScoreA: metricsA.f1Score.toFixed(2),
          accuracyA: metricsA.accuracy.toFixed(2),
          precisionB: metricsB.precision.toFixed(2),
          recallB: metricsB.recall.toFixed(2),
          f1ScoreB: metricsB.f1Score.toFixed(2),
          accuracyB: metricsB.accuracy.toFixed(2),
          winnerConfigId,
          status: "completed",
          createdBy: ctx.user.id,
        });

        return {
          success: true,
          message: "Experimento creado exitosamente",
          experimentId: experiment.insertId,
          winnerConfigId,
        };
      } catch (error: any) {
        console.error("Error al crear experimento:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Error al crear experimento",
        });
      }
    }),

  /**
   * Obtener lista de experimentos
   */
  getExperiments: protectedProcedure
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

        const experiments = await db
          .select()
          .from(thresholdExperiments)
          .orderBy(desc(thresholdExperiments.createdAt))
          .limit(input.limit);

        // Obtener configuraciones asociadas
        const experimentsWithConfigs = await Promise.all(
          experiments.map(async exp => {
            const [configA] = await db
              .select()
              .from(modelThresholds)
              .where(eq(modelThresholds.id, exp.configIdA));

            const [configB] = await db
              .select()
              .from(modelThresholds)
              .where(eq(modelThresholds.id, exp.configIdB));

            return {
              ...exp,
              configA,
              configB,
            };
          })
        );

        return experimentsWithConfigs;
      } catch (error: any) {
        console.error("Error al obtener experimentos:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Error al obtener experimentos",
        });
      }
    }),

  /**
   * Obtener configuraciones disponibles para experimentos
   */
  getAvailableConfigs: protectedProcedure.query(async () => {
    try {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      const configs = await db
        .select()
        .from(modelThresholds)
        .orderBy(desc(modelThresholds.createdAt));

      return configs;
    } catch (error: any) {
      console.error("Error al obtener configuraciones:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error.message || "Error al obtener configuraciones",
      });
    }
  }),

  /**
   * Comparar dos configuraciones específicas
   */
  compareConfigs: protectedProcedure
    .input(
      z.object({
        configIdA: z.number(),
        configIdB: z.number(),
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

        const [configA] = await db
          .select()
          .from(modelThresholds)
          .where(eq(modelThresholds.id, input.configIdA));

        const [configB] = await db
          .select()
          .from(modelThresholds)
          .where(eq(modelThresholds.id, input.configIdB));

        if (!configA || !configB) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Una o ambas configuraciones no existen",
          });
        }

        const metricsA = await calculateMetricsForConfig(configA);
        const metricsB = await calculateMetricsForConfig(configB);

        return {
          configA: {
            ...configA,
            metrics: metricsA,
          },
          configB: {
            ...configB,
            metrics: metricsB,
          },
          winner: metricsA.f1Score >= metricsB.f1Score ? "A" : "B",
        };
      } catch (error: any) {
        console.error("Error al comparar configuraciones:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Error al comparar configuraciones",
        });
      }
    }),
});

/**
 * Función auxiliar para calcular métricas de una configuración
 */
async function calculateMetricsForConfig(config: any) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  // Obtener registros de rotación
  const turnoverRecords = await db
    .select()
    .from(employeeTurnoverHistory)
    .orderBy(desc(employeeTurnoverHistory.exitDate))
    .limit(100);

  let truePositives = 0;
  let falsePositives = 0;
  let trueNegatives = 0;
  let falseNegatives = 0;

  // Simular clasificación con los umbrales de la configuración
  for (const record of turnoverRecords) {
    if (!record.riskScoreAtExit) continue;

    const predictedHighRisk =
      record.riskScoreAtExit >= config.highRiskThreshold;
    const actualHighRisk = record.wasHighRisk;

    if (predictedHighRisk && actualHighRisk) {
      truePositives++;
    } else if (predictedHighRisk && !actualHighRisk) {
      falsePositives++;
    } else if (!predictedHighRisk && !actualHighRisk) {
      trueNegatives++;
    } else if (!predictedHighRisk && actualHighRisk) {
      falseNegatives++;
    }
  }

  const precision =
    truePositives + falsePositives > 0
      ? (truePositives / (truePositives + falsePositives)) * 100
      : 0;

  const recall =
    truePositives + falseNegatives > 0
      ? (truePositives / (truePositives + falseNegatives)) * 100
      : 0;

  const f1Score =
    precision + recall > 0
      ? (2 * (precision * recall)) / (precision + recall)
      : 0;

  const accuracy =
    turnoverRecords.length > 0
      ? ((truePositives + trueNegatives) / turnoverRecords.length) * 100
      : 0;

  return {
    precision,
    recall,
    f1Score,
    accuracy,
    truePositives,
    falsePositives,
    trueNegatives,
    falseNegatives,
  };
}
