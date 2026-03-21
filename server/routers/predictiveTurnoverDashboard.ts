/**
 * Router de Dashboard de Análisis Predictivo de Rotación
 * Visualiza predicciones de rotación basadas en análisis de sentimiento, casos y encuestas NOM-035
 */

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { sentimentAnalysis, nom035Cases, surveyResponses, users, departments, nom035Results, modelThresholds } from "../../drizzle/schema";
import { eq, and, gte, desc, count, sql, inArray } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

export const predictiveTurnoverDashboardRouter = router({
  /**
   * Query: Métricas predictivas de rotación por departamento
   * Calcula probabilidad basada en:
   * - Comentarios críticos de análisis de sentimiento
   * - Casos abiertos de riesgo psicosocial
   * - Resultados de encuestas NOM-035 con nivel de riesgo alto/muy alto
   */
  getPredictiveMetrics: protectedProcedure
    .input(
      z.object({
        departmentId: z.number().optional(),
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

        const { departmentId } = input;

        // Obtener departamentos
        const depts = departmentId
          ? await db.select().from(departments).where(eq(departments.id, departmentId))
          : await db.select().from(departments);

        const metrics = [];

        for (const dept of depts) {
          // Contar empleados del departamento
          const employeeCount = await db
            .select({ count: count() })
            .from(users)
            .where(sql`${users.departamento} = ${String(dept.id)}`);

          const totalEmployees = employeeCount[0]?.count || 0;

          if (totalEmployees === 0) {
            metrics.push({
              departmentId: dept.id,
              departmentName: dept.name,
              totalEmployees: 0,
              criticalComments: 0,
              openCases: 0,
              highRiskSurveys: 0,
              turnoverProbability: 0,
              riskLevel: "low" as const,
            });
            continue;
          }

          // Comentarios críticos últimos 90 días
          const ninetyDaysAgo = new Date();
          ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

          const criticalCommentsCount = await db
            .select({ count: count() })
            .from(sentimentAnalysis)
            .innerJoin(surveyResponses, eq(sentimentAnalysis.responseId, surveyResponses.id))
            .innerJoin(users, eq(surveyResponses.userId, users.id))
            .where(
              and(
                sql`${users.departamento} = ${String(dept.id)}`,
                eq(sentimentAnalysis.riskLevel, "critical"),
                gte(sentimentAnalysis.analyzedAt, ninetyDaysAgo)
              )
            );

          const criticalComments = criticalCommentsCount[0]?.count || 0;

          // Casos abiertos de riesgo psicosocial
          const openCasesCount = await db
            .select({ count: count() })
            .from(nom035Cases)
            .where(
              and(
                sql`${nom035Cases.employeeId} IN (SELECT id FROM employees WHERE department_id = ${dept.id})`,
                sql`${nom035Cases.status} IN ('open', 'in_progress')`
              )
            );

          const openCases = openCasesCount[0]?.count || 0;

          // Encuestas con nivel de riesgo alto/muy alto últimos 180 días
          const sixMonthsAgo = new Date();
          sixMonthsAgo.setDate(sixMonthsAgo.getDate() - 180);

          const highRiskSurveysCount = await db
            .select({ count: count() })
            .from(nom035Results)
            .innerJoin(users, eq(nom035Results.employeeId, users.id))
            .where(
              and(
                sql`${users.departamento} = ${String(dept.id)}`,
                sql`${nom035Results.globalRiskLevel} IN ('Alto', 'Muy alto')`,
                gte(nom035Results.createdAt, sixMonthsAgo)
              )
            );

          const highRiskSurveys = highRiskSurveysCount[0]?.count || 0;

          // Obtener configuración activa de umbrales
          const [activeConfig] = await db!
            .select()
            .from(modelThresholds)
            .where(eq(modelThresholds.isActive, true))
            .orderBy(desc(modelThresholds.createdAt))
            .limit(1);

          // Usar umbrales configurables o valores por defecto
          const criticalCommentsWeight = (activeConfig?.criticalCommentsWeight || 40) / 100;
          const openCasesWeight = (activeConfig?.openCasesWeight || 30) / 100;
          const highRiskSurveysWeight = (activeConfig?.highRiskSurveysWeight || 30) / 100;
          const highRiskThreshold = activeConfig?.highRiskThreshold || 70;
          const mediumRiskThreshold = activeConfig?.mediumRiskThreshold || 40;

          // Calcular probabilidad de rotación (0-100) con pesos configurables
          const criticalCommentsScore = Math.min((criticalComments / totalEmployees) * 100, 100) * criticalCommentsWeight;
          const openCasesScore = Math.min((openCases / totalEmployees) * 100, 100) * openCasesWeight;
          const highRiskSurveysScore = Math.min((highRiskSurveys / totalEmployees) * 100, 100) * highRiskSurveysWeight;

          const turnoverProbability = Math.round(criticalCommentsScore + openCasesScore + highRiskSurveysScore);

          // Determinar nivel de riesgo usando umbrales configurables
          let riskLevel: "low" | "medium" | "high" | "critical" = "low";
          if (turnoverProbability >= highRiskThreshold) {
            riskLevel = "critical";
          } else if (turnoverProbability >= mediumRiskThreshold) {
            riskLevel = "high";
          } else if (turnoverProbability >= 25) {
            riskLevel = "medium";
          }

          metrics.push({
            departmentId: dept.id,
            departmentName: dept.name,
            totalEmployees,
            criticalComments,
            openCases,
            highRiskSurveys,
            turnoverProbability,
            riskLevel,
          });
        }

        // Ordenar por probabilidad de rotación (mayor a menor)
        metrics.sort((a, b) => b.turnoverProbability - a.turnoverProbability);

        return metrics;
      } catch (error) {
        console.error("[PredictiveTurnover] Error getting predictive metrics:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Error al obtener métricas predictivas",
        });
      }
    }),

  /**
   * Query: Empleados en riesgo alto de rotación
   * Identifica empleados con múltiples indicadores de riesgo
   */
  getHighRiskEmployees: protectedProcedure
    .input(
      z.object({
        departmentId: z.number().optional(),
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

        const { departmentId, limit } = input;

        // Obtener empleados con comentarios críticos recientes
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        const employeesWithCriticalComments = await db
          .select({
            userId: users.id,
            userName: users.name,
            userEmail: users.email,
            departmentName: users.departamento,
            criticalCommentsCount: count(sentimentAnalysis.id),
          })
          .from(users)
          .innerJoin(surveyResponses, eq(surveyResponses.userId, users.id))
          .innerJoin(sentimentAnalysis, eq(sentimentAnalysis.responseId, surveyResponses.id))
          .where(
            and(
              eq(sentimentAnalysis.riskLevel, "critical"),
              gte(sentimentAnalysis.analyzedAt, ninetyDaysAgo),
              departmentId ? sql`${users.departamento} = ${String(departmentId)}` : sql`1=1`
            )
          )
          .groupBy(users.id, users.name, users.email, users.departamento)
          .having(sql`COUNT(${sentimentAnalysis.id}) >= 2`) // Al menos 2 comentarios críticos
          .limit(limit);

        // Obtener resultados de encuestas NOM-035 para estos empleados
        const userIds = employeesWithCriticalComments.map(e => e.userId);

        const surveyResults = userIds.length > 0
          ? await db
              .select({
                userId: nom035Results.employeeId,
                riskLevel: nom035Results.globalRiskLevel,
                finalScore: nom035Results.globalScore,
              })
              .from(nom035Results)
              .where(inArray(nom035Results.employeeId, userIds))
              .orderBy(desc(nom035Results.createdAt))
          : [];

        // Mapear resultados de encuestas por userId
        const surveyResultsMap = new Map();
        surveyResults.forEach(result => {
          if (!surveyResultsMap.has(result.userId)) {
            surveyResultsMap.set(result.userId, result);
          }
        });

        // Combinar datos
        const highRiskEmployees = employeesWithCriticalComments.map(emp => {
          const surveyResult = surveyResultsMap.get(emp.userId);
          return {
            userId: emp.userId,
            userName: emp.userName,
            userEmail: emp.userEmail,
            departmentName: emp.departmentName,
            criticalCommentsCount: emp.criticalCommentsCount,
            lastSurveyRiskLevel: surveyResult?.riskLevel || "No disponible",
            lastSurveyScore: surveyResult?.finalScore || 0,
            riskScore: emp.criticalCommentsCount * 10 + (surveyResult?.finalScore || 0),
          };
        });

        // Ordenar por riskScore (mayor a menor)
        highRiskEmployees.sort((a, b) => b.riskScore - a.riskScore);

        return highRiskEmployees;
      } catch (error) {
        console.error("[PredictiveTurnover] Error getting high risk employees:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Error al obtener empleados en riesgo",
        });
      }
    }),

  /**
   * Mutation: Generar recomendaciones de retención con LLM
   * Analiza datos de departamento y genera recomendaciones personalizadas
   */
  generateRetentionRecommendations: protectedProcedure
    .input(
      z.object({
        departmentId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database connection failed",
          });
        }

        const { departmentId } = input;

        // Obtener datos del departamento
        const dept = await db
          .select()
          .from(departments)
          .where(eq(departments.id, departmentId))
          .limit(1);

        if (dept.length === 0) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Departamento no encontrado",
          });
        }

        // Obtener comentarios críticos recientes
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        const criticalComments = await db
          .select({
            summary: sentimentAnalysis.summary,
            keywords: sentimentAnalysis.keywords,
            analyzedAt: sentimentAnalysis.analyzedAt,
          })
          .from(sentimentAnalysis)
          .innerJoin(surveyResponses, eq(sentimentAnalysis.responseId, surveyResponses.id))
          .innerJoin(users, eq(surveyResponses.userId, users.id))
          .where(
            and(
              sql`${users.departamento} = ${String(departmentId)}`,
              eq(sentimentAnalysis.riskLevel, "critical"),
              gte(sentimentAnalysis.analyzedAt, ninetyDaysAgo)
            )
          )
          .limit(10);

        // Obtener casos abiertos
        const openCases = await db
          .select({
            title: nom035Cases.folio,
            description: nom035Cases.description,
            priority: nom035Cases.riskLevel,
          })
          .from(nom035Cases)
          .where(
            and(
              sql`${nom035Cases.employeeId} IN (SELECT id FROM employees WHERE department_id = ${departmentId})`,
              sql`${nom035Cases.status} IN ('open', 'in_progress')`
            )
          )
          .limit(5);

        // Construir prompt para LLM
        const commentsText = criticalComments.map(c => `- ${c.summary} (Palabras clave: ${c.keywords})`).join("\n");
        const casesText = openCases.map(c => `- ${c.title}: ${c.description}`).join("\n");

        const prompt = `Eres un experto en gestión de talento y prevención de rotación de personal. Analiza los siguientes datos del departamento "${dept[0].name}" y genera 5 recomendaciones específicas y accionables para reducir el riesgo de rotación:

**Comentarios críticos recientes (últimos 90 días):**
${commentsText || "No hay comentarios críticos recientes"}

**Casos abiertos de riesgo psicosocial:**
${casesText || "No hay casos abiertos"}

**Instrucciones:**
1. Identifica los patrones y problemas principales
2. Genera 5 recomendaciones concretas y accionables
3. Prioriza las recomendaciones por impacto esperado
4. Incluye métricas o indicadores para medir el éxito de cada recomendación

Formato de respuesta (JSON):
{
  "mainIssues": ["problema 1", "problema 2", "problema 3"],
  "recommendations": [
    {
      "title": "Título de la recomendación",
      "description": "Descripción detallada de la acción a tomar",
      "expectedImpact": "Alto/Medio/Bajo",
      "timeline": "Corto plazo (1-3 meses) / Mediano plazo (3-6 meses) / Largo plazo (6+ meses)",
      "successMetrics": ["métrica 1", "métrica 2"]
    }
  ]
}`;

        // Invocar LLM
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "Eres un experto en gestión de talento y prevención de rotación. Siempre respondes en formato JSON válido." },
            { role: "user", content: prompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "retention_recommendations",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  mainIssues: {
                    type: "array",
                    items: { type: "string" },
                    description: "Principales problemas identificados",
                  },
                  recommendations: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        description: { type: "string" },
                        expectedImpact: { type: "string" },
                        timeline: { type: "string" },
                        successMetrics: {
                          type: "array",
                          items: { type: "string" },
                        },
                      },
                      required: ["title", "description", "expectedImpact", "timeline", "successMetrics"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["mainIssues", "recommendations"],
                additionalProperties: false,
              },
            },
          },
        });

        const content = response.choices[0].message.content;
        const recommendations = JSON.parse(content);

        return {
          departmentName: dept[0].name,
          ...recommendations,
        };
      } catch (error) {
        console.error("[PredictiveTurnover] Error generating retention recommendations:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Error al generar recomendaciones",
        });
      }
    }),
});
