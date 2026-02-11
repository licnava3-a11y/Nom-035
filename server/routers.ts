import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { eq, desc } from "drizzle-orm";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import * as db from "./db";
import { employeesRouter } from "./routers/employees";
import { signaturesRouter } from "./routers/signatures";
import { documentsRouter } from "./routers/documents";
import { importRouter } from "./routers/import";
import { surveysRouter } from "./routers/surveys";
import { surveysAdminRouter } from "./routers/surveysAdmin";
import { trainingNeedsRouter } from "./routers/trainingNeeds";
import { correctiveActionsRouter } from "./routers/correctiveActions";
import { employeeDocumentsRouter } from "./routers/employeeDocuments";
import { jobProfilesRouter } from "./routers/jobProfiles";
import { hiringRouter } from "./routers/hiring";
import { systemSettingsRouter } from "./routers/systemSettings";
import { competenciesStatsRouter } from "./routers/competenciesStats";
import { skillsMatrixRouter } from "./routers/skillsMatrix";
import { meetingMinutesRouter } from "./routers/meetingMinutes";
import { surveyDistributionRouter } from "./routers/surveyDistribution";
import { surveyPeriodsRouter } from "./routers/surveyPeriods";
import { nom035AdminRouter } from "./routers/nom035Admin";
import { surveyTokensAdvancedRouter } from "./routers/surveyTokensAdvanced";
import { actionPlanRouter } from "./routers/actionPlan";
import { organizationalCompetenciesRouter } from "./routers/organizationalCompetencies";
import { surveyAlertsRouter } from "./routers/surveyAlerts";
import { complianceRouter } from "./routers/compliance";
import { documentFormatsRouter } from "./routers/documentFormats";
import { documentAuditRouter } from "./routers/documentAudit";
import { securityAlertsRouter } from "./routers/securityAlerts";
import { reportTemplatesRouter } from "./routers/reportTemplates";
import { companyRouter } from "./routers/company";
import { equalityRouter } from "./routers/equality";
import { executiveDashboardRouter } from "./routers/executiveDashboard";
import { menuCountersRouter } from "./routers/menuCounters";
import { reportsRouter } from "./routers/reports";
import { nom035PoliciesRouter } from "./routers/nom035Policies";
import { trendsRouter } from "./routers/trends";
import { evidenceFolderRouter } from "./routers/evidenceFolder";
import { committeePositionAcceptanceRouter } from "./routers/committeePositionAcceptance";
import { committeeDocumentsRouter } from "./routers/committeeDocuments";
import { earlyWarningsRouter } from "./routers/earlyWarnings";
import { investigationsRouter } from "./routers/investigations";
import { workplaceViolenceRouter } from "./routers/workplaceViolence";
import { committeeTrainingRouter } from "./routers/committeeTraining";
import { massiveImportRouter } from "./routers/massiveImport";
import { nom035Router } from "./routers/nom035";
import { departmentsRouter } from "./routers/departments";
import { positionsRouter } from "./routers/positions";
import { notificationsRouter } from "./routers/notifications";
import { alertsRouter } from "./routers/alerts";
import { alertThresholdsRouter } from "./routers/alertThresholds";
import { notificationHistoryRouter } from "./routers/notificationHistory";
import { recruitmentRouter } from "./routers/recruitment";
import { committeeMinutesRouter } from "./routers/committeeMinutes";

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
  signatures: signaturesRouter,
  documents: documentsRouter,
  import: importRouter,
  surveys: surveysRouter,
  surveysAdmin: surveysAdminRouter,
  correctiveActions: correctiveActionsRouter,
  employeeDocuments: employeeDocumentsRouter,
  jobProfiles: jobProfilesRouter,
  hiring: hiringRouter,
  systemSettings: systemSettingsRouter,
  competenciesStats: competenciesStatsRouter,
  skillsMatrix: skillsMatrixRouter,
  meetingMinutes: meetingMinutesRouter,
  surveyDistribution: surveyDistributionRouter,
  surveyPeriods: surveyPeriodsRouter,
  nom035Admin: nom035AdminRouter,
  nom035Policies: nom035PoliciesRouter,
  trends: trendsRouter,
  surveyTokensAdvanced: surveyTokensAdvancedRouter,
  trainingNeeds: trainingNeedsRouter,
  organizationalCompetencies: organizationalCompetenciesRouter,
  surveyAlerts: surveyAlertsRouter,
  compliance: complianceRouter,
  documentFormats: documentFormatsRouter,
  documentAudit: documentAuditRouter,
  securityAlerts: securityAlertsRouter,
  reportTemplates: reportTemplatesRouter,
  company: companyRouter,
  evidenceFolder: evidenceFolderRouter,
  committeePositionAcceptance: committeePositionAcceptanceRouter,
  committeeDocuments: committeeDocumentsRouter,
  earlyWarnings: earlyWarningsRouter,
  investigations: investigationsRouter,
  workplaceViolence: workplaceViolenceRouter,
  committeeTraining: committeeTrainingRouter,
  massiveImport: massiveImportRouter,
  nom035: nom035Router,
  departments: departmentsRouter,
  positions: positionsRouter,
  notifications: notificationsRouter,
  alerts: alertsRouter,
  alertThresholds: alertThresholdsRouter,
  notificationHistory: notificationHistoryRouter,
  recruitment: recruitmentRouter,
  committeeMinutes: committeeMinutesRouter,
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
        await dbInstance.update(courses).set(updateData).where(eq(courses.id, id));
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        
        const { courses } = await import('../drizzle/schema');
        await dbInstance.delete(courses).where(eq(courses.id, input.id));
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
        await dbInstance.update(modules).set(updateData).where(eq(modules.id, id));
        return { success: true };
      }),
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        
        const { modules } = await import('../drizzle/schema');
        await dbInstance.delete(modules).where(eq(modules.id, input.id));
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
    list: committeeProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        // TODO: Implementar filtros de fecha en getAllCases
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
        reporterEmail: z.union([z.string().email(), z.literal('')]).optional(),
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
        await dbInstance.update(cases).set({ status: input.status }).where(eq(cases.id, input.id));
        return { success: true };
      }),
    getFollowUps: protectedProcedure
      .input(z.object({
        caseId: z.number(),
      }))
      .query(async ({ input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        
        const { caseFollowUps } = await import('../drizzle/schema');
        return await dbInstance.select().from(caseFollowUps).where(eq(caseFollowUps.caseId, input.caseId)).orderBy(desc(caseFollowUps.createdAt));
      }),
    addFollowUp: committeeProcedure
      .input(z.object({
        caseId: z.number(),
        action: z.string().min(1),
        notes: z.string().optional(),
        newStatus: z.enum(['open', 'investigating', 'resolved', 'closed']).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        
        const { caseFollowUps, cases } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        
        // Insertar seguimiento
        await dbInstance.insert(caseFollowUps).values({
          caseId: input.caseId,
          action: input.action,
          notes: input.notes,
          userId: ctx.user.id,
        });
        
        // Actualizar estado del caso si se proporciona
        if (input.newStatus) {
          await dbInstance.update(cases)
            .set({ status: input.newStatus })
            .where(eq(cases.id, input.caseId));
        }
        
        return { success: true };
      }),
    getCommitteeMembers: protectedProcedure.query(async () => {
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      
      const { users } = await import('../drizzle/schema');
      const { eq } = await import('drizzle-orm');
      return await dbInstance.select().from(users).where(eq(users.role, 'committee'));
    }),
    getCommitteeWorkload: protectedProcedure.query(async () => {
      const dbInstance = await db.getDb();
      if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
      
      const { users, cases } = await import('../drizzle/schema');
      const { eq, and, ne, sql } = await import('drizzle-orm');
      
      // Obtener todos los miembros del comité
      const committeeMembers = await dbInstance.select().from(users).where(eq(users.role, 'committee'));
      
      // Contar casos activos por miembro
      const workload = await Promise.all(
        committeeMembers.map(async (member) => {
          const activeCases = await dbInstance
            .select({ count: sql<number>`count(*)` })
            .from(cases)
            .where(
              and(
                eq(cases.assignedTo, member.id),
                ne(cases.status, 'closed')
              )
            );
          
          return {
            userId: member.id,
            userName: member.name,
            activeCases: Number(activeCases[0]?.count || 0),
          };
        })
      );
      
      return workload;
    }),
    assignCaseToCommittee: committeeProcedure
      .input(z.object({
        caseId: z.number(),
        userId: z.number(),
        role: z.enum(['investigador_principal', 'investigador_apoyo', 'coordinador']).default('investigador_principal'),
      }))
      .mutation(async ({ input, ctx }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        
        const { cases, caseAssignments, caseFollowUps, notifications } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        
        // Actualizar el caso con el miembro asignado
        await dbInstance.update(cases).set({ assignedTo: input.userId }).where(eq(cases.id, input.caseId));
        
        // Crear registro de asignación
        await dbInstance.insert(caseAssignments).values({
          caseId: input.caseId,
          committeeMemberId: input.userId,
          role: 'lead' as any,
          assignedBy: ctx.user.id,
        });
        
        // Agregar seguimiento
        const { users } = await import('../drizzle/schema');
        const assignedUser = await dbInstance.select().from(users).where(eq(users.id, input.userId)).limit(1);
        await dbInstance.insert(caseFollowUps).values({
          caseId: input.caseId,
          userId: ctx.user.id,
          action: `Caso asignado a ${assignedUser[0]?.name || 'miembro del comité'}`,
        });
        
        // Crear notificación para el miembro asignado
        const caseData = await dbInstance.select().from(cases).where(eq(cases.id, input.caseId)).limit(1);
        await dbInstance.insert(notifications).values({
          userId: input.userId,
          title: 'Nuevo caso asignado',
          message: `Se te ha asignado el caso ${caseData[0]?.caseNumber}`,
          type: 'caso_asignado' as any,
          isRead: false,
        });
        
        return { success: true };
      }),
  }),

  // Committee members
  committee: router({
    list: adminProcedure.query(async () => {
      return await db.getAllCommitteeMembers();
    }),
    getById: adminProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        
        const { committeeMembers, users } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        
        const result = await dbInstance
          .select({
            id: committeeMembers.id,
            userId: committeeMembers.userId,
            position: committeeMembers.position,
            responsibilities: committeeMembers.responsibilities,
            isActive: committeeMembers.isActive,
            createdAt: committeeMembers.createdAt,
            userName: users.name,
            userEmail: users.email,
          })
          .from(committeeMembers)
          .leftJoin(users, eq(committeeMembers.userId, users.id))
          .where(eq(committeeMembers.id, input.id))
          .limit(1);
        
        if (result.length === 0) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Miembro del comité no encontrado' });
        }
        
        return result[0];
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
    update: adminProcedure
      .input(z.object({
        id: z.number(),
        position: z.string().optional(),
        responsibilities: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        
        const { committeeMembers } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        
        await dbInstance
          .update(committeeMembers)
          .set({
            position: input.position,
            responsibilities: input.responsibilities,
          })
          .where(eq(committeeMembers.id, input.id));
        
        return { success: true };
      }),
    remove: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        
        const { committeeMembers } = await import('../drizzle/schema');
        const { eq } = await import('drizzle-orm');
        
        await dbInstance.delete(committeeMembers).where(eq(committeeMembers.id, input.id));
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
    create: instructorProcedure
      .input(z.object({
        positionName: z.string().min(1, 'El nombre del puesto es requerido'),
        department: z.string().optional(),
        description: z.string().optional(),
        riskLevel: z.enum(['low', 'medium', 'high', 'very_high']).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const position = await db.createJobPosition({
          ...input,
          createdBy: ctx.user.id,
        });
        return position;
      }),
    update: instructorProcedure
      .input(z.object({
        id: z.number(),
        positionName: z.string().min(1, 'El nombre del puesto es requerido').optional(),
        department: z.string().optional(),
        description: z.string().optional(),
        riskLevel: z.enum(['low', 'medium', 'high', 'very_high']).optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await db.updateJobPosition(id, data);
        return { success: true };
      }),
  }),

  // Mailbox
  mailbox: router({
    list: committeeProcedure.query(async () => {
      return await db.getAllMailboxRequests();
    }),
    getById: committeeProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const request = await db.getMailboxRequestById(input.id);
        if (!request) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Solicitud no encontrada' });
        }
        const responses = await db.getMailboxResponses(input.id);
        return { ...request, responses };
      }),
    create: publicProcedure
      .input(z.object({
        requestType: z.enum(["queja", "sugerencia", "felicitacion", "solicitud_capacitacion"]),
        complaintType: z.enum([
          "liderazgo_negativo",
          "entorno_organizacional_desfavorable",
          "conductas_contrarias_ambiente_laboral",
          "carga_trabajo",
          "falta_control_trabajo",
          "jornadas_trabajo_extensas",
          "interferencia_relacion_trabajo_familia",
          "acoso_laboral",
          "acoso_sexual",
          "hostigamiento_sexual",
          "mobbing",
          "burnout",
          "violencia_laboral",
          "otros"
        ]).optional(),
        senderName: z.string().optional(),
        senderEmail: z.string().email(),
        senderPhone: z.string().optional(),
        isAnonymous: z.boolean(),
        subject: z.string(),
        message: z.string(),
        priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
      }))
      .mutation(async ({ input }) => {
        const request = await db.createMailboxRequest({
          ...input,
          receivedVia: "web_form",
        });
        
        // Create notification for committee members
        const committeeMembers = await db.getAllCommitteeMembers();
        for (const member of committeeMembers) {
          await db.createNotification({
            userId: member.userId,
            type: "new_mailbox_request",
            title: "Nueva solicitud en el buzón",
            message: `Nueva ${input.requestType}: ${input.subject}`,
            relatedEntityType: "mailbox",
            relatedEntityId: request.id,
          });
        }
        
        return request;
      }),
    updateStatus: committeeProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(["recibido", "asignado", "en_proceso", "concluido"]),
        assignedTo: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await db.updateMailboxStatus(input.id, input.status, input.assignedTo);
        
        // Get request details for email
        const request = await db.getMailboxRequestById(input.id);
        if (request) {
          // Create notification for status change
          const committeeMembers = await db.getAllCommitteeMembers();
          for (const member of committeeMembers) {
            await db.createNotification({
              userId: member.userId,
              type: "mailbox_status_change",
              title: "Cambio de estado en solicitud",
              message: `La solicitud ${request.folio} cambió a: ${input.status}`,
              relatedEntityType: "mailbox",
              relatedEntityId: input.id,
            });
          }
        }
        
        return result;
      }),
    addResponse: committeeProcedure
      .input(z.object({
        mailboxId: z.number(),
        response: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        return await db.addMailboxResponse(input.mailboxId, ctx.user.id, input.response);
      }),
  }),

  // Case assignments
  caseAssignments: router({
    assign: committeeProcedure
      .input(z.object({
        caseId: z.number(),
        committeeMemberId: z.number(),
        role: z.enum(["lead", "support", "observer"]).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await db.assignCommitteeMemberToCase(
          input.caseId,
          input.committeeMemberId,
          ctx.user.id,
          input.role
        );
        
        // Create notification for assigned member
        await db.createNotification({
          userId: input.committeeMemberId,
          type: "case_assigned",
          title: "Caso asignado",
          message: `Se te ha asignado un nuevo caso`,
          relatedEntityType: "case",
          relatedEntityId: input.caseId,
        });
        
        return result;
      }),
    getByCaseId: committeeProcedure
      .input(z.object({ caseId: z.number() }))
      .query(async ({ input }) => {
        return await db.getCaseAssignments(input.caseId);
      }),
    getByCommitteeMemberId: committeeProcedure
      .input(z.object({ committeeMemberId: z.number() }))
      .query(async ({ input }) => {
        return await db.getCommitteeMemberAssignments(input.committeeMemberId);
      }),
  }),

  // Employees management
  employees: employeesRouter,

  // Action Plan (Plan de Acción Multinivel NOM-035)
  actionPlan: actionPlanRouter,

  // Equality and Non-Discrimination NMX-025 (Igualdad Laboral y No Discriminación)
  equality: equalityRouter,

  // Executive Dashboard
  executiveDashboard: executiveDashboardRouter,
  menuCounters: menuCountersRouter,
  reports: reportsRouter,
});

export type AppRouter = typeof appRouter;
