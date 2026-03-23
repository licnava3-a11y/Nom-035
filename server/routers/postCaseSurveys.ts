/**
 * Router para Encuestas Post-Caso
 * Sistema de seguimiento automático 30/60/90 días después de cerrar casos
 * Mide efectividad de intervenciones NOM-035
 */

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { commonValidators } from "../validators/common";
import { getDb } from "../db";
import { cases, postCaseSurveys, surveys } from "../../drizzle/schema";
import { eq, and, gte, lte, sql, desc, isNull } from "drizzle-orm";

export const postCaseSurveysRouter = router({
  /**
   * Obtener encuestas de un caso específico
   */
  getSurveysByCase: protectedProcedure
    .input(
      z.object({
        caseId: z.number(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const surveys = await db
        .select()
        .from(postCaseSurveys)
        .where(eq(postCaseSurveys.caseId, input.caseId))
        .orderBy(postCaseSurveys.daysSinceClosure);

      return surveys;
    }),

  /**
   * Obtener todas las encuestas con filtros
   */
  getAllSurveys: protectedProcedure
    .input(
      z.object({
        status: z.enum(["pending", "sent", "completed", "expired"]).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions = [];
      if (input.status) {
        conditions.push(eq(postCaseSurveys.status, input.status));
      }
      if (input.startDate) {
        conditions.push(gte(postCaseSurveys.createdAt, new Date(input.startDate)));
      }
      if (input.endDate) {
        conditions.push(lte(postCaseSurveys.createdAt, new Date(input.endDate)));
      }

      const surveys = await db
        .select({
          survey: postCaseSurveys,
          caseNumber: cases.caseNumber,
          caseType: cases.caseType,
        })
        .from(postCaseSurveys)
        .innerJoin(cases, eq(postCaseSurveys.caseId, cases.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(postCaseSurveys.createdAt));

      return surveys;
    }),

  /**
   * Completar una encuesta (responder)
   */
  completeSurvey: protectedProcedure
    .input(
      z.object({
        surveyId: z.number(),
        improvementRating: z.number().min(1).max(5),
        satisfactionRating: z.number().min(1).max(5),
        supportRating: z.number().min(1).max(5),
        recommendationRating: z.number().min(1).max(5),
        comments: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { surveyId, ...ratings } = input;

      await db
        .update(postCaseSurveys)
        .set({
          ...ratings,
          status: "completed",
          completedAt: new Date(),
        } as any)
        .where(eq(postCaseSurveys.id, surveyId));

      return { success: true };
    }),

  /**
   * Obtener estadísticas de efectividad
   */
  getEffectivenessStats: protectedProcedure
    .input(z.object({}).optional())
    .query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Obtener todas las encuestas completadas
    const completedSurveys = await db
      .select()
      .from(postCaseSurveys)
      .where(eq(postCaseSurveys.status, "completed"));

    if (completedSurveys.length === 0) {
      return {
        totalCompleted: 0,
        avgImprovement: 0,
        avgSatisfaction: 0,
        avgSupport: 0,
        avgRecommendation: 0,
        overallScore: 0,
        byPeriod: {
          "30": { count: 0, avgScore: 0 },
          "60": { count: 0, avgScore: 0 },
          "90": { count: 0, avgScore: 0 },
        },
      };
    }

    // Calcular promedios
    const avgImprovement =
      completedSurveys.reduce((sum: any, s: any) => sum + (s.improvementRating || 0), 0) /
      completedSurveys.length;
    const avgSatisfaction =
      completedSurveys.reduce((sum: any, s: any) => sum + (s.satisfactionRating || 0), 0) /
      completedSurveys.length;
    const avgSupport =
      completedSurveys.reduce((sum: any, s: any) => sum + (s.supportRating || 0), 0) /
      completedSurveys.length;
    const avgRecommendation =
      completedSurveys.reduce((sum: any, s: any) => sum + (s.recommendationRating || 0), 0) /
      completedSurveys.length;

    const overallScore = (avgImprovement + avgSatisfaction + avgSupport + avgRecommendation) / 4;

    // Estadísticas por período
    const byPeriod = {
      "30": completedSurveys.filter((s: any) => s.daysSinceClosure === 30),
      "60": completedSurveys.filter((s: any) => s.daysSinceClosure === 60),
      "90": completedSurveys.filter((s: any) => s.daysSinceClosure === 90),
    };

    return {
      totalCompleted: completedSurveys.length,
      avgImprovement: Math.round(avgImprovement * 10) / 10,
      avgSatisfaction: Math.round(avgSatisfaction * 10) / 10,
      avgSupport: Math.round(avgSupport * 10) / 10,
      avgRecommendation: Math.round(avgRecommendation * 10) / 10,
      overallScore: Math.round(overallScore * 10) / 10,
      byPeriod: {
        "30": {
          count: byPeriod["30"].length,
          avgScore:
            byPeriod["30"].length > 0
              ? Math.round(
                  (byPeriod["30"].reduce(
                    (sum, s) =>
                      sum +
                      ((s.improvementRating || 0) +
                        (s.satisfactionRating || 0) +
                        (s.supportRating || 0) +
                        (s.recommendationRating || 0)) /
                        4,
                    0
                  ) /
                    byPeriod["30"].length) *
                    10
                ) / 10
              : 0,
        },
        "60": {
          count: byPeriod["60"].length,
          avgScore:
            byPeriod["60"].length > 0
              ? Math.round(
                  (byPeriod["60"].reduce(
                    (sum, s) =>
                      sum +
                      ((s.improvementRating || 0) +
                        (s.satisfactionRating || 0) +
                        (s.supportRating || 0) +
                        (s.recommendationRating || 0)) /
                        4,
                    0
                  ) /
                    byPeriod["60"].length) *
                    10
                ) / 10
              : 0,
        },
        "90": {
          count: byPeriod["90"].length,
          avgScore:
            byPeriod["90"].length > 0
              ? Math.round(
                  (byPeriod["90"].reduce(
                    (sum, s) =>
                      sum +
                      ((s.improvementRating || 0) +
                        (s.satisfactionRating || 0) +
                        (s.supportRating || 0) +
                        (s.recommendationRating || 0)) /
                        4,
                    0
                  ) /
                    byPeriod["90"].length) *
                    10
                ) / 10
              : 0,
        },
      },
    };
  }),

  /**
   * Job automático: Crear encuestas pendientes para casos cerrados
   * Se ejecuta diariamente para detectar casos que cumplan 30/60/90 días desde cierre
   */
  createPendingSurveys: protectedProcedure
    .input(z.object({}).optional())
    .mutation(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const today = new Date();
    const surveysCreated = [];

    // Obtener casos cerrados
    const closedCases = await db
      .select()
      .from(cases)
      .where(and(sql`${cases.status} = 'closed'`, sql`${cases.closedAt} IS NOT NULL`));

    for (const caseRecord of closedCases) {
      if (!caseRecord.closedAt) continue;

      const daysSinceClosure = Math.floor(
        (today.getTime() - new Date(caseRecord.closedAt).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Verificar si corresponde crear encuesta de 30, 60 o 90 días
      const periodsToCheck = [30, 60, 90];
      for (const period of periodsToCheck) {
        // Tolerancia de ±2 días para evitar perder encuestas
        if (Math.abs(daysSinceClosure - period) <= 2) {
          // Verificar si ya existe encuesta para este caso y período
          const existing = await db
            .select()
            .from(postCaseSurveys)
            .where(
              and(
                eq(postCaseSurveys.caseId, caseRecord.id),
                eq(postCaseSurveys.daysSinceClosure, period)
              )
            );

          if (existing.length === 0) {
            // Crear nueva encuesta
            await (db.insert(postCaseSurveys) as any).values({
              caseId: caseRecord.id,
              daysSinceClosure: period,
              status: "pending",
              createdAt: new Date(),
            });

            surveysCreated.push({
              caseId: caseRecord.id,
              caseNumber: caseRecord.caseNumber,
              period,
            });
          }
        }
      }
    }

    return {
      surveysCreated: surveysCreated.length,
      details: surveysCreated,
    };
  }),

  /**
   * Job automático: Enviar encuestas pendientes
   * Marca encuestas como "sent" y establece fecha de expiración (7 días)
   */
  sendPendingSurveys: protectedProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Obtener encuestas pendientes
    const pendingSurveys = await db
      .select()
      .from(postCaseSurveys)
      .where(eq(postCaseSurveys.status, "pending"));

    const now = new Date();
    const expirationDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 días

    for (const survey of pendingSurveys) {
      // Actualizar estado a "sent"
      await db
        .update(postCaseSurveys)
        .set({
          status: "sent",
          sentAt: now,
          expiresAt: expirationDate,
        } as any)
        .where(eq(postCaseSurveys.id, survey.id));

      // TODO: Aquí se integraría el envío de email/notificación
      // await sendSurveyEmail(survey.caseId, survey.id);
    }

    return {
      surveysSent: pendingSurveys.length,
    };
  }),

  /**
   * Job automático: Marcar encuestas expiradas
   */
  expireSurveys: protectedProcedure.mutation(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const now = new Date();

    // Obtener encuestas enviadas que ya expiraron
    const expiredSurveys = await db
      .select()
      .from(postCaseSurveys)
      .where(
        and(
          eq(postCaseSurveys.status, "sent"),
          sql`${postCaseSurveys.expiresAt} < ${now}`
        )
      );

    for (const survey of expiredSurveys) {
      await db
        .update(postCaseSurveys)
        .set({ status: "expired" } as any)
        .where(eq(postCaseSurveys.id, survey.id));
    }

    return {
      surveysExpired: expiredSurveys.length,
    };
  }),
});
