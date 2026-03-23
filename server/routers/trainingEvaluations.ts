import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { committeeTrainings, evaluations, trainingAssignments, trainingEvaluations, users } from "../../drizzle/schema";
import { eq, and, desc, sql, avg } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const trainingEvaluationsRouter = router({
  /**
   * Crear evaluación de capacitación
   */
  create: protectedProcedure
    .input(
      z.object({
        assignmentId: z.number(),
        instructorKnowledge: z.number().min(1).max(5),
        instructorCommunication: z.number().min(1).max(5),
        instructorEngagement: z.number().min(1).max(5),
        contentRelevance: z.number().min(1).max(5),
        contentClarity: z.number().min(1).max(5),
        contentDepth: z.number().min(1).max(5),
        practicalApplication: z.number().min(1).max(5),
        workplaceRelevance: z.number().min(1).max(5),
        overallSatisfaction: z.number().min(1).max(5),
        wouldRecommend: z.enum(["yes", "no", "maybe"]),
        strengths: z.string().optional(),
        improvements: z.string().optional(),
        additionalComments: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Verificar que la asignación existe y pertenece al usuario
      const [assignment] = await db
        .select()
        .from(trainingAssignments)
        .where(eq(trainingAssignments.id, input.assignmentId));

      if (!assignment) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Asignación no encontrada" });
      }

      if (assignment.committeeMemberId !== ctx.user.id && ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes permiso para evaluar esta capacitación" });
      }

      // Verificar que no exista ya una evaluación
      const [existing] = await db
        .select()
        .from(trainingEvaluations)
        .where(eq(trainingEvaluations.assignmentId, input.assignmentId));

      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "Ya existe una evaluación para esta capacitación" });
      }

      const [newEvaluation] = await (db.insert(trainingEvaluations) as any).values({
        assignmentId: input.assignmentId,
        evaluatorId: ctx.user.id,
        instructorKnowledge: input.instructorKnowledge,
        instructorCommunication: input.instructorCommunication,
        instructorEngagement: input.instructorEngagement,
        contentRelevance: input.contentRelevance,
        contentClarity: input.contentClarity,
        contentDepth: input.contentDepth,
        practicalApplication: input.practicalApplication,
        workplaceRelevance: input.workplaceRelevance,
        overallSatisfaction: input.overallSatisfaction,
        wouldRecommend: input.wouldRecommend,
        strengths: input.strengths,
        improvements: input.improvements,
        additionalComments: input.additionalComments,
      });

      return { success: true, evaluationId: newEvaluation.insertId, message: "Evaluación creada exitosamente" };
    }),

  /**
   * Obtener evaluación por ID de asignación
   */
  getByAssignmentId: protectedProcedure
    .input(z.object({ assignmentId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const [evaluation] = await db
        .select({
          evaluation: trainingEvaluations,
          evaluator: users,
        })
        .from(trainingEvaluations)
        .leftJoin(users, eq(trainingEvaluations.evaluatorId, users.id))
        .where(eq(trainingEvaluations.assignmentId, input.assignmentId));

      return evaluation || null;
    }),

  /**
   * Listar todas las evaluaciones con filtros
   */
  list: protectedProcedure
    .input(
      z.object({
        trainingId: z.number().optional(),
        evaluatorId: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const conditions = [];
      if (input.trainingId) {
        conditions.push(eq(trainingAssignments.trainingId, input.trainingId));
      }
      if (input.evaluatorId) {
        conditions.push(eq(trainingEvaluations.evaluatorId, input.evaluatorId));
      }

      const evaluations = await db
        .select({
          evaluation: trainingEvaluations,
          assignment: trainingAssignments,
          training: committeeTrainings,
          evaluator: users,
        })
        .from(trainingEvaluations)
        .leftJoin(trainingAssignments, eq(trainingEvaluations.assignmentId, trainingAssignments.id))
        .leftJoin(committeeTrainings, eq(trainingAssignments.trainingId, committeeTrainings.id))
        .leftJoin(users, eq(trainingEvaluations.evaluatorId, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(trainingEvaluations.createdAt));

      return evaluations;
    }),

  /**
   * Dashboard de calificaciones por capacitación
   */
  getTrainingDashboard: protectedProcedure
    .input(z.object({ trainingId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Obtener todas las evaluaciones de la capacitación
      const evaluations = await db
        .select({
          evaluation: trainingEvaluations,
          assignment: trainingAssignments,
          evaluator: users,
        })
        .from(trainingEvaluations)
        .leftJoin(trainingAssignments, eq(trainingEvaluations.assignmentId, trainingAssignments.id))
        .leftJoin(users, eq(trainingEvaluations.evaluatorId, users.id))
        .where(eq(trainingAssignments.trainingId, input.trainingId));

      if (evaluations.length === 0) {
        return {
          totalEvaluations: 0,
          averages: null,
          recommendation: { yes: 0, no: 0, maybe: 0 },
          evaluations: [],
        };
      }

      // Calcular promedios
      const totals = evaluations.reduce(
        (acc, item) => {
          const e = item.evaluation;
          return {
            instructorKnowledge: acc.instructorKnowledge + e.instructorKnowledge,
            instructorCommunication: acc.instructorCommunication + e.instructorCommunication,
            instructorEngagement: acc.instructorEngagement + e.instructorEngagement,
            contentRelevance: acc.contentRelevance + e.contentRelevance,
            contentClarity: acc.contentClarity + e.contentClarity,
            contentDepth: acc.contentDepth + e.contentDepth,
            practicalApplication: acc.practicalApplication + e.practicalApplication,
            workplaceRelevance: acc.workplaceRelevance + e.workplaceRelevance,
            overallSatisfaction: acc.overallSatisfaction + e.overallSatisfaction,
          };
        },
        {
          instructorKnowledge: 0,
          instructorCommunication: 0,
          instructorEngagement: 0,
          contentRelevance: 0,
          contentClarity: 0,
          contentDepth: 0,
          practicalApplication: 0,
          workplaceRelevance: 0,
          overallSatisfaction: 0,
        }
      );

      const count = evaluations.length;
      const averages = {
        instructorKnowledge: totals.instructorKnowledge / count,
        instructorCommunication: totals.instructorCommunication / count,
        instructorEngagement: totals.instructorEngagement / count,
        contentRelevance: totals.contentRelevance / count,
        contentClarity: totals.contentClarity / count,
        contentDepth: totals.contentDepth / count,
        practicalApplication: totals.practicalApplication / count,
        workplaceRelevance: totals.workplaceRelevance / count,
        overallSatisfaction: totals.overallSatisfaction / count,
        instructorAverage: (totals.instructorKnowledge + totals.instructorCommunication + totals.instructorEngagement) / (count * 3),
        contentAverage: (totals.contentRelevance + totals.contentClarity + totals.contentDepth) / (count * 3),
        applicationAverage: (totals.practicalApplication + totals.workplaceRelevance) / (count * 2),
      };

      // Contar recomendaciones
      const recommendation = evaluations.reduce(
        (acc, item) => {
          acc[item.evaluation.wouldRecommend]++;
          return acc;
        },
        { yes: 0, no: 0, maybe: 0 }
      );

      return {
        totalEvaluations: count,
        averages,
        recommendation,
        evaluations,
      };
    }),

  /**
   * Dashboard global de todas las capacitaciones
   */
  getGlobalDashboard: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    // Obtener todas las evaluaciones
    const allEvaluations = await db
      .select({
        evaluation: trainingEvaluations,
        assignment: trainingAssignments,
        training: committeeTrainings,
      })
      .from(trainingEvaluations)
      .leftJoin(trainingAssignments, eq(trainingEvaluations.assignmentId, trainingAssignments.id))
      .leftJoin(committeeTrainings, eq(trainingAssignments.trainingId, committeeTrainings.id));

    // Agrupar por capacitación
    const byTraining = allEvaluations.reduce((acc: any, item: any) => {
      const trainingId = item.training?.id;
      if (!trainingId) return acc;

      if (!acc[trainingId]) {
        acc[trainingId] = {
          training: item.training,
          evaluations: [],
        };
      }
      acc[trainingId].evaluations.push(item.evaluation);
      return acc;
    }, {} as Record<number, { training: any; evaluations: any[] }>);

    // Calcular promedios por capacitación
    const trainingStats = Object.values(byTraining).map((item: any) => {
      const count = item.evaluations.length;
      const avgOverall = item.evaluations.reduce((sum: any, e: any) => sum + e.overallSatisfaction, 0) / count;
      const avgInstructor =
        item.evaluations.reduce((sum: any, e: any) => sum + e.instructorKnowledge + e.instructorCommunication + e.instructorEngagement, 0) / (count * 3);
      const avgContent = item.evaluations.reduce((sum: any, e: any) => sum + e.contentRelevance + e.contentClarity + e.contentDepth, 0) / (count * 3);

      return {
        training: item.training,
        totalEvaluations: count,
        avgOverall,
        avgInstructor,
        avgContent,
      };
    });

    // Ordenar por calificación general
    trainingStats.sort((a: any, b: any) => b.avgOverall - a.avgOverall);

    // Estadísticas globales
    const totalEvaluations = allEvaluations.length;
    const globalAvgOverall = allEvaluations.reduce((sum: any, item: any) => sum + item.evaluation.overallSatisfaction, 0) / totalEvaluations;
    const globalRecommendation = allEvaluations.reduce(
      (acc, item) => {
        acc[item.evaluation.wouldRecommend]++;
        return acc;
      },
      { yes: 0, no: 0, maybe: 0 }
    );

    return {
      totalEvaluations,
      globalAvgOverall,
      globalRecommendation,
      topTrainings: trainingStats.slice(0, 5),
      allTrainings: trainingStats,
    };
  }),

  /**
   * Obtener comentarios de mejora
   */
  getImprovementComments: protectedProcedure
    .input(z.object({ trainingId: z.number().optional() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const conditions = input.trainingId ? [eq(trainingAssignments.trainingId, input.trainingId)] : [];

      const comments = await db
        .select({
          evaluation: trainingEvaluations,
          training: committeeTrainings,
          evaluator: users,
        })
        .from(trainingEvaluations)
        .leftJoin(trainingAssignments, eq(trainingEvaluations.assignmentId, trainingAssignments.id))
        .leftJoin(committeeTrainings, eq(trainingAssignments.trainingId, committeeTrainings.id))
        .leftJoin(users, eq(trainingEvaluations.evaluatorId, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(trainingEvaluations.createdAt));

      return comments.filter((c: any) => c.evaluation.improvements || c.evaluation.strengths || c.evaluation.additionalComments);
    }),
});
