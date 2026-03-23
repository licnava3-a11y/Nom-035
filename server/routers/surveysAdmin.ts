import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { departments, surveyAnswers, surveyQuestions, surveyResponses, surveys, users } from "../../drizzle/schema";
import { eq, and, gte, lte, sql, desc, count, inArray } from "drizzle-orm";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Solo los administradores pueden acceder a este recurso' });
  }
  return next({ ctx });
});

export const surveysAdminRouter = router({
  // Obtener estadísticas generales de encuestas
  getStats: adminProcedure
    .input(z.object({
      surveyType: z.enum(['guia_i', 'guia_ii', 'guia_iii', 'all']).optional().default('all'),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Build where conditions
      const conditions = [];
      if (input.surveyType !== 'all') {
        const [survey] = await db.select().from(surveys).where(eq(surveys.type, input.surveyType)).limit(1);
        if (survey) {
          conditions.push(eq(surveyResponses.surveyId, survey.id));
        }
      }
      if (input.startDate) {
        conditions.push(gte(surveyResponses.startedAt, new Date(input.startDate)));
      }
      if (input.endDate) {
        conditions.push(lte(surveyResponses.startedAt, new Date(input.endDate)));
      }

      // Get total responses
      const [totalResult] = await db
        .select({ count: count() })
        .from(surveyResponses)
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      // Get completed responses
      const completedConditions = [...conditions, sql`${surveyResponses.completedAt} IS NOT NULL`];
      const [completedResult] = await db
        .select({ count: count() })
        .from(surveyResponses)
        .where(completedConditions.length > 0 ? and(...completedConditions) : undefined);

      // Get total users
      const [usersResult] = await db.select({ count: count() }).from(users);

      // Get responses by survey type
      const responsesBySurvey = await db
        .select({
          surveyType: surveys.type,
          surveyTitle: surveys.title,
          count: count(),
        })
        .from(surveyResponses)
        .innerJoin(surveys, eq(surveyResponses.surveyId, surveys.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .groupBy(surveys.id, surveys.type, surveys.title);

      const totalResponses = totalResult?.count || 0;
      const completedResponses = completedResult?.count || 0;
      const totalUsers = usersResult?.count || 0;
      const participationRate = totalUsers > 0 ? (totalResponses / totalUsers) * 100 : 0;
      const completionRate = totalResponses > 0 ? (completedResponses / totalResponses) * 100 : 0;

      return {
        totalResponses,
        completedResponses,
        inProgressResponses: totalResponses - completedResponses,
        totalUsers,
        participationRate: Math.round(participationRate * 100) / 100,
        completionRate: Math.round(completionRate * 100) / 100,
        responsesBySurvey,
      };
    }),

  // Obtener lista de respuestas con filtros
  getResponses: adminProcedure
    .input(z.object({
      surveyType: z.enum(['guia_i', 'guia_ii', 'guia_iii', 'all']).optional().default('all'),
      status: z.enum(['completed', 'in_progress', 'all']).optional().default('all'),
      departamento: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      page: z.number().optional().default(1),
      pageSize: z.number().optional().default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Build where conditions
      const conditions = [];
      
      if (input.surveyType !== 'all') {
        const [survey] = await db.select().from(surveys).where(eq(surveys.type, input.surveyType)).limit(1);
        if (survey) {
          conditions.push(eq(surveyResponses.surveyId, survey.id));
        }
      }

      if (input.status === 'completed') {
        conditions.push(sql`${surveyResponses.completedAt} IS NOT NULL`);
      } else if (input.status === 'in_progress') {
        conditions.push(sql`${surveyResponses.completedAt} IS NULL`);
      }

      if (input.startDate) {
        conditions.push(gte(surveyResponses.startedAt, new Date(input.startDate)));
      }
      if (input.endDate) {
        conditions.push(lte(surveyResponses.startedAt, new Date(input.endDate)));
      }

      // Get responses with user and survey info
      const responses = await db
        .select({
          id: surveyResponses.id,
          surveyId: surveyResponses.surveyId,
          surveyType: surveys.type,
          surveyTitle: surveys.title,
          userId: surveyResponses.userId,
          userName: users.name,
          userEmail: users.email,
          userDepartamento: users.departamento,
          userPuesto: users.puesto,
          curp: surveyResponses.curp,
          token: surveyResponses.token,
          startedAt: surveyResponses.startedAt,
          completedAt: surveyResponses.completedAt,
          results: surveyResponses.results,
        })
        .from(surveyResponses)
        .innerJoin(surveys, eq(surveyResponses.surveyId, surveys.id))
        .leftJoin(users, eq(surveyResponses.userId, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(surveyResponses.startedAt))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize);

      // Filter by departamento if specified (post-query filter since it's in users table)
      let filteredResponses = responses;
      if (input.departamento) {
        filteredResponses = responses.filter(r => r.userDepartamento === input.departamento);
      }

      // Get total count for pagination
      const [totalResult] = await db
        .select({ count: count() })
        .from(surveyResponses)
        .innerJoin(surveys, eq(surveyResponses.surveyId, surveys.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined);

      return {
        responses: filteredResponses,
        total: totalResult?.count || 0,
        page: input.page,
        pageSize: input.pageSize,
        totalPages: Math.ceil((totalResult?.count || 0) / input.pageSize),
      };
    }),

  // Obtener detalles de una respuesta específica
  getResponseDetails: adminProcedure
    .input(z.number())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Get response with user and survey info
      const [response] = await db
        .select({
          id: surveyResponses.id,
          surveyId: surveyResponses.surveyId,
          surveyType: surveys.type,
          surveyTitle: surveys.title,
          userId: surveyResponses.userId,
          userName: users.name,
          userEmail: users.email,
          userDepartamento: users.departamento,
          userPuesto: users.puesto,
          curp: surveyResponses.curp,
          token: surveyResponses.token,
          startedAt: surveyResponses.startedAt,
          completedAt: surveyResponses.completedAt,
          results: surveyResponses.results,
        })
        .from(surveyResponses)
        .innerJoin(surveys, eq(surveyResponses.surveyId, surveys.id))
        .leftJoin(users, eq(surveyResponses.userId, users.id))
        .where(eq(surveyResponses.id, input))
        .limit(1);

      if (!response) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Respuesta no encontrada" });
      }

      // Get all answers for this response
      const answers = await db
        .select({
          answerId: surveyAnswers.id,
          questionId: surveyAnswers.questionId,
          questionText: surveyQuestions.questionText,
          questionCategory: surveyQuestions.category,
          questionDomain: surveyQuestions.domain,
          questionDimension: surveyQuestions.dimension,
          answerValue: surveyAnswers.answerValue,
          answeredAt: surveyAnswers.answeredAt,
        })
        .from(surveyAnswers)
        .innerJoin(surveyQuestions, eq(surveyAnswers.questionId, surveyQuestions.id))
        .where(eq(surveyAnswers.responseId, input))
        .orderBy(surveyQuestions.order);

      return {
        ...response,
        answers,
      };
    }),

  // Obtener lista de departamentos únicos
  getDepartments: adminProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    const departments = await db
      .selectDistinct({ departamento: users.departamento })
      .from(users)
      .where(sql`${users.departamento} IS NOT NULL AND ${users.departamento} != ''`);

    return departments.map(d => d.departamento).filter(Boolean);
  }),

  // Exportar datos de encuestas (devuelve datos para generar Excel en frontend)
  exportData: adminProcedure
    .input(z.object({
      surveyType: z.enum(['guia_i', 'guia_ii', 'guia_iii', 'all']).optional().default('all'),
      status: z.enum(['completed', 'in_progress', 'all']).optional().default('all'),
      departamento: z.string().optional(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Build where conditions (same as getResponses)
      const conditions = [];
      
      if (input.surveyType !== 'all') {
        const [survey] = await db.select().from(surveys).where(eq(surveys.type, input.surveyType)).limit(1);
        if (survey) {
          conditions.push(eq(surveyResponses.surveyId, survey.id));
        }
      }

      if (input.status === 'completed') {
        conditions.push(sql`${surveyResponses.completedAt} IS NOT NULL`);
      } else if (input.status === 'in_progress') {
        conditions.push(sql`${surveyResponses.completedAt} IS NULL`);
      }

      if (input.startDate) {
        conditions.push(gte(surveyResponses.startedAt, new Date(input.startDate)));
      }
      if (input.endDate) {
        conditions.push(lte(surveyResponses.startedAt, new Date(input.endDate)));
      }

      // Get all responses (no pagination for export)
      const responses = await db
        .select({
          id: surveyResponses.id,
          surveyType: surveys.type,
          surveyTitle: surveys.title,
          userName: users.name,
          userEmail: users.email,
          userDepartamento: users.departamento,
          userPuesto: users.puesto,
          curp: surveyResponses.curp,
          startedAt: surveyResponses.startedAt,
          completedAt: surveyResponses.completedAt,
          results: surveyResponses.results,
        })
        .from(surveyResponses)
        .innerJoin(surveys, eq(surveyResponses.surveyId, surveys.id))
        .leftJoin(users, eq(surveyResponses.userId, users.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(surveyResponses.startedAt));

      // Filter by departamento if specified
      let filteredResponses = responses;
      if (input.departamento) {
        filteredResponses = responses.filter(r => r.userDepartamento === input.departamento);
      }

      return filteredResponses;
    }),
});
