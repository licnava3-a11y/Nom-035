/**
 * Router de Análisis de Sentimiento
 * Gestiona análisis automático de respuestas de encuestas NOM-035
 * Integrado con Forge LLM para análisis avanzado de riesgo psicosocial
 */

import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb, getSentimentTrends } from "../db";
import { sentimentAnalysis, surveyResponses, users, cases, surveys, departments, employees } from "../../drizzle/schema";
import { eq, and, sql, desc, like, inArray } from "drizzle-orm";
import { processPendingResponses } from "../jobs/sentiment-analysis-job";
import {
  analyzeSurveyResponse,
  analyzeDepartmentRisk,
  generateOrganizationalRiskReport,
  generateInterventionPlan,
} from "../services/psychosocialAI";

export const sentimentAnalysisRouter = router({
  /**
   * Obtener tendencias de sentimiento por departamento
   */
  getTrends: protectedProcedure
    .input(
      z.object({
        departmentId: z.number().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        riskLevel: z.enum(["low", "medium", "high", "critical", "all"]).default("all"),
      })
    )
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

        const startDate = input.startDate ? new Date(input.startDate) : undefined;
        const endDate = input.endDate ? new Date(input.endDate) : undefined;
        const trends = await getSentimentTrends(input.departmentId, startDate, endDate);

        if (!trends) return [];
        if (input.riskLevel !== "all") return trends.filter(t => t.riskLevel === input.riskLevel);
        return trends;
      } catch (error) {
        console.error("[SentimentAnalysis] Error getting trends:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error instanceof Error ? error.message : "Error al obtener tendencias" });
      }
    }),

  /**
   * Obtener estadísticas agregadas de sentimiento
   */
  getStats: protectedProcedure
    .input(
      z.object({
        departmentId: z.number().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

        const startDate = input.startDate ? new Date(input.startDate) : undefined;
        const endDate = input.endDate ? new Date(input.endDate) : undefined;
        const trends = await getSentimentTrends(input.departmentId, startDate, endDate);

        if (!trends || trends.length === 0) {
          return { total: 0, byRiskLevel: { low: 0, medium: 0, high: 0, critical: 0 }, bySentiment: { positive: 0, neutral: 0, negative: 0, critical: 0 }, criticalAlerts: 0, avgConfidence: 0 };
        }

        const byRiskLevel = {
          low: trends.filter(t => t.riskLevel === "low").length,
          medium: trends.filter(t => t.riskLevel === "medium").length,
          high: trends.filter(t => t.riskLevel === "high").length,
          critical: trends.filter(t => t.riskLevel === "critical").length,
        };
        const bySentiment = {
          positive: trends.filter(t => t.sentiment === "positive").length,
          neutral: trends.filter(t => t.sentiment === "neutral").length,
          negative: trends.filter(t => t.sentiment === "negative").length,
          critical: trends.filter(t => t.sentiment === "critical").length,
        };
        const criticalAlerts = trends.filter(t => t.alertGenerated).length;
        const avgConfidence = trends.reduce((sum: any, t: any) => sum + Number(t.confidence || 0), 0) / trends.length;

        return { total: trends.length, byRiskLevel, bySentiment, criticalAlerts, avgConfidence: Math.round(avgConfidence * 100) / 100 };
      } catch (error) {
        console.error("[SentimentAnalysis] Error getting stats:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error instanceof Error ? error.message : "Error al obtener estadísticas" });
      }
    }),

  /**
   * Obtener comentarios críticos (requieren atención inmediata)
   */
  getCriticalComments: protectedProcedure
    .input(z.object({ limit: z.number().default(20), reviewed: z.boolean().optional() }))
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

        let conditions: any[] = [eq(sentimentAnalysis.riskLevel, "critical")];
        if (input.reviewed !== undefined) {
          conditions.push(input.reviewed ? sql`${sentimentAnalysis.reviewedBy} IS NOT NULL` : sql`${sentimentAnalysis.reviewedBy} IS NULL`);
        }

        const criticalComments = await db
          .select({
            id: sentimentAnalysis.id,
            responseId: sentimentAnalysis.responseId,
            sentiment: sentimentAnalysis.sentiment,
            riskLevel: sentimentAnalysis.riskLevel,
            confidence: sentimentAnalysis.confidence,
            keywords: sentimentAnalysis.keywords,
            riskIndicators: sentimentAnalysis.riskIndicators,
            summary: sentimentAnalysis.summary,
            recommendations: sentimentAnalysis.recommendations,
            analyzedAt: sentimentAnalysis.analyzedAt,
            alertGenerated: sentimentAnalysis.alertGenerated,
            reviewedBy: sentimentAnalysis.reviewedBy,
            reviewedAt: sentimentAnalysis.reviewedAt,
            reviewNotes: sentimentAnalysis.reviewNotes,
            userId: surveyResponses.userId,
            userName: users.name,
            userDepartment: users.departamento,
          })
          .from(sentimentAnalysis)
          .leftJoin(surveyResponses, eq(sentimentAnalysis.responseId, surveyResponses.id))
          .leftJoin(users, eq(surveyResponses.userId, users.id))
          .where(and(...conditions))
          .orderBy(desc(sentimentAnalysis.analyzedAt))
          .limit(input.limit);

        return criticalComments;
      } catch (error) {
        console.error("[SentimentAnalysis] Error getting critical comments:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error instanceof Error ? error.message : "Error al obtener comentarios críticos" });
      }
    }),

  /**
   * Marcar análisis como revisado
   */
  markAsReviewed: protectedProcedure
    .input(z.object({ analysisId: z.number(), reviewNotes: z.string().optional() }))
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database connection failed" });

        await db
          .update(sentimentAnalysis)
          .set({ reviewedBy: ctx.user.id, reviewedAt: new Date(), reviewNotes: input.reviewNotes || null } as any)
          .where(eq(sentimentAnalysis.id, input.analysisId));

        return { success: true };
      } catch (error) {
        console.error("[SentimentAnalysis] Error marking as reviewed:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error instanceof Error ? error.message : "Error al marcar como revisado" });
      }
    }),

  /**
   * Ejecutar análisis manual de respuestas pendientes
   */
  runManualAnalysis: protectedProcedure.mutation(async () => {
    try {
      await processPendingResponses();
      return { success: true, message: "Análisis ejecutado correctamente" };
    } catch (error) {
      console.error("[SentimentAnalysis] Error running manual analysis:", error);
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error instanceof Error ? error.message : "Error al ejecutar análisis" });
    }
  }),

  // ─── Nuevos procedures con Forge LLM ────────────────────────────────────────

  /**
   * Analizar un texto libre bajo demanda con Forge LLM
   * Útil para análisis ad-hoc desde la UI de administración
   */
  analyzeText: adminProcedure
    .input(
      z.object({
        text: z.string().min(10, "El texto debe tener al menos 10 caracteres").max(2000),
        questionContext: z.string().optional(),
        employeeContext: z.object({
          department: z.string().optional(),
          position: z.string().optional(),
          yearsInCompany: z.number().optional(),
        }).optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const result = await analyzeSurveyResponse(input.text, input.questionContext, input.employeeContext);
        return { success: true, analysis: result };
      } catch (error) {
        console.error("[SentimentAnalysis] Error analyzing text:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error instanceof Error ? error.message : "Error al analizar el texto" });
      }
    }),

  /**
   * Generar perfil de riesgo psicosocial para un departamento con IA
   */
  getDepartmentRiskProfile: adminProcedure
    .input(
      z.object({
        departmentId: z.number().optional(),
        departmentName: z.string(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

        const startDate = input.startDate ? new Date(input.startDate) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        const endDate = input.endDate ? new Date(input.endDate) : new Date();

        // Primero intentar con datos de sentiment_analysis
        const trends = await getSentimentTrends(input.departmentId, startDate, endDate);
        let sentimentData = (trends || []).map((t: any) => ({
          sentiment: t.sentiment as string,
          riskLevel: t.riskLevel as string,
          riskIndicators: (t.riskIndicators as string[]) || [],
          analyzedAt: new Date(t.analyzedAt),
        }));

        // Si no hay datos de sentimiento, usar directamente survey_responses (Guía III)
        if (sentimentData.length === 0) {
          // Buscar el departamento por nombre para obtener su ID
          const [deptRow] = await db
            .select({ id: departments.id })
            .from(departments)
            .where(like(departments.name, `%${input.departmentName}%`))
            .limit(1);

          if (deptRow) {
            // Obtener empleados del departamento
            const empRows = await db
              .select({ userId: employees.userId })
              .from(employees)
              .where(eq(employees.departmentId, deptRow.id));

            const userIds = empRows.map((e: any) => e.userId).filter(Boolean);

            if (userIds.length > 0) {
              // Obtener encuesta Guía III
              const [g3Survey] = await db
                .select({ id: surveys.id })
                .from(surveys)
                .where(eq(surveys.type as any, "guia_iii"))
                .limit(1);

              if (g3Survey) {
                const rawResponses = await db
                  .select({ results: surveyResponses.results, userId: surveyResponses.userId })
                  .from(surveyResponses)
                  .where(and(
                    eq(surveyResponses.surveyId, g3Survey.id),
                    inArray(surveyResponses.userId, userIds)
                  ));

                // Convertir resultados crudos a formato de sentimentData
                sentimentData = rawResponses.map((r: any) => {
                  let parsed: any = {};
                  try { parsed = JSON.parse(r.results || "{}"); } catch {}
                  const score = parsed.overallScore || 3;
                  const riskLevel = score < 2.5 ? "critical" : score < 3.0 ? "high" : score < 3.5 ? "medium" : "low";
                  const sentiment = score < 2.5 ? "critical" : score < 3.0 ? "negative" : score < 3.5 ? "neutral" : "positive";
                  const domainScores = parsed.domainScores || {};
                  const riskIndicators: string[] = [];
                  if (domainScores.tiempo_trabajo < 3) riskIndicators.push("Carga de trabajo excesiva");
                  if (domainScores.liderazgo < 3) riskIndicators.push("Problemas de liderazgo");
                  if (domainScores.violencia < 3.5) riskIndicators.push("Riesgo de violencia laboral");
                  if (domainScores.ambiente_trabajo < 3) riskIndicators.push("Condiciones de trabajo deficientes");
                  if (domainScores.actividad < 3) riskIndicators.push("Factores de actividad laboral");
                  return { sentiment, riskLevel, riskIndicators, analyzedAt: new Date() };
                });
              }
            }
          }
        }

        const profile = await analyzeDepartmentRisk(input.departmentName, sentimentData);
        return { success: true, profile, dataSource: sentimentData.length > 0 ? "survey_responses" : "no_data" };
      } catch (error) {
        console.error("[SentimentAnalysis] Error generating department risk profile:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error instanceof Error ? error.message : "Error al generar perfil de riesgo" });
      }
    }),

  /**
   * Generar reporte ejecutivo organizacional completo con IA
   * Incluye estado de cumplimiento NOM-035 y plan de acción priorizado
   */
  generateOrgReport: adminProcedure
    .input(
      z.object({
        companyName: z.string().default("La Organización"),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

        const startDate = input.startDate ? new Date(input.startDate) : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
        const endDate = input.endDate ? new Date(input.endDate) : new Date();

        const trends = await getSentimentTrends(undefined, startDate, endDate);
        const allTrends = trends || [];

        const sentimentStats = {
          positive: allTrends.filter((t: any) => t.sentiment === "positive").length,
          neutral: allTrends.filter((t: any) => t.sentiment === "neutral").length,
          negative: allTrends.filter((t: any) => t.sentiment === "negative").length,
          critical: allTrends.filter((t: any) => t.sentiment === "critical").length,
        };
        const riskStats = {
          low: allTrends.filter((t: any) => t.riskLevel === "low").length,
          medium: allTrends.filter((t: any) => t.riskLevel === "medium").length,
          high: allTrends.filter((t: any) => t.riskLevel === "high").length,
          critical: allTrends.filter((t: any) => t.riskLevel === "critical").length,
        };

        const allIndicators = allTrends.flatMap((t: any) => (t.riskIndicators as string[]) || []);
        const indicatorFreq = allIndicators.reduce((acc: Record<string, number>, ind: string) => {
          acc[ind] = (acc[ind] || 0) + 1;
          return acc;
        }, {});
        const topRiskIndicators = Object.entries(indicatorFreq)
          .sort(([, a], [, b]) => (b as number) - (a as number))
          .slice(0, 8)
          .map(([indicator, count]) => ({ indicator, count: count as number }));

        const [empRow] = await db.select({ total: sql<number>`count(*)` }).from(users);
        const totalEmployees = Number(empRow?.total) || 0;

        const [openRow] = await db.select({ open: sql<number>`count(*)` }).from(cases).where(sql`${cases.status} != 'closed'`) as any;
        const [resolvedRow] = await db.select({ resolved: sql<number>`count(*)` }).from(cases).where(eq(cases.status as any, "closed")) as any;

        const report = await generateOrganizationalRiskReport({
          companyName: input.companyName,
          totalEmployees,
          totalSurveyResponses: allTrends.length || 1,
          sentimentStats,
          riskStats,
          topRiskIndicators,
          departmentsAtRisk: [],
          openCases: Number(openRow?.open) || 0,
          resolvedCases: Number(resolvedRow?.resolved) || 0,
          compliancePercentage: 75,
        });

        return { success: true, report };
      } catch (error) {
        console.error("[SentimentAnalysis] Error generating org report:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error instanceof Error ? error.message : "Error al generar reporte organizacional" });
      }
    }),

  /**
   * Generar plan de intervención con IA para un caso o departamento
   */
  generateInterventionPlan: adminProcedure
    .input(
      z.object({
        targetType: z.enum(["individual", "department", "organization"]),
        targetName: z.string(),
        riskLevel: z.enum(["low", "medium", "high", "critical"]),
        riskIndicators: z.array(z.string()),
        previousInterventions: z.array(z.string()).optional(),
        specificConcerns: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const plan = await generateInterventionPlan(input);
        return { success: true, plan };
      } catch (error) {
        console.error("[SentimentAnalysis] Error generating intervention plan:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error instanceof Error ? error.message : "Error al generar plan de intervención" });
      }
    }),
});
