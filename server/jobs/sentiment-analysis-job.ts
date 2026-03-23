/**
 * Job de Análisis de Sentimiento Automatizado
 * Procesa respuestas de encuestas NOM-035 pendientes de análisis
 * Genera alertas automáticas para comentarios críticos
 */

import cron from "node-cron";
import { getDb, analyzeSentimentWithLLM } from "../db";
import { cases, departments, nom035Cases, notifications, sentimentAnalysis, surveyAnswers, surveyQuestions, surveyResponses, users } from "../../drizzle/schema";
import { eq, isNull, and, sql, gte, desc } from "drizzle-orm";
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
          .map((a: any) => a.answerValue)
          .join("\n\n");

        const questionContext = significantAnswers
          .map((a: any) => a.questionText)
          .join(", ");

        // Analizar sentimiento con LLM
        const analysis = await analyzeSentimentWithLLM(combinedText, questionContext);

        // Guardar análisis en base de datos
        await (db.insert(sentimentAnalysis) as any).values({
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
          await (db.insert(notifications) as any).values({
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
    
    // Verificar umbrales críticos por departamento y generar casos automáticos
    await checkCriticalThresholdAndCreateCase();
  } catch (error) {
    console.error("[Sentiment Analysis Job] Error in sentiment analysis job:", error);
  }
}

/**
 * Verificar umbrales críticos por departamento y generar casos automáticos
 * Si se detectan 3+ comentarios críticos del mismo departamento en 30 días, crea caso de prevención
 */
async function checkCriticalThresholdAndCreateCase() {
  console.log("[Sentiment Analysis Job] Checking critical thresholds by department...");
  
  const db = await getDb();
  if (!db) return;

  try {
    // Fecha límite: últimos 30 días
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Obtener análisis críticos de los últimos 30 días con departamento del usuario
    const criticalAnalyses = await db
      .select({
        analysisId: sentimentAnalysis.id,
        responseId: sentimentAnalysis.responseId,
        userId: surveyResponses.userId,
        department: users.departamento,
        riskLevel: sentimentAnalysis.riskLevel,
        summary: sentimentAnalysis.summary,
        analyzedAt: sentimentAnalysis.analyzedAt,
      })
      .from(sentimentAnalysis)
      .innerJoin(surveyResponses, eq(sentimentAnalysis.responseId, surveyResponses.id))
      .innerJoin(users, eq(surveyResponses.userId, users.id))
      .where(
        and(
          eq(sentimentAnalysis.riskLevel, "critical"),
          gte(sentimentAnalysis.analyzedAt, thirtyDaysAgo)
        )
      )
      .orderBy(desc(sentimentAnalysis.analyzedAt));

    // Agrupar por departamento
    const byDepartment: Record<string, typeof criticalAnalyses> = {};
    criticalAnalyses.forEach((analysis: any) => {
      const dept = analysis.department || "Sin departamento";
      if (!byDepartment[dept]) {
        byDepartment[dept] = [];
      }
      byDepartment[dept].push(analysis);
    });

    let casesCreated = 0;

    // Verificar umbral por departamento (3+ comentarios críticos)
    for (const [department, analyses] of Object.entries(byDepartment)) {
      if (analyses.length >= 3) {
        // Verificar si ya existe un caso generado automáticamente para este departamento en los últimos 30 días
        const existingCase = await db
          .select()
          .from(nom035Cases)
          .where(
            and(
              eq(nom035Cases.description, `[AUTO] Alerta de Riesgo Psicosocial - ${department}`),
              gte(nom035Cases.createdAt, thirtyDaysAgo)
            )
          )
          .limit(1);

        if (existingCase.length === 0) {
          // Crear caso automático de prevención
          const summaries = analyses.map((a: any) => a.summary).join("; ");
          const caseDescription = `Se detectaron ${analyses.length} comentarios críticos de riesgo psicosocial en el departamento "${department}" durante los últimos 30 días. Resúmenes: ${summaries}. Se requiere intervención preventiva inmediata.`;

          await (db.insert(nom035Cases) as any).values({
            title: `[AUTO] Alerta de Riesgo Psicosocial - ${department}`,
            description: caseDescription,
            category: "psychosocial_risk",
            priority: "critical",
            status: "open",
            source: "sentiment_analysis_auto",
            reportedBy: analyses[0].userId, // Usar primer usuario como reportante
            assignedTo: null, // Sin asignar inicialmente
            departmentId: null, // TODO: mapear departamento a departmentId si existe tabla departments
          } as any);

          // Notificar a administradores
          emitCriticalAlertToAdmins({
            id: Date.now(),
            category: "auto_case_creation",
            priority: "critical",
            title: `Caso Automático Generado: ${department}`,
            message: `Se creó automáticamente un caso de prevención para el departamento "${department}" debido a ${analyses.length} comentarios críticos detectados en 30 días.`,
          });

          casesCreated++;
          console.log(`[Sentiment Analysis Job] Auto-created case for department: ${department} (${analyses.length} critical comments)`);
        } else {
          console.log(`[Sentiment Analysis Job] Case already exists for department: ${department}`);
        }
      }
    }

    console.log(`[Sentiment Analysis Job] Critical threshold check completed: ${casesCreated} cases created`);
  } catch (error) {
    console.error("[Sentiment Analysis Job] Error checking critical thresholds:", error);
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
