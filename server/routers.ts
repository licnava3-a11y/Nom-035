import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import * as db from "./db";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Solo los administradores pueden acceder a este recurso' });
  }
  return next({ ctx });
});

// Instructor or admin procedure
const instructorProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin' && ctx.user.role !== 'instructor') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Solo los instructores y administradores pueden acceder a este recurso' });
  }
  return next({ ctx });
});

// Committee or admin procedure
const committeeProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin' && ctx.user.role !== 'committee') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Solo los miembros del comité y administradores pueden acceder a este recurso' });
  }
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // User management (admin only)
  users: router({
    list: adminProcedure.query(async () => {
      return await db.getAllUsers();
    }),
    updateRole: adminProcedure
      .input(z.object({
        userId: z.number(),
        role: z.enum(['admin', 'instructor', 'student', 'committee']),
      }))
      .mutation(async ({ input }) => {
        await db.updateUserRole(input.userId, input.role);
        return { success: true };
      }),
  }),

  // Courses management
  courses: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      // Students only see published courses
      if (ctx.user.role === 'student') {
        return await db.getPublishedCourses();
      }
      // Admin and instructors see all courses
      return await db.getAllCourses();
    }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getCourseById(input.id);
      }),
    create: instructorProcedure
      .input(z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        category: z.enum(['fundamentos', 'categorias_dominios', 'mobbing', 'burnout', 'protocolos', 'comite', 'analisis_puestos', 'otros']),
        duration: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        
        const { courses } = await import('../drizzle/schema');
        await dbInstance.insert(courses).values({
          ...input,
          createdBy: ctx.user.id,
          isPublished: false,
        });
        return { success: true };
      }),
    update: instructorProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        category: z.enum(['fundamentos', 'categorias_dominios', 'mobbing', 'burnout', 'protocolos', 'comite', 'analisis_puestos', 'otros']).optional(),
        duration: z.number().optional(),
        isPublished: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        
        const { courses } = await import('../drizzle/schema');
        const { id, ...updateData } = input;
        await dbInstance.update(courses).set(updateData).where(require('drizzle-orm').eq(courses.id, id));
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        
        const { courses } = await import('../drizzle/schema');
        await dbInstance.delete(courses).where(require('drizzle-orm').eq(courses.id, input.id));
        return { success: true };
      }),
  }),

  // Modules management
  modules: router({
    listByCourse: protectedProcedure
      .input(z.object({ courseId: z.number() }))
      .query(async ({ input }) => {
        return await db.getModulesByCourseId(input.courseId);
      }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getModuleById(input.id);
      }),
    create: instructorProcedure
      .input(z.object({
        courseId: z.number(),
        title: z.string().min(1),
        description: z.string().optional(),
        content: z.string().optional(),
        orderIndex: z.number().default(0),
        duration: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        
        const { modules } = await import('../drizzle/schema');
        await dbInstance.insert(modules).values(input);
        return { success: true };
      }),
    update: instructorProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        content: z.string().optional(),
        orderIndex: z.number().optional(),
        duration: z.number().optional(),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        
        const { modules } = await import('../drizzle/schema');
        const { id, ...updateData } = input;
        await dbInstance.update(modules).set(updateData).where(require('drizzle-orm').eq(modules.id, id));
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        
        const { modules } = await import('../drizzle/schema');
        await dbInstance.delete(modules).where(require('drizzle-orm').eq(modules.id, input.id));
        return { success: true };
      }),
  }),

  // Student progress
  progress: router({
    my: protectedProcedure.query(async ({ ctx }) => {
      return await db.getStudentProgressByUserId(ctx.user.id);
    }),
    byCourse: protectedProcedure
      .input(z.object({ courseId: z.number() }))
      .query(async ({ input, ctx }) => {
        return await db.getStudentProgressByCourse(ctx.user.id, input.courseId);
      }),
  }),

  // Cases management
  cases: router({
    list: committeeProcedure.query(async () => {
      return await db.getAllCases();
    }),
    getById: committeeProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const caseData = await db.getCaseById(input.id);
        if (!caseData) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Caso no encontrado' });
        }
        const followUps = await db.getCaseFollowUpsByCaseId(input.id);
        const documents = await db.getCaseDocumentsByCaseId(input.id);
        return { ...caseData, followUps, documents };
      }),
    create: publicProcedure
      .input(z.object({
        reporterName: z.string().optional(),
        reporterEmail: z.string().email().optional(),
        reporterPhone: z.string().optional(),
        isAnonymous: z.boolean().default(false),
        caseType: z.enum(['mobbing', 'burnout', 'violence', 'stress', 'other']),
        description: z.string().min(10),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        
        const { cases } = await import('../drizzle/schema');
        const caseNumber = `CASO-${Date.now()}`;
        await dbInstance.insert(cases).values({
          ...input,
          caseNumber,
          status: 'open',
          priority: 'medium',
        });
        return { success: true, caseNumber };
      }),
    updateStatus: committeeProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(['open', 'investigating', 'resolved', 'closed']),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        
        const { cases } = await import('../drizzle/schema');
        await dbInstance.update(cases).set({ status: input.status }).where(require('drizzle-orm').eq(cases.id, input.id));
        return { success: true };
      }),
    addFollowUp: committeeProcedure
      .input(z.object({
        caseId: z.number(),
        action: z.string().min(1),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        
        const { caseFollowUps } = await import('../drizzle/schema');
        await dbInstance.insert(caseFollowUps).values({
          ...input,
          userId: ctx.user.id,
        });
        return { success: true };
      }),
  }),

  // Committee members
  committee: router({
    list: adminProcedure.query(async () => {
      return await db.getAllCommitteeMembers();
    }),
    add: adminProcedure
      .input(z.object({
        userId: z.number(),
        position: z.string().optional(),
        responsibilities: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        
        const { committeeMembers } = await import('../drizzle/schema');
        await dbInstance.insert(committeeMembers).values(input);
        return { success: true };
      }),
  }),

  // Resources
  resources: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllResources();
    }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getResourceById(input.id);
      }),
    create: instructorProcedure
      .input(z.object({
        title: z.string(),
        description: z.string().optional(),
        category: z.enum(['manual', 'protocol', 'form', 'pdf', 'presentation', 'other']),
        fileUrl: z.string(),
        fileType: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        return await db.createResource({
          ...input,
          uploadedBy: ctx.user.id,
        });
      }),
    update: instructorProcedure
      .input(z.object({
        id: z.number(),
        title: z.string(),
        description: z.string().optional(),
        category: z.enum(['manual', 'protocol', 'form', 'pdf', 'presentation', 'other']),
        fileUrl: z.string(),
        fileType: z.string(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        return await db.updateResource(id, data);
      }),
  }),

  // Evaluations
  evaluations: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllEvaluations();
    }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const evaluation = await db.getEvaluationById(input.id);
        if (!evaluation) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Evaluación no encontrada' });
        }
        const questions = await db.getQuestionsByEvaluationId(input.id);
        return { ...evaluation, questions };
      }),
    startAttempt: protectedProcedure
      .input(z.object({ evaluationId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        
        const { evaluationAttempts } = await import('../drizzle/schema');
        const attemptNumber = await db.getNextAttemptNumber(ctx.user.id, input.evaluationId);
        
        const result = await dbInstance.insert(evaluationAttempts).values({
          userId: ctx.user.id,
          evaluationId: input.evaluationId,
          attemptNumber,
          startedAt: new Date(),
        });
        
        const insertId = (result as any).insertId || 0;
        return { attemptId: Number(insertId), attemptNumber };
      }),
    submitAnswer: protectedProcedure
      .input(z.object({
        attemptId: z.number(),
        questionId: z.number(),
        selectedOptionId: z.number().optional(),
        answerText: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        
        const { studentAnswers, questions, answerOptions } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        
        // Get question details
        const question = await dbInstance.select().from(questions).where(eq(questions.id, input.questionId)).limit(1);
        if (!question[0]) throw new TRPCError({ code: 'NOT_FOUND', message: 'Pregunta no encontrada' });
        
        let isCorrect = false;
        let pointsEarned = 0;
        
        if (input.selectedOptionId) {
          const option = await dbInstance.select().from(answerOptions).where(eq(answerOptions.id, input.selectedOptionId)).limit(1);
          if (option[0]?.isCorrect) {
            isCorrect = true;
            pointsEarned = question[0].points;
          }
        }
        
        await dbInstance.insert(studentAnswers).values({
          attemptId: input.attemptId,
          questionId: input.questionId,
          selectedOptionId: input.selectedOptionId,
          answerText: input.answerText,
          isCorrect,
          pointsEarned,
        });
        
        return { success: true, isCorrect, pointsEarned };
      }),
    completeAttempt: protectedProcedure
      .input(z.object({ attemptId: z.number() }))
      .mutation(async ({ input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        
        const { evaluationAttempts, studentAnswers, evaluations } = await import('../drizzle/schema');
        const { eq, sum } = await import('drizzle-orm');
        
        // Get attempt details
        const attempt = await dbInstance.select().from(evaluationAttempts).where(eq(evaluationAttempts.id, input.attemptId)).limit(1);
        if (!attempt[0]) throw new TRPCError({ code: 'NOT_FOUND', message: 'Intento no encontrado' });
        
        // Calculate total score
        const answers = await dbInstance.select().from(studentAnswers).where(eq(studentAnswers.attemptId, input.attemptId));
        const totalPoints = answers.reduce((acc, ans) => acc + ans.pointsEarned, 0);
        const maxPoints = answers.length; // Assuming 1 point per question
        const score = (totalPoints / maxPoints) * 100;
        
        // Get evaluation passing score
        const evaluation = await dbInstance.select().from(evaluations).where(eq(evaluations.id, attempt[0].evaluationId)).limit(1);
        const passed = score >= (evaluation[0]?.passingScore || 70);
        
        // Update attempt
        await dbInstance.update(evaluationAttempts)
          .set({
            score: score.toString(),
            passed,
            completedAt: new Date(),
          })
          .where(eq(evaluationAttempts.id, input.attemptId));
        
        return { success: true, score, passed };
      }),
    getAttempts: protectedProcedure
      .input(z.object({ evaluationId: z.number() }))
      .query(async ({ input, ctx }) => {
        return await db.getEvaluationAttempts(ctx.user.id, input.evaluationId);
      }),
  }),

  // Job positions
  jobPositions: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllJobPositions();
    }),
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const position = await db.getJobPositionById(input.id);
        if (!position) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Puesto no encontrado' });
        }
        const functions = await db.getJobFunctionsByPositionId(input.id);
        return { ...position, functions };
      }),
  }),
});

export type AppRouter = typeof appRouter;
