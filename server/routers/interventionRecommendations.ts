/**
 * Router de Recomendaciones Inteligentes de Intervenciones
 * Sugiere automáticamente el tipo de intervención más efectiva para empleados de alto riesgo
 */

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { retentionInterventions } from "../../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";

interface InterventionRecommendation {
  interventionType: string;
  score: number;
  successProbability: number;
  avgCost: number;
  historicalSuccessRate: number;
  reasoning: string;
  similarCases: number;
}

export const interventionRecommendationsRouter = router({
  /**
   * Obtener recomendaciones inteligentes para un empleado
   */
  getRecommendations: protectedProcedure
    .input(
      z.object({
        employeeId: z.number(),
        employeeName: z.string(),
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

        // Obtener todas las intervenciones históricas
        const allInterventions = await db.select().from(retentionInterventions);

        // Filtrar intervenciones con outcome conocido
        const completedInterventions = allInterventions.filter(
          (i) => i.outcome === "retained" || i.outcome === "left"
        );

        if (completedInterventions.length === 0) {
          // Si no hay datos históricos, devolver recomendaciones por defecto
          return {
            recommendations: getDefaultRecommendations(input.riskScore),
            hasHistoricalData: false,
          };
        }

        // Calcular efectividad por tipo de intervención
        const interventionTypes = ["training", "salary_adjustment", "position_change", "benefits", "recognition", "other"];
        const recommendations: InterventionRecommendation[] = [];

        for (const type of interventionTypes) {
          const typeInterventions = completedInterventions.filter((i) => i.interventionType === type);

          if (typeInterventions.length === 0) continue;

          // Calcular tasa de éxito general
          const successCount = typeInterventions.filter((i) => i.outcome === "retained").length;
          const successRate = (successCount / typeInterventions.length) * 100;

          // Filtrar intervenciones similares (mismo departamento o puesto)
          const similarInterventions = typeInterventions.filter((i) => {
            const deptMatch = input.department && i.department === input.department;
            const posMatch = input.position && i.employeePosition === input.position;
            return deptMatch || posMatch;
          });

          const similarSuccessCount = similarInterventions.filter((i) => i.outcome === "retained").length;
          const similarSuccessRate = similarInterventions.length > 0
            ? (similarSuccessCount / similarInterventions.length) * 100
            : successRate;

          // Calcular costo promedio
          const costsWithValues = typeInterventions.filter((i) => i.cost);
          const avgCost = costsWithValues.length > 0
            ? costsWithValues.reduce((acc, i) => acc + parseFloat(i.cost || "0"), 0) / costsWithValues.length
            : 0;

          // Calcular score basado en múltiples factores
          const riskFactor = input.riskScore / 100; // 0-1
          const similarityBonus = similarInterventions.length > 0 ? 1.2 : 1.0;
          const costPenalty = avgCost > 0 ? Math.max(0.5, 1 - (avgCost / 50000)) : 1.0; // Penalizar costos altos

          const baseScore = (similarSuccessRate / 100) * similarityBonus * costPenalty;
          const adjustedScore = baseScore * (0.7 + (riskFactor * 0.3)); // Mayor peso para alto riesgo

          // Calcular probabilidad de éxito
          const successProbability = Math.min(95, similarSuccessRate * (similarityBonus * 0.9));

          // Generar razonamiento
          const reasoning = generateReasoning(
            type,
            similarSuccessRate,
            similarInterventions.length,
            input.department,
            input.position,
            avgCost
          );

          recommendations.push({
            interventionType: type,
            score: parseFloat((adjustedScore * 100).toFixed(2)),
            successProbability: parseFloat(successProbability.toFixed(1)),
            avgCost: parseFloat(avgCost.toFixed(2)),
            historicalSuccessRate: parseFloat(similarSuccessRate.toFixed(1)),
            reasoning,
            similarCases: similarInterventions.length,
          });
        }

        // Ordenar por score descendente y tomar top 3
        const topRecommendations = recommendations
          .sort(($a: any, $b: any) => b.score - a.score)
          .slice(0, 3);

        return {
          recommendations: topRecommendations,
          hasHistoricalData: true,
          totalHistoricalCases: completedInterventions.length,
        };
      } catch (error: any) {
        console.error("Error al generar recomendaciones:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Error al generar recomendaciones",
        });
      }
    }),
});

/**
 * Generar razonamiento para la recomendación
 */
