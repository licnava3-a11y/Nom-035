/**
 * Router de Predicción de Efectividad de Intervenciones
 * Predice la probabilidad de éxito de una intervención antes de aplicarla
 */

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { retentionInterventions } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export const interventionPredictionRouter = router({
  /**
   * Predecir efectividad de una intervención
   */
  predictEffectiveness: protectedProcedure
    .input(
      z.object({
        interventionType: z.enum(["training", "salary_adjustment", "position_change", "benefits", "recognition", "other"]),
        cost: z.number().optional(),
        department: z.string().optional(),
        position: z.string().optional(),
        riskScore: z.number(), // 0-100
        turnoverProbability: z.number(), // 0-100
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

        // Obtener intervenciones históricas del mismo tipo
        const historicalInterventions = await db
          .select()
          .from(retentionInterventions)
          .where(eq(retentionInterventions.interventionType, input.interventionType));

        // Filtrar intervenciones con outcome conocido
        const completedInterventions = historicalInterventions.filter(
          (i) => i.outcome === "retained" || i.outcome === "left"
        );

        if (completedInterventions.length < 3) {
          // Datos insuficientes: usar modelo por defecto
          return getDefaultPrediction(input);
        }

        // Calcular tasa de éxito base
        const successCount = completedInterventions.filter((i: any) => i.outcome === "retained").length;
        const baseSuccessRate = (successCount / completedInterventions.length) * 100;

        // Filtrar intervenciones similares (mismo departamento o puesto)
        const similarInterventions = completedInterventions.filter((i: any) => {
          const deptMatch = input.department && i.department === input.department;
          const posMatch = input.position && i.employeePosition === input.position;
          return deptMatch || posMatch;
        });

        // Calcular tasa de éxito para casos similares
        let similarSuccessRate = baseSuccessRate;
        if (similarInterventions.length > 0) {
          const similarSuccessCount = similarInterventions.filter((i: any) => i.outcome === "retained").length;
          similarSuccessRate = (similarSuccessCount / similarInterventions.length) * 100;
        }

        // Ajustar por nivel de riesgo
        const riskFactor = input.riskScore / 100;
        let riskAdjustment = 1.0;
        
        if (riskFactor >= 0.7) {
          // Alto riesgo: reducir probabilidad de éxito
          riskAdjustment = 0.85;
        } else if (riskFactor >= 0.4) {
          // Riesgo medio: ajuste neutral
          riskAdjustment = 0.95;
        } else {
          // Bajo riesgo: aumentar probabilidad de éxito
          riskAdjustment = 1.05;
        }

        // Ajustar por costo
        let costAdjustment = 1.0;
        if (input.cost) {
          // Calcular costo promedio histórico
          const costsWithValues = completedInterventions.filter((i: any) => i.cost);
          const avgHistoricalCost = costsWithValues.length > 0
            ? costsWithValues.reduce((acc: any, i: any) => acc + parseFloat(i.cost || "0"), 0) / costsWithValues.length
            : 5000;

          const costRatio = input.cost / avgHistoricalCost;
          
          if (costRatio > 1.5) {
            // Costo muy alto: aumentar probabilidad (inversión mayor)
            costAdjustment = 1.1;
          } else if (costRatio < 0.5) {
            // Costo muy bajo: reducir probabilidad (inversión insuficiente)
            costAdjustment = 0.9;
          }
        }

        // Calcular probabilidad de éxito final
        const rawProbability = similarSuccessRate * riskAdjustment * costAdjustment;
        const successProbability = Math.max(5, Math.min(95, rawProbability));

        // Calcular ROI esperado
        const avgRetentionCost = calculateAvgRetentionCost(completedInterventions);
        const replacementCost = 50000; // Costo estimado de reemplazo de empleado
        const expectedROI = input.cost
          ? ((replacementCost * (successProbability / 100)) - input.cost) / input.cost * 100
          : 0;

        // Calcular reducción de riesgo esperada
        const avgRiskReduction = calculateAvgRiskReduction(completedInterventions);
        const expectedRiskReduction = avgRiskReduction * (successProbability / 100);

        // Generar factores de confianza
        const confidenceFactors = {
          dataQuality: Math.min(100, (completedInterventions.length / 10) * 100),
          similarity: similarInterventions.length > 0 ? Math.min(100, (similarInterventions.length / 5) * 100) : 30,
          riskAlignment: 100 - Math.abs(riskFactor - 0.5) * 100,
        };

        const overallConfidence = (
          confidenceFactors.dataQuality * 0.4 +
          confidenceFactors.similarity * 0.4 +
          confidenceFactors.riskAlignment * 0.2
        );

        return {
          successProbability: parseFloat(successProbability.toFixed(1)),
          expectedROI: parseFloat(expectedROI.toFixed(1)),
          expectedRiskReduction: parseFloat(expectedRiskReduction.toFixed(1)),
          confidence: parseFloat(overallConfidence.toFixed(1)),
          confidenceFactors,
          historicalData: {
            totalCases: completedInterventions.length,
            similarCases: similarInterventions.length,
            baseSuccessRate: parseFloat(baseSuccessRate.toFixed(1)),
            similarSuccessRate: parseFloat(similarSuccessRate.toFixed(1)),
            avgCost: avgRetentionCost,
          },
          recommendation: generateRecommendation(successProbability, expectedROI, overallConfidence),
        };
      } catch (error: any) {
        console.error("Error al predecir efectividad:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Error al predecir efectividad",
        });
      }
    }),
});

