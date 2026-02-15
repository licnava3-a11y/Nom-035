/**
 * Job programado para calcular automáticamente el nivel de riesgo (riskLevel)
 * de las encuestas NOM-035 completadas y almacenar los resultados en surveyResults.
 * 
 * Ejecuta diariamente a las 2:00 AM para procesar encuestas completadas sin resultado calculado.
 */

import cron from 'node-cron';
import { getDb } from '../db';
import { surveyResponses, surveyResults, surveyAnswers } from '../../drizzle/schema';
import { eq, and, isNull, sql } from 'drizzle-orm';

/**
 * Algoritmo de cálculo de riesgo NOM-035
 * Basado en la metodología oficial de la Secretaría del Trabajo y Previsión Social (STPS)
 * 
 * Categorías evaluadas:
 * 1. Ambiente de trabajo
 * 2. Factores propios de la actividad
 * 3. Organización del tiempo de trabajo
 * 4. Liderazgo y relaciones en el trabajo
 * 5. Entorno organizacional
 * 
 * Niveles de riesgo:
 * - Nulo o despreciable (low): 0-20 puntos
 * - Bajo (medium): 21-45 puntos
 * - Medio (high): 46-70 puntos
 * - Alto (very_high): 71-100 puntos
 */

interface CategoryScore {
  category: string;
  score: number;
  maxScore: number;
  percentage: number;
}

interface DomainScore {
  domain: string;
  score: number;
  maxScore: number;
  percentage: number;
}

async function calculateRiskLevel() {
  console.log('[Calculate Risk Level Job] Starting risk level calculation...');
  
  try {
    const db = await getDb();
    if (!db) {
      console.error('[Calculate Risk Level Job] Database not available');
      return;
    }

    // 1. Obtener respuestas completadas sin resultado calculado
    const pendingResponses = await db
      .select({
        responseId: surveyResponses.id,
        userId: surveyResponses.userId,
        surveyId: surveyResponses.surveyId,
        periodId: surveyResponses.periodId,
        completedAt: surveyResponses.completedAt,
      })
      .from(surveyResponses)
      .leftJoin(surveyResults, eq(surveyResults.responseId, surveyResponses.id))
      .where(
        and(
          sql`${surveyResponses.completedAt} IS NOT NULL`, // Completada
          isNull(surveyResults.id) // No tiene resultado calculado
        )
      )
      .limit(100); // Procesar máximo 100 por ejecución

    console.log(`[Calculate Risk Level Job] Found ${pendingResponses.length} pending responses`);

    let processed = 0;
    let errors = 0;

    for (const response of pendingResponses) {
      try {
        // 2. Obtener todas las respuestas de la encuesta
        const answers = await db
          .select({
            questionId: surveyAnswers.questionId,
            answerValue: surveyAnswers.answerValue,
          })
          .from(surveyAnswers)
          .where(eq(surveyAnswers.responseId, response.responseId));

        if (answers.length === 0) {
          console.warn(`[Calculate Risk Level Job] No answers found for response ${response.responseId}`);
          continue;
        }

        // 3. Calcular puntaje total (simplificado - en producción usar algoritmo oficial NOM-035)
        // Aquí se asume que cada respuesta tiene un valor numérico (0-4)
        const totalScore = answers.reduce((sum, answer) => {
          const value = typeof answer.answerValue === 'string' ? parseInt(answer.answerValue, 10) : Number(answer.answerValue);
          return sum + (isNaN(value) ? 0 : value);
        }, 0);

        const maxPossibleScore = answers.length * 4; // Asumiendo escala 0-4
        const scorePercentage = (totalScore / maxPossibleScore) * 100;

        // 4. Determinar nivel de riesgo según NOM-035
        let riskLevel: 'low' | 'medium' | 'high' | 'very_high';
        if (scorePercentage <= 20) {
          riskLevel = 'low';
        } else if (scorePercentage <= 45) {
          riskLevel = 'medium';
        } else if (scorePercentage <= 70) {
          riskLevel = 'high';
        } else {
          riskLevel = 'very_high';
        }

        // 5. Generar recomendaciones basadas en nivel de riesgo
        const recommendations: string[] = [];
        if (riskLevel === 'very_high') {
          recommendations.push('Intervención inmediata requerida');
          recommendations.push('Evaluación psicológica individual');
          recommendations.push('Plan de acción correctiva urgente');
        } else if (riskLevel === 'high') {
          recommendations.push('Monitoreo cercano recomendado');
          recommendations.push('Evaluación de factores de riesgo específicos');
          recommendations.push('Implementar acciones preventivas');
        } else if (riskLevel === 'medium') {
          recommendations.push('Seguimiento periódico');
          recommendations.push('Reforzar medidas preventivas');
        } else {
          recommendations.push('Mantener condiciones actuales');
          recommendations.push('Evaluación anual de seguimiento');
        }

        // 6. Calcular scores por categoría (simplificado)
        const categoryScores: CategoryScore[] = [
          {
            category: 'Ambiente de trabajo',
            score: Math.floor(totalScore * 0.2),
            maxScore: Math.floor(maxPossibleScore * 0.2),
            percentage: scorePercentage,
          },
          {
            category: 'Factores propios de la actividad',
            score: Math.floor(totalScore * 0.25),
            maxScore: Math.floor(maxPossibleScore * 0.25),
            percentage: scorePercentage,
          },
          {
            category: 'Organización del tiempo',
            score: Math.floor(totalScore * 0.15),
            maxScore: Math.floor(maxPossibleScore * 0.15),
            percentage: scorePercentage,
          },
          {
            category: 'Liderazgo y relaciones',
            score: Math.floor(totalScore * 0.25),
            maxScore: Math.floor(maxPossibleScore * 0.25),
            percentage: scorePercentage,
          },
          {
            category: 'Entorno organizacional',
            score: Math.floor(totalScore * 0.15),
            maxScore: Math.floor(maxPossibleScore * 0.15),
            percentage: scorePercentage,
          },
        ];

        // 7. Almacenar resultado en surveyResults
        await db.insert(surveyResults).values({
          responseId: response.responseId,
          userId: response.userId || undefined,
          surveyId: response.surveyId,
          periodId: response.periodId || undefined,
          totalScore,
          riskLevel,
          categoryScores: JSON.stringify(categoryScores),
          domainScores: JSON.stringify([]), // Placeholder para dominios
          recommendations: JSON.stringify(recommendations),
          calculatedAt: new Date(),
          completedAt: response.completedAt || undefined,
        });

        processed++;
        console.log(`[Calculate Risk Level Job] Processed response ${response.responseId}: ${riskLevel} (${scorePercentage.toFixed(1)}%)`);

      } catch (error) {
        errors++;
        console.error(`[Calculate Risk Level Job] Error processing response ${response.responseId}:`, error);
      }
    }

    console.log(`[Calculate Risk Level Job] Calculation completed: { processed: ${processed}, errors: ${errors} }`);

  } catch (error) {
    console.error('[Calculate Risk Level Job] Fatal error:', error);
  }
}

// Programar ejecución diaria a las 2:00 AM
export function startCalculateRiskLevelJob() {
  console.log('[Calculate Risk Level Job] Scheduling daily risk level calculation at 2:00 AM');
  
  // Ejecutar inmediatamente al iniciar (para testing)
  // calculateRiskLevel();
  
  // Programar ejecución diaria a las 2:00 AM
  cron.schedule('0 2 * * *', async () => {
    console.log('[Calculate Risk Level Job] Running scheduled risk level calculation');
    await calculateRiskLevel();
  });
}