function generateReasoning(
  type: string,
  successRate: number,
  similarCases: number,
  department?: string,
  position?: string,
  avgCost?: number
): string {
  const typeLabels: Record<string, string> = {
    training: "Capacitación",
    salary_adjustment: "Ajuste Salarial",
    position_change: "Cambio de Puesto",
    benefits: "Beneficios",
    recognition: "Reconocimiento",
    other: "Otra intervención",
  };

  const label = typeLabels[type] || type;
  let reasoning = `${label} ha mostrado una tasa de éxito del ${successRate.toFixed(1)}%`;

  if (similarCases > 0) {
    reasoning += ` en ${similarCases} caso${similarCases > 1 ? "s" : ""} similar${similarCases > 1 ? "es" : ""}`;
    if (department) {
      reasoning += ` en el departamento de ${department}`;
    } else if (position) {
      reasoning += ` para el puesto de ${position}`;
    }
  } else {
    reasoning += " en casos generales";
  }

  if (avgCost && avgCost > 0) {
    reasoning += `. Costo promedio: $${avgCost.toFixed(2)} MXN`;
  }

  // Agregar recomendación específica según tipo
  if (type === "training") {
    reasoning += ". Recomendado para desarrollar habilidades y aumentar engagement.";
  } else if (type === "salary_adjustment") {
    reasoning += ". Efectivo cuando hay brecha salarial con el mercado.";
  } else if (type === "position_change") {
    reasoning += ". Útil para empleados con potencial de crecimiento.";
  } else if (type === "benefits") {
    reasoning += ". Mejora el balance vida-trabajo y satisfacción general.";
  } else if (type === "recognition") {
    reasoning += ". Bajo costo y alto impacto en motivación.";
  }

  return reasoning;
}

/**
 * Recomendaciones por defecto cuando no hay datos históricos
 */
function getDefaultRecommendations(riskScore: number): InterventionRecommendation[] {
  const recommendations: InterventionRecommendation[] = [];

  if (riskScore >= 70) {
    // Alto riesgo: intervenciones fuertes
    recommendations.push({
      interventionType: "salary_adjustment",
      score: 85,
      successProbability: 75,
      avgCost: 15000,
      historicalSuccessRate: 75,
      reasoning: "Ajuste salarial es altamente efectivo para retener talento de alto riesgo. Recomendado cuando hay brecha salarial con el mercado.",
      similarCases: 0,
    });
    recommendations.push({
      interventionType: "position_change",
      score: 75,
      successProbability: 70,
      avgCost: 5000,
      historicalSuccessRate: 70,
      reasoning: "Cambio de puesto ofrece nuevos desafíos y oportunidades de crecimiento. Útil para empleados con potencial de desarrollo.",
      similarCases: 0,
    });
    recommendations.push({
      interventionType: "benefits",
      score: 70,
      successProbability: 65,
      avgCost: 8000,
      historicalSuccessRate: 65,
      reasoning: "Mejora de beneficios aumenta satisfacción y balance vida-trabajo. Efectivo para retención a mediano plazo.",
      similarCases: 0,
    });
  } else if (riskScore >= 40) {
    // Riesgo medio: intervenciones moderadas
    recommendations.push({
      interventionType: "training",
      score: 80,
      successProbability: 70,
      avgCost: 3000,
      historicalSuccessRate: 70,
      reasoning: "Capacitación desarrolla habilidades y aumenta engagement. Recomendado para empleados con deseos de crecimiento profesional.",
      similarCases: 0,
    });
    recommendations.push({
      interventionType: "recognition",
      score: 75,
      successProbability: 65,
      avgCost: 500,
      historicalSuccessRate: 65,
      reasoning: "Reconocimiento tiene bajo costo y alto impacto en motivación. Efectivo para mejorar clima laboral.",
      similarCases: 0,
    });
    recommendations.push({
      interventionType: "benefits",
      score: 70,
      successProbability: 60,
      avgCost: 8000,
      historicalSuccessRate: 60,
      reasoning: "Mejora de beneficios aumenta satisfacción general. Útil para empleados que valoran balance vida-trabajo.",
      similarCases: 0,
    });
  } else {
    // Bajo riesgo: intervenciones preventivas
    recommendations.push({
      interventionType: "recognition",
      score: 85,
      successProbability: 80,
      avgCost: 500,
      historicalSuccessRate: 80,
      reasoning: "Reconocimiento mantiene motivación alta. Bajo costo y efectivo para prevención.",
      similarCases: 0,
    });
    recommendations.push({
      interventionType: "training",
      score: 75,
      successProbability: 75,
      avgCost: 3000,
      historicalSuccessRate: 75,
      reasoning: "Capacitación continua mantiene engagement. Recomendado para desarrollo profesional sostenido.",
      similarCases: 0,
    });
    recommendations.push({
      interventionType: "benefits",
      score: 65,
      successProbability: 70,
      avgCost: 8000,
      historicalSuccessRate: 70,
      reasoning: "Mejora de beneficios fortalece compromiso a largo plazo. Útil para retención preventiva.",
      similarCases: 0,
    });
  }

  return recommendations;
}
