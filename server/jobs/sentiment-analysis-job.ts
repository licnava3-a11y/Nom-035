/**
 * Job de Análisis de Sentimiento Automatizado
 * Procesa respuestas de encuestas NOM-035 pendientes de análisis
 * Genera alertas automáticas para comentarios críticos
 */

import cron from "node-cron";
import { getDb, analyzeSentimentWithLLM } from "../db";
import { surveyResponses, surveyAnswers, sentimentAnalysis, surveyQuestions, notifications } from "../../drizzle/schema";
import { eq, isNull, and, sql } from "drizzle-orm";
import { emitCriticalAlertToAdmins } from "../_core/websocket";

/**
 * Procesar respuestas pendientes de análisis
 */
async function processPendingResponses() {
  console.log("[Sentiment Analysis Job] Starting automated sentiment analysis...");
  
  const db = await getDb();
  if (!db) {
    console.error("[Sentiment Analysis Job] Database not available");
    return;
  }

  try {
    // Obtener respuestas completadas sin análisis de sentimiento
    const pendingResponses = await db
      .select({
        responseId: surveyResponses.id,
        userId: surveyResponses.userId,
        surveyId: surveyResponses.surveyId,
        completedAt: surveyResponses.completedAt,
      })
      .from(surveyResponses)
      .leftJoin(sentimentAnalysis, eq(surveyResponses.id, sentimentAnalysis.responseId))
      .where(
        and(
          isNull(sentimentAnalysis.id), // Sin análisis previo
          sql`${surveyResponses.completedAt} IS NOT NULL` // Respuesta completada
        )
      )
      .limit(50); // Procesar máximo 50 respuestas por ejecución

    console.log(`[Sentiment Analysis Job] Found ${pendingResponses.length} pending responses`);

    let analyzed = 0;
    let errors = 0;
    let criticalAlerts = 0;

    for (const response of pendingResponses) {
      try {
        // Obtener respuestas de texto libre (preguntas abiertas)
        const textAnswers = await db
          .select({
            answerId: surveyAnswers.id,
            answerValue: surveyAnswers.answerValue,
            questionText: surveyQuestions.questionText,
          })
          .from(surveyAnswers)
          .leftJoin(surveyQuestions, eq(surveyAnswers.questionId, surveyQuestions.id))
          .where(eq(surveyAnswers.responseId, response.responseId));

        // Filtrar solo respuestas de texto significativas (más de 20 caracteres)
        const significantAnswers = textAnswers.filter(
          a => a.answerValue && a.answerValue.length > 20
        );

        if (significantAnswers.length === 0) {
          console.log(`[Sentiment Analysis Job] No significant text answers for response ${response.responseId}, skipping`);
          continue;
        }

        // Concatenar todas las respuestas de texto para análisis global
        const combinedText = significantAnswers
          .map(a => a.answerValue)
          .join("\n\n");

        const questionContext = significantAnswers
          .map(a => a.questionText)
          .join(", ");

        // Analizar sentimiento con LLM
        const analysis = await analyzeSentimentWithLLM(combinedText, questionContext);

        // Guardar análisis en base de datos
        await db.insert(sentimentAnalysis).values({
          responseId: response.responseId,
          sentiment: analysis.sentiment,
          riskLevel: analysis.riskLevel,
          confidence: analysis.confidence.toString(),
          keywords: JSON.stringify(analysis.keywords),
          riskIndicators: JSON.stringify(analysis.riskIndicators),
          summary: analysis.summary,
          recommendations: analysis.recommendations,
          alertGenerated: analysis.riskLevel === "critical",
        });

        analyzed++;

        // Generar alerta automática si es crítico
        if (analysis.riskLevel === "critical" && response.userId) {
          await db.insert(notifications).values({
            userId: response.userId,
            type: "sentiment_critical" as any,
            title: "⚠️ Alerta de Riesgo Psicosocial Crítico",
            message: `Se detectó un nivel crítico de riesgo psicosocial en una encuesta. Resumen: ${analysis.summary}`,
            relatedEntityType: "survey_response",
            relatedEntityId: response.responseId,
            isRead: false,
          } as any);

          // Emitir alerta a administradores vía WebSocket
          emitCriticalAlertToAdmins({
            id: response.responseId,
            category: "sentiment_analysis",
            priority: "critical",
            title: "Riesgo Psicosocial Crítico Detectado",
            message: `Análisis de sentimiento detectó riesgo crítico: ${analysis.summary}. Indicadores: ${analysis.riskIndicators.join(", ")}`,
          });

          criticalAlerts++;
          console.log(`[Sentiment Analysis Job] Critical alert generated for response ${response.responseId}`);
        }

        console.log(`[Sentiment Analysis Job] Analyzed response ${response.responseId}: ${analysis.sentiment} / ${analysis.riskLevel}`);
      } catch (error) {
        console.error(`[Sentiment Analysis Job] Error analyzing response ${response.responseId}:`, error);
        errors++;
      }
    }

    console.log(`[Sentiment Analysis Job] Completed: ${analyzed} analyzed, ${criticalAlerts} critical alerts, ${errors} errors`);
  } catch (error) {
    console.error("[Sentiment Analysis Job] Error in sentiment analysis job:", error);
  }
}

/**
 * Inicializar job de análisis de sentimiento
 * Ejecuta cada 6 horas
 */
export function initializeSentimentAnalysisJob() {
  // Ejecutar cada 6 horas (a las 00:00, 06:00, 12:00, 18:00)
  cron.schedule("0 0,6,12,18 * * *", async () => {
    await processPendingResponses();
  });

  console.log("[Sentiment Analysis Job] Scheduled to run every 6 hours");
}

// Exportar función para ejecución manual
export { processPendingResponses };