/**
 * Calcular costo promedio de retención
 */
function calculateAvgRetentionCost(interventions: any[]): number {
  const costsWithValues = interventions.filter((i: any) => i.cost && i.outcome === "retained");
  if (costsWithValues.length === 0) return 0;
  
  return costsWithValues.reduce((acc: any, i: any) => acc + parseFloat(i.cost || "0"), 0) / costsWithValues.length;
}

/**
 * Calcular reducción de riesgo promedio
 */
function calculateAvgRiskReduction(interventions: any[]): number {
  const withReduction = interventions.filter((i: any) => i.riskReduction);
  if (withReduction.length === 0) return 0;
  
  return withReduction.reduce((acc: any, i: any) => acc + parseFloat(i.riskReduction || "0"), 0) / withReduction.length;
}

/**
 * Generar recomendación basada en predicción
 */
function generateRecommendation(
  successProbability: number,
  expectedROI: number,
  confidence: number
): string {
  if (confidence < 40) {
    return "⚠️ Datos insuficientes para una predicción confiable. Se recomienda recopilar más información histórica antes de tomar una decisión.";
  }

  if (successProbability >= 70 && expectedROI >= 100) {
    return "✅ Intervención altamente recomendada. Alta probabilidad de éxito y excelente ROI esperado.";
  } else if (successProbability >= 60 && expectedROI >= 50) {
    return "✅ Intervención recomendada. Buena probabilidad de éxito y ROI positivo esperado.";
  } else if (successProbability >= 50) {
    return "⚠️ Intervención con riesgo moderado. Considerar alternativas o combinar con otras acciones.";
  } else {
    return "❌ Intervención no recomendada. Baja probabilidad de éxito. Explorar otras opciones.";
  }
}

/**
 * Predicción por defecto cuando hay datos insuficientes
 */
function getDefaultPrediction(input: any) {
  // Probabilidades base por tipo de intervención
  const baseRates: Record<string, number> = {
    training: 70,
    salary_adjustment: 75,
    position_change: 70,
    benefits: 65,
    recognition: 60,
    other: 50,
  };

  const baseProbability = baseRates[input.interventionType] || 50;
  
  // Ajustar por nivel de riesgo
  const riskFactor = input.riskScore / 100;
  const riskAdjustment = riskFactor >= 0.7 ? 0.85 : riskFactor >= 0.4 ? 0.95 : 1.05;
  
  const successProbability = Math.max(5, Math.min(95, baseProbability * riskAdjustment));

  // ROI estimado
  const replacementCost = 50000;
  const expectedROI = input.cost
    ? ((replacementCost * (successProbability / 100)) - input.cost) / input.cost * 100
    : 0;

  return {
    successProbability: parseFloat(successProbability.toFixed(1)),
    expectedROI: parseFloat(expectedROI.toFixed(1)),
    expectedRiskReduction: 15.0, // Estimación por defecto
    confidence: 30.0, // Baja confianza sin datos históricos
    confidenceFactors: {
      dataQuality: 0,
      similarity: 0,
      riskAlignment: 50,
    },
    historicalData: {
      totalCases: 0,
      similarCases: 0,
      baseSuccessRate: baseProbability,
      similarSuccessRate: baseProbability,
      avgCost: 0,
    },
    recommendation: "⚠️ Predicción basada en estimaciones generales. Se recomienda recopilar datos históricos para mejorar precisión.",
  };
}
