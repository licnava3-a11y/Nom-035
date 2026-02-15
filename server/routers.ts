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
import { smtpConfigRouter } from "./routers/smtpConfig";
import { financialRouter } from "./routers/financial";
import { nom035Router } from "./routers/nom035";
import { departmentsRouter } from "./routers/departments";
import { positionsRouter } from "./routers/positions";
import { notificationsRouter } from "./routers/notifications";
import { alertsRouter } from "./routers/alerts";
import { alertThresholdsRouter } from "./routers/alertThresholds";
import { notificationHistoryRouter } from "./routers/notificationHistory";
import { recruitmentRouter } from "./routers/recruitment";
import { committeeMinutesRouter } from "./routers/committeeMinutes";
import { digitalCertificatesRouter } from './routers/digitalCertificates';
import { assessmentsRouter } from './routers/assessments';
import { trainingDashboardRouter } from "./routers/trainingDashboard";
import { stpsReportsRouter } from "./routers/stpsReports";
import { trainingRouter } from "./routers/training";
import { dashboardRouter } from "./routers/dashboard";
import { administrativeRouter } from "./routers/administrative";
import { rolesPermissionsRouter } from "./routers/rolesPermissions";
import { customPermissionsRouter } from "./routers/customPermissions";
import { permissionAuditRouter } from "./routers/permissionAudit";
import { surveyAnonymousTokensRouter } from "./routers/surveyAnonymousTokens";
import { notificationPreferencesRouter } from "./routers/notificationPreferences";
import { predictiveAlertsRouter } from "./routers/predictiveAlerts";
import { nineBoxGridRouter } from "./routers/nineBoxGrid";
import { notificationLogsRouter } from "./routers/notificationLogs";
import { skillsMatrixSnapshotsRouter } from "./routers/skillsMatrixSnapshots";
import { recognitionsRouter } from "./routers/recognitions";

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
  rolesPermissions: rolesPermissionsRouter,
  customPermissions: customPermissionsRouter,
  permissionAudit: permissionAuditRouter,
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
  smtpConfig: smtpConfigRouter,
  nom035: nom035Router,
  departments: departmentsRouter,
  positions: positionsRouter,
  notifications: notificationsRouter,
  alerts: alertsRouter,
  alertThresholds: alertThresholdsRouter,
  notificationHistory: notificationHistoryRouter,
  recruitment: recruitmentRouter,
  committeeMinutes: committeeMinutesRouter,
  digitalCertificates: digitalCertificatesRouter,
  assessments: assessmentsRouter,
  trainingDashboard: trainingDashboardRouter,
  stpsReports: stpsReportsRouter,
  training: trainingRouter,
  dashboard: dashboardRouter,
  administrative: administrativeRouter,
  financial: financialRouter,
  recognitions: recognitionsRouter,
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
        page: z.number().min(1).default(1),
        pageSize: z.number().min(1).max(100).default(20),
        caseType: z.enum(['mobbing', 'burnout', 'violence', 'stress', 'other']).optional(),
        priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
        status: z.enum(['open', 'investigating', 'resolved', 'closed']).optional(),
        search: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        
        const { cases } = await import('../drizzle/schema');
        const { eq, and, sql, desc } = await import('drizzle-orm');
        
        const page = input?.page || 1;
        const pageSize = input?.pageSize || 20;
        const offset = (page - 1) * pageSize;
        
        // Build where conditions
        const conditions = [];
        if (input?.caseType) {
          conditions.push(eq(cases.caseType, input.caseType));
        }
        if (input?.priority) {
          conditions.push(sql`${cases.priority} = ${input.priority}`);
        }
        if (input?.status) {
          conditions.push(sql`${cases.status} = ${input.status}`);
        }
        if (input?.search) {
          const searchTerm = `%${input.search}%`;
          conditions.push(
            sql`(
              ${cases.caseNumber} LIKE ${searchTerm} OR
              ${cases.description} LIKE ${searchTerm} OR
              ${cases.reporterName} LIKE ${searchTerm} OR
              ${cases.reporterEmail} LIKE ${searchTerm}
            )`
          );
        }
        if (input?.startDate) {
          // Extract date from ISO string (YYYY-MM-DD)
          const startDateStr = input.startDate.split('T')[0];
          conditions.push(sql`DATE(${cases.createdAt}) >= ${startDateStr}`);
        }
        if (input?.endDate) {
          // Extract date from ISO string (YYYY-MM-DD)
          const endDateStr = input.endDate.split('T')[0];
          conditions.push(sql`DATE(${cases.createdAt}) <= ${endDateStr}`);
        }
        
        const where = conditions.length > 0 ? and(...conditions) : undefined;
        
        // Get total count
        const [{ count: totalCount }] = await dbInstance
          .select({ count: sql<number>`count(*)` })
          .from(cases)
          .where(where);
        
        // Get paginated cases
        const casesList = await dbInstance
          .select()
          .from(cases)
          .where(where)
          .orderBy(desc(cases.createdAt))
          .limit(pageSize)
          .offset(offset);
        
        return {
          cases: casesList,
          totalCount: Number(totalCount),
          totalPages: Math.ceil(Number(totalCount) / pageSize),
          currentPage: page,
          pageSize,
        };
      }),
    
    exportToExcel: committeeProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        caseType: z.enum(['mobbing', 'burnout', 'violence', 'stress', 'other']).optional(),
        priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
        status: z.enum(['open', 'investigating', 'resolved', 'closed']).optional(),
        search: z.string().optional(),
      }).optional())
      .mutation(async ({ input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        
        const { cases } = await import('../drizzle/schema');
        const { eq, and, sql, desc } = await import('drizzle-orm');
        const XLSX = await import('xlsx');
        
        // Build where conditions (same as list)
        const conditions = [];
        if (input?.caseType) {
          conditions.push(eq(cases.caseType, input.caseType));
        }
        if (input?.priority) {
          conditions.push(sql`${cases.priority} = ${input.priority}`);
        }
        if (input?.status) {
          conditions.push(sql`${cases.status} = ${input.status}`);
        }
        if (input?.search) {
          const searchTerm = `%${input.search}%`;
          conditions.push(
            sql`(
              ${cases.caseNumber} LIKE ${searchTerm} OR
              ${cases.description} LIKE ${searchTerm} OR
              ${cases.reporterName} LIKE ${searchTerm} OR
              ${cases.reporterEmail} LIKE ${searchTerm}
            )`
          );
        }
        if (input?.startDate) {
          const startDateStr = input.startDate.split('T')[0];
          conditions.push(sql`DATE(${cases.createdAt}) >= ${startDateStr}`);
        }
        if (input?.endDate) {
          const endDateStr = input.endDate.split('T')[0];
          conditions.push(sql`DATE(${cases.createdAt}) <= ${endDateStr}`);
        }
        
        const where = conditions.length > 0 ? and(...conditions) : undefined;
        
        // Get all cases (no pagination for export)
        const casesList = await dbInstance
          .select()
          .from(cases)
          .where(where)
          .orderBy(desc(cases.createdAt));
        
        // Transform data for Excel
        const excelData = casesList.map(c => ({
          'Folio': c.caseNumber,
          'Tipo': c.caseType,
          'Prioridad': c.priority,
          'Estado': c.status,
          'Reportante': c.reporterName || 'Anónimo',
          'Email': c.reporterEmail || '',
          'Teléfono': c.reporterPhone || '',
          'Descripción': c.description || '',
          'Fecha Creación': c.createdAt ? new Date(c.createdAt).toLocaleDateString('es-MX') : '',
          'Fecha Cierre': c.closedAt ? new Date(c.closedAt).toLocaleDateString('es-MX') : '',
        }));
        
        // Create workbook and worksheet
        const wb = XLSX.utils.book_new();
        const ws = XLSX.utils.json_to_sheet(excelData);
        XLSX.utils.book_append_sheet(wb, ws, 'Casos NOM-035');
        
        // Generate buffer
        const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        
        // Return base64 for download
        return {
          data: buffer.toString('base64'),
          filename: `casos-nom035-${new Date().toISOString().split('T')[0]}.xlsx`,
          totalRecords: casesList.length,
        };
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
        priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
      }))
      .mutation(async ({ input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        
        const { cases } = await import('../drizzle/schema');
        const caseNumber = `CASO-${Date.now()}`;
        const result = await dbInstance.insert(cases).values({
          ...input,
          caseNumber,
          status: 'open',
        });
        
        const caseId = Number((result as any)[0]?.insertId || 0);
        
        // Si el caso es crítico, notificar a todos los miembros del comité
        if (input.priority === 'critical') {
          const committeeMembers = await db.getAllCommitteeMembers();
          const notificationPromises = committeeMembers.map(member =>
            db.createNotification({
              userId: member.id,
              type: 'new_case',
              title: '¡Caso Crítico Reportado!',
              message: `Se ha registrado un nuevo caso crítico (${caseNumber}) de tipo ${input.caseType}. Requiere atención inmediata.`,
              relatedEntityType: 'case',
              relatedEntityId: caseId,
            }).catch(err => console.error('Error al crear notificación:', err))
          );
          await Promise.allSettled(notificationPromises);
        }
        
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
    autoAssign: committeeProcedure
      .input(z.object({
        caseId: z.number(),
      }))
      .mutation(async ({ input, ctx }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        
        const { cases, caseAssignments, caseFollowUps, notifications, committeeMembers, users } = await import('../drizzle/schema');
        const { eq, sql, and } = await import('drizzle-orm');
        
        // 1. Obtener miembros activos del comité con JOIN a users para obtener nombre
        const activeMembers = await dbInstance
          .select({
            userId: committeeMembers.userId,
            name: users.name,
          })
          .from(committeeMembers)
          .innerJoin(users, eq(committeeMembers.userId, users.id))
          .where(eq(committeeMembers.isActive, true));
        
        if (activeMembers.length === 0) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'No hay miembros activos en el comité' });
        }
        
        // 2. Calcular workload de cada miembro (casos abiertos asignados)
        const workloadPromises = activeMembers.map(async (member) => {
          const workload = await dbInstance.execute(sql`
            SELECT COUNT(*) as count
            FROM ${cases}
            WHERE ${cases.assignedTo} = ${member.userId}
            AND ${cases.status} IN ('open', 'investigating')
          `);
          
          return {
            userId: member.userId,
            name: member.name || 'Sin nombre',
            workload: Number((workload as any).rows?.[0]?.count || 0),
          };
        });
        
        const workloads = await Promise.all(workloadPromises);
        
        // 3. Algoritmo de balanceo: asignar al miembro con menor workload
        const sortedByWorkload = workloads.sort((a, b) => a.workload - b.workload);
        const selectedMember = sortedByWorkload[0];
        
        // 4. Asignar caso al miembro seleccionado
        await dbInstance.update(cases).set({ assignedTo: selectedMember.userId }).where(eq(cases.id, input.caseId));
        
        // 5. Crear registro de asignación
        await dbInstance.insert(caseAssignments).values({
          caseId: input.caseId,
          committeeMemberId: selectedMember.userId,
          role: 'lead' as any,
          assignedBy: ctx.user.id,
        });
        
        // 6. Agregar seguimiento
        await dbInstance.insert(caseFollowUps).values({
          caseId: input.caseId,
          userId: ctx.user.id,
          action: `Caso asignado automáticamente a ${selectedMember.name} (workload: ${selectedMember.workload} casos)`,
        });
        
        // 7. Crear notificación para el miembro asignado
        const caseData = await dbInstance.select().from(cases).where(eq(cases.id, input.caseId)).limit(1);
        await dbInstance.insert(notifications).values({
          userId: selectedMember.userId,
          title: 'Nuevo caso asignado automáticamente',
          message: `Se te ha asignado automáticamente el caso ${caseData[0]?.caseNumber}`,
          type: 'case_assigned' as any,
          isRead: false,
        });
        
        return {
          success: true,
          assignedTo: {
            userId: selectedMember.userId,
            name: selectedMember.name,
            workload: selectedMember.workload,
          },
        };
      }),
    getMetrics: committeeProcedure
      .input(z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional())
      .query(async ({ input }) => {
        const dbInstance = await db.getDb();
        if (!dbInstance) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'Database not available' });
        
        const { cases } = await import('../drizzle/schema');
        const { sql } = await import('drizzle-orm');
        
        // Filtros de fecha opcionales
        const conditions = [];
        if (input?.startDate) {
          conditions.push(sql`DATE(${cases.createdAt}) >= ${input.startDate.split('T')[0]}`);
        }
        if (input?.endDate) {
          conditions.push(sql`DATE(${cases.createdAt}) <= ${input.endDate.split('T')[0]}`);
        }
        const whereClause = conditions.length > 0 ? sql`WHERE ${sql.join(conditions, sql` AND `)}` : sql``;
        
        // 1. Casos por mes (últimos 12 meses)
        const casesByMonth = await dbInstance.execute(sql`
          SELECT 
            DATE_FORMAT(${cases.createdAt}, '%Y-%m') as month,
            COUNT(*) as count
          FROM ${cases}
          ${whereClause}
          GROUP BY DATE_FORMAT(${cases.createdAt}, '%Y-%m')
          ORDER BY month DESC
          LIMIT 12
        `);
        
        // 2. Distribución por tipo
        const casesByType = await dbInstance.execute(sql`
          SELECT 
            ${cases.caseType} as type,
            COUNT(*) as count
          FROM ${cases}
          ${whereClause}
          GROUP BY ${cases.caseType}
        `);
        
        // 3. Tiempo promedio de resolución (en días)
        const avgResolutionTime = await dbInstance.execute(sql`
          SELECT 
            AVG(DATEDIFF(${cases.closedAt}, ${cases.createdAt})) as avgDays
          FROM ${cases}
          WHERE ${cases.closedAt} IS NOT NULL
          ${conditions.length > 0 ? sql`AND ${sql.join(conditions, sql` AND `)}` : sql``}
        `);
        
        // 4. Distribución por prioridad
        const casesByPriority = await dbInstance.execute(sql`
          SELECT 
            ${cases.priority} as priority,
            COUNT(*) as count
          FROM ${cases}
          ${whereClause}
          GROUP BY ${cases.priority}
        `);
        
        // 5. Distribución por estado
        const casesByStatus = await dbInstance.execute(sql`
          SELECT 
            ${cases.status} as status,
            COUNT(*) as count
          FROM ${cases}
          ${whereClause}
          GROUP BY ${cases.status}
        `);
        
        return {
          casesByMonth: (casesByMonth as any).rows || [],
          casesByType: (casesByType as any).rows || [],
          avgResolutionTime: ((avgResolutionTime as any).rows?.[0]?.avgDays || 0),
          casesByPriority: (casesByPriority as any).rows || [],
          casesByStatus: (casesByStatus as any).rows || [],
        };
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

  // Survey Anonymous Tokens (NOM-035 anonymous access)
  surveyAnonymousTokens: surveyAnonymousTokensRouter,
  notificationPreferences: notificationPreferencesRouter,
  predictiveAlerts: predictiveAlertsRouter,
  nineBoxGrid: nineBoxGridRouter,
  notificationLogs: notificationLogsRouter,
  skillsMatrixSnapshots: skillsMatrixSnapshotsRouter,
});

export type AppRouter = typeof appRouter;
