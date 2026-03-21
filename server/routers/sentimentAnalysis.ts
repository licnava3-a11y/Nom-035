/**
 * Router de Análisis de Sentimiento
 * Gestiona análisis automático de respuestas de encuestas NOM-035
 */

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb, getSentimentTrends, analyzeSentimentWithLLM } from "../db";
import { sentimentAnalysis, surveyResponses, surveyAnswers, users } from "../../drizzle/schema";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import { processPendingResponses } from "../jobs/sentiment-analysis-job";

export const sentimentAnalysisRouter = router({
  /**
   * Obtener tendencias de sentimiento por departamento
   */
  getTrends: protectedProcedure
    .input(
      z.object({
        departmentId: z.number().optional(),
        startDate: z.string().optional(), // ISO date string
        endDate: z.string().optional(),
        riskLevel: z.enum(["low", "medium", "high", "critical", "all"]).default("all"),
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

        const startDate = input.startDate ? new Date(input.startDate) : undefined;
        const endDate = input.endDate ? new Date(input.endDate) : undefined;

        const trends = await getSentimentTrends(input.departmentId, startDate, endDate);

        if (!trends) {
          return [];
        }

        // Filtrar por nivel de riesgo si se especifica
        if (input.riskLevel !== "all") {
          return trends.filter(t => t.riskLevel === input.riskLevel);
        }

        return trends;
      } catch (error) {
        console.error("[SentimentAnalysis] Error getting trends:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Error al obtener tendencias",
        });
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
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database connection failed",
          });
        }

        const startDate = input.startDate ? new Date(input.startDate) : undefined;
        const endDate = input.endDate ? new Date(input.endDate) : undefined;

        const trends = await getSentimentTrends(input.departmentId, startDate, endDate);

        if (!trends || trends.length === 0) {
          return {
            total: 0,
            byRiskLevel: { low: 0, medium: 0, high: 0, critical: 0 },
            bySentiment: { positive: 0, neutral: 0, negative: 0, critical: 0 },
            criticalAlerts: 0,
            avgConfidence: 0,
          };
        }

        // Calcular estadísticas
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

        const avgConfidence =
          trends.reduce((sum: any, t: any) => sum + Number(t.confidence || 0), 0) / trends.length;

        return {
          total: trends.length,
          byRiskLevel,
          bySentiment,
          criticalAlerts,
          avgConfidence: Math.round(avgConfidence * 100) / 100,
        };
      } catch (error) {
        console.error("[SentimentAnalysis] Error getting stats:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Error al obtener estadísticas",
        });
      }
    }),

  /**
   * Obtener comentarios críticos (requieren atención inmediata)
   */
  getCriticalComments: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(20),
        reviewed: z.boolean().optional(),
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

        let conditions = [eq(sentimentAnalysis.riskLevel, "critical")];

        if (input.reviewed !== undefined) {
          if (input.reviewed) {
            conditions.push(sql`${sentimentAnalysis.reviewedBy} IS NOT NULL`);
          } else {
            conditions.push(sql`${sentimentAnalysis.reviewedBy} IS NULL`);
          }
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
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Error al obtener comentarios críticos",
        });
      }
    }),

  /**
   * Marcar análisis como revisado
   */
  markAsReviewed: protectedProcedure
    .input(
      z.object({
        analysisId: z.number(),
        reviewNotes: z.string().optional(),
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

        await db
          .update(sentimentAnalysis)
          .set({
            reviewedBy: ctx.user.id,
            reviewedAt: new Date(),
            reviewNotes: input.reviewNotes || null,
          } as any)
          .where(eq(sentimentAnalysis.id, input.analysisId));

        return { success: true };
      } catch (error) {
        console.error("[SentimentAnalysis] Error marking as reviewed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Error al marcar como revisado",
        });
      }
    }),

  /**
   * Ejecutar análisis manual de respuestas pendientes
   */
  runManualAnalysis: protectedProcedure
    .mutation(async () => {
      try {
        await processPendingResponses();
        return { success: true, message: "Análisis ejecutado correctamente" };
      } catch (error) {
        console.error("[SentimentAnalysis] Error running manual analysis:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Error al ejecutar análisis",
        });
      }
    }),
});
