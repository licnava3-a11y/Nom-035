import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import {
  exitInterviews,
  exitInterviewQuestions,
  exitInterviewResponses,
  employeeTerminations,
  employees,
  users,
  departments,
  turnoverActionPlans,
} from "../../drizzle/schema";
import { eq, desc, and, sql, count, inArray } from "drizzle-orm";

// ── Catálogo de 15 preguntas estándar NOM-035 sobre causas de rotación ──────
type Database = NonNullable<Awaited<ReturnType<typeof getDb>>>;

async function getAuthenticatedEmployeeId(db: Database, userId: number) {
  const employee = await db
    .select({ id: employees.id })
    .from(employees)
    .where(eq(employees.userId, userId))
    .limit(1);

  if (employee.length === 0) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "No existe un perfil de colaborador vinculado a esta cuenta",
    });
  }

  return employee[0].id;
}

const DEFAULT_QUESTIONS = [
  { order: 1, category: "ambiente", questionText: "¿Cómo calificarías el ambiente de trabajo en tu área?", options: ["Muy bueno", "Bueno", "Regular", "Malo", "Muy malo"] },
  { order: 2, category: "liderazgo", questionText: "¿Cómo fue tu relación con tu jefe directo?", options: ["Excelente", "Buena", "Regular", "Difícil", "Muy difícil"] },
  { order: 3, category: "compensacion", questionText: "¿Consideras que tu salario era justo para las responsabilidades del puesto?", options: ["Totalmente de acuerdo", "De acuerdo", "Neutral", "En desacuerdo", "Totalmente en desacuerdo"] },
  { order: 4, category: "desarrollo", questionText: "¿Tuviste oportunidades de crecimiento y desarrollo profesional?", options: ["Sí, muchas", "Algunas", "Pocas", "Ninguna", "No aplica"] },
  { order: 5, category: "carga_trabajo", questionText: "¿Cómo describirías la carga de trabajo que tenías?", options: ["Muy adecuada", "Adecuada", "Algo excesiva", "Excesiva", "Insostenible"] },
  { order: 6, category: "reconocimiento", questionText: "¿Sentiste que tu trabajo era reconocido y valorado?", options: ["Siempre", "Frecuentemente", "A veces", "Raramente", "Nunca"] },
  { order: 7, category: "comunicacion", questionText: "¿Cómo evalúas la comunicación interna en la organización?", options: ["Muy efectiva", "Efectiva", "Regular", "Deficiente", "Muy deficiente"] },
  { order: 8, category: "herramientas", questionText: "¿Contabas con las herramientas y recursos necesarios para realizar tu trabajo?", options: ["Siempre", "Casi siempre", "A veces", "Raramente", "Nunca"] },
  { order: 9, category: "equilibrio", questionText: "¿Pudiste mantener un equilibrio adecuado entre tu vida laboral y personal?", options: ["Siempre", "Casi siempre", "A veces", "Raramente", "Nunca"] },
  { order: 10, category: "capacitacion", questionText: "¿Recibiste la capacitación necesaria para desempeñar tu puesto?", options: ["Sí, completa", "Parcialmente", "Mínima", "Insuficiente", "No recibí"] },
  { order: 11, category: "compañeros", questionText: "¿Cómo fue tu relación con tus compañeros de trabajo?", options: ["Excelente", "Buena", "Regular", "Difícil", "Muy difícil"] },
  { order: 12, category: "politicas", questionText: "¿Las políticas y procedimientos de la empresa te parecían claros y justos?", options: ["Totalmente", "En su mayoría", "Parcialmente", "Poco", "No"] },
  { order: 13, category: "seguridad", questionText: "¿Te sentiste seguro/a en tu lugar de trabajo (física y emocionalmente)?", options: ["Siempre", "Casi siempre", "A veces", "Raramente", "Nunca"] },
  { order: 14, category: "motivo_salida", questionText: "¿Cuál es la razón principal de tu salida?", options: ["Mejor oferta económica", "Crecimiento profesional externo", "Problemas con el jefe", "Ambiente laboral", "Motivos personales", "Reubicación geográfica", "Otro"] },
  { order: 15, category: "recomendacion", questionText: "¿Recomendarías esta empresa como lugar de trabajo?", options: ["Definitivamente sí", "Probablemente sí", "No estoy seguro/a", "Probablemente no", "Definitivamente no"] },
];

export const exitInterviewsRouter = router({
  // ── Inicializar preguntas por defecto (solo admin) ─────────────────────────
  initDefaultQuestions: protectedProcedure.mutation(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Solo administradores pueden inicializar preguntas" });
    }
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

    // Check if questions already exist
    const existing = await db.select({ id: exitInterviewQuestions.id }).from(exitInterviewQuestions).limit(1);
    if (existing.length > 0) {
      return { initialized: false, message: "Las preguntas ya están inicializadas" };
    }

    for (const q of DEFAULT_QUESTIONS) {
      await (db.insert(exitInterviewQuestions) as any).values({
        questionText: q.questionText,
        questionType: "multiple_choice",
        options: q.options,
        category: q.category,
        order: q.order,
        isActive: true,
      });
    }
    return { initialized: true, count: DEFAULT_QUESTIONS.length };
  }),

  // ── Listar preguntas activas ───────────────────────────────────────────────
  getQuestions: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
    return db
      .select()
      .from(exitInterviewQuestions)
      .where(eq(exitInterviewQuestions.isActive, true))
      .orderBy(exitInterviewQuestions.order);
  }),

  // ── Registrar baja de empleado y crear entrevista pendiente ───────────────
  registerTermination: protectedProcedure
    .input(z.object({
      employeeId: z.number().int().positive(),
      terminationDate: z.string().min(1, "Fecha de baja requerida"),
      terminationReason: z.enum(["resignation", "dismissal", "retirement", "contract_end", "mutual_agreement", "death", "other"]),
      terminationReasonDetails: z.string().optional(),
      noticeGiven: z.boolean().default(false),
      noticePeriodDays: z.number().int().min(0).optional(),
      finalWorkDate: z.string().optional(),
      severancePayment: z.number().min(0).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Solo administradores pueden registrar bajas" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      // Create termination record
      const [termination] = await (db.insert(employeeTerminations) as any).values({
        employeeId: input.employeeId,
        terminationDate: input.terminationDate,
        terminationReason: input.terminationReason,
        terminationReasonDetails: input.terminationReasonDetails ?? null,
        noticeGiven: input.noticeGiven,
        noticePeriodDays: input.noticePeriodDays ?? null,
        finalWorkDate: input.finalWorkDate ?? null,
        severancePayment: input.severancePayment?.toString() ?? null,
        notes: input.notes ?? null,
        processedBy: ctx.user.id,
      }).$returningId();

      // Create pending exit interview
      const [interview] = await (db.insert(exitInterviews) as any).values({
        terminationId: termination.id,
        employeeId: input.employeeId,
        isConfidential: true,
        status: "pending",
        conductedBy: ctx.user.id,
      }).$returningId();

      return { terminationId: termination.id, interviewId: interview.id };
    }),

  // ── Listar entrevistas (admin ve todas, empleado ve las suyas) ─────────────
  list: protectedProcedure
    .input(z.object({
      status: z.enum(["pending", "completed", "all"]).default("all"),
      page: z.number().int().min(1).default(1),
      pageSize: z.number().int().min(1).max(50).default(20),
    }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      const offset = (input.page - 1) * input.pageSize;
      const conditions = [];

      if (input.status !== "all") {
        conditions.push(eq(exitInterviews.status, input.status));
      }
      // Los usuarios no administradores solo ven entrevistas de su propio perfil de colaborador.
      if (ctx.user.role !== "admin") {
        const employeeId = await getAuthenticatedEmployeeId(db, ctx.user.id);
        conditions.push(eq(exitInterviews.employeeId, employeeId));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [rows, [{ total }]] = await Promise.all([
        db
          .select({
            id: exitInterviews.id,
            status: exitInterviews.status,
            isConfidential: exitInterviews.isConfidential,
            completedAt: exitInterviews.completedAt,
            createdAt: exitInterviews.createdAt,
            employeeId: exitInterviews.employeeId,
            employeeName: sql<string>`CONCAT(${employees.firstName}, ' ', ${employees.lastName})`,
            department: departments.name,
            terminationReason: employeeTerminations.terminationReason,
            terminationDate: employeeTerminations.terminationDate,
          })
          .from(exitInterviews)
          .leftJoin(employees, eq(exitInterviews.employeeId, employees.id))
          .leftJoin(departments, eq(employees.departmentId, departments.id))
          .leftJoin(employeeTerminations, eq(exitInterviews.terminationId, employeeTerminations.id))
          .where(whereClause)
          .orderBy(desc(exitInterviews.createdAt))
          .limit(input.pageSize)
          .offset(offset),
        db.select({ total: count() }).from(exitInterviews).where(whereClause),
      ]);

      return { rows, total, page: input.page, pageSize: input.pageSize };
    }),

  // ── Obtener entrevista con respuestas ─────────────────────────────────────
  getById: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      const [interview] = await db
        .select({
          id: exitInterviews.id,
          status: exitInterviews.status,
          isConfidential: exitInterviews.isConfidential,
          additionalComments: exitInterviews.additionalComments,
          completedAt: exitInterviews.completedAt,
          createdAt: exitInterviews.createdAt,
          employeeId: exitInterviews.employeeId,
          employeeName: sql<string>`CONCAT(${employees.firstName}, ' ', ${employees.lastName})`,
          department: departments.name,
          terminationReason: employeeTerminations.terminationReason,
          terminationDate: employeeTerminations.terminationDate,
        })
        .from(exitInterviews)
        .leftJoin(employees, eq(exitInterviews.employeeId, employees.id))
        .leftJoin(departments, eq(employees.departmentId, departments.id))
        .leftJoin(employeeTerminations, eq(exitInterviews.terminationId, employeeTerminations.id))
        .where(eq(exitInterviews.id, input.id))
        .limit(1);

      if (!interview) throw new TRPCError({ code: "NOT_FOUND", message: "Entrevista no encontrada" });

      // Confidentiality: los usuarios no administradores solo consultan su propia entrevista.
      if (ctx.user.role !== "admin") {
        const employeeId = await getAuthenticatedEmployeeId(db, ctx.user.id);
        if (interview.employeeId !== employeeId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes acceso a esta entrevista" });
        }
      }

      const responses = await db
        .select({
          questionId: exitInterviewResponses.questionId,
          response: exitInterviewResponses.response,
          questionText: exitInterviewQuestions.questionText,
          category: exitInterviewQuestions.category,
          options: exitInterviewQuestions.options,
        })
        .from(exitInterviewResponses)
        .leftJoin(exitInterviewQuestions, eq(exitInterviewResponses.questionId, exitInterviewQuestions.id))
        .where(eq(exitInterviewResponses.exitInterviewId, input.id));

      return { ...interview, responses };
    }),

  // ── Guardar respuestas de la entrevista ───────────────────────────────────
  submitResponses: protectedProcedure
    .input(z.object({
      interviewId: z.number().int().positive(),
      responses: z.array(z.object({
        questionId: z.number().int().positive(),
        response: z.string().min(1),
      })).min(1),
      additionalComments: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      const [interview] = await db
        .select({ id: exitInterviews.id, employeeId: exitInterviews.employeeId, status: exitInterviews.status })
        .from(exitInterviews)
        .where(eq(exitInterviews.id, input.interviewId))
        .limit(1);

      if (!interview) throw new TRPCError({ code: "NOT_FOUND", message: "Entrevista no encontrada" });
      if (interview.status === "completed") throw new TRPCError({ code: "BAD_REQUEST", message: "La entrevista ya fue completada" });
      if (ctx.user.role !== "admin") {
        const employeeId = await getAuthenticatedEmployeeId(db, ctx.user.id);
        if (interview.employeeId !== employeeId) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No tienes acceso a esta entrevista" });
        }
      }

      // Delete existing responses (re-submit)
      await db.delete(exitInterviewResponses).where(eq(exitInterviewResponses.exitInterviewId, input.interviewId));

      // Insert new responses
      for (const r of input.responses) {
        await (db.insert(exitInterviewResponses) as any).values({
          exitInterviewId: input.interviewId,
          questionId: r.questionId,
          response: r.response,
        });
      }

      // Mark as completed
      await db.update(exitInterviews)
        .set({
          status: "completed",
          completedAt: new Date(),
          additionalComments: input.additionalComments ?? null,
        })
        .where(eq(exitInterviews.id, input.interviewId));

      return { success: true };
    }),

  // ── Dashboard: análisis acumulativo de causas de rotación (solo admin) ────
  getAnalytics: protectedProcedure
    .input(z.object({
      year: z.number().int().min(2020).max(2030).optional(),
      month: z.number().int().min(1).max(12).optional(),
    }))
    .query(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Solo administradores pueden ver el análisis" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      // Total interviews completed
      const [{ totalCompleted }] = await db
        .select({ totalCompleted: count() })
        .from(exitInterviews)
        .where(eq(exitInterviews.status, "completed"));

      // Termination reasons distribution
      const terminationReasons = await db
        .select({
          reason: employeeTerminations.terminationReason,
          total: count(),
        })
        .from(exitInterviews)
        .leftJoin(employeeTerminations, eq(exitInterviews.terminationId, employeeTerminations.id))
        .where(eq(exitInterviews.status, "completed"))
        .groupBy(employeeTerminations.terminationReason);

      // Top responses per category (from question 14 - main reason)
      const mainReasonQuestion = await db
        .select({ id: exitInterviewQuestions.id })
        .from(exitInterviewQuestions)
        .where(eq(exitInterviewQuestions.order, 14))
        .limit(1);

      let mainReasonDistribution: { response: string; total: number }[] = [];
      if (mainReasonQuestion.length > 0) {
        mainReasonDistribution = await db
          .select({
            response: exitInterviewResponses.response,
            total: count(),
          })
          .from(exitInterviewResponses)
          .where(eq(exitInterviewResponses.questionId, mainReasonQuestion[0].id))
          .groupBy(exitInterviewResponses.response)
          .orderBy(desc(count()));
      }

      // Monthly trend (last 12 months)
      const monthlyTrend = await db
        .select({
          month: sql<string>`DATE_FORMAT(${exitInterviews.completedAt}, '%Y-%m')`,
          total: count(),
        })
        .from(exitInterviews)
        .where(
          and(
            eq(exitInterviews.status, "completed"),
            sql`${exitInterviews.completedAt} >= DATE_SUB(NOW(), INTERVAL 12 MONTH)`
          )
        )
        .groupBy(sql`DATE_FORMAT(${exitInterviews.completedAt}, '%Y-%m')`)
        .orderBy(sql`DATE_FORMAT(${exitInterviews.completedAt}, '%Y-%m')`);

      // Recommendation score (question 15)
      const recommendQuestion = await db
        .select({ id: exitInterviewQuestions.id })
        .from(exitInterviewQuestions)
        .where(eq(exitInterviewQuestions.order, 15))
        .limit(1);

      let recommendationScore = 0;
      if (recommendQuestion.length > 0) {
        const recs = await db
          .select({ response: exitInterviewResponses.response, total: count() })
          .from(exitInterviewResponses)
          .where(eq(exitInterviewResponses.questionId, recommendQuestion[0].id))
          .groupBy(exitInterviewResponses.response);

        const positive = recs.filter(r => r.response.includes("sí") || r.response.includes("Sí")).reduce((a, r) => a + r.total, 0);
        const total = recs.reduce((a, r) => a + r.total, 0);
        recommendationScore = total > 0 ? Math.round((positive / total) * 100) : 0;
      }

      // Department breakdown
      const departmentBreakdown = await db
        .select({
          department: departments.name,
          total: count(),
        })
        .from(exitInterviews)
        .leftJoin(employeeTerminations, eq(exitInterviews.terminationId, employeeTerminations.id))
        .leftJoin(employees, eq(employeeTerminations.employeeId, employees.id))
        .leftJoin(departments, eq(employees.departmentId, departments.id))
        .where(eq(exitInterviews.status, "completed"))
        .groupBy(departments.name)
        .orderBy(desc(count()));
      // Monthly trend previous year (same 12 months, one year back) for interannual comparison
      const monthlyTrendPrevYear = await db
        .select({
          month: sql<string>`DATE_FORMAT(${exitInterviews.completedAt}, '%Y-%m')`,
          total: count(),
        })
        .from(exitInterviews)
        .where(
          and(
            eq(exitInterviews.status, "completed"),
            sql`${exitInterviews.completedAt} >= DATE_SUB(NOW(), INTERVAL 24 MONTH)`,
            sql`${exitInterviews.completedAt} < DATE_SUB(NOW(), INTERVAL 12 MONTH)`
          )
        )
        .groupBy(sql`DATE_FORMAT(${exitInterviews.completedAt}, '%Y-%m')`)
        .orderBy(sql`DATE_FORMAT(${exitInterviews.completedAt}, '%Y-%m')`);
      // Quarterly trend (last 8 quarters)
      const quarterlyTrend = await db
        .select({
          quarter: sql<string>`CONCAT(YEAR(${exitInterviews.completedAt}), '-Q', QUARTER(${exitInterviews.completedAt}))`,
          total: count(),
        })
        .from(exitInterviews)
        .where(
          and(
            eq(exitInterviews.status, "completed"),
            sql`${exitInterviews.completedAt} >= DATE_SUB(NOW(), INTERVAL 24 MONTH)`
          )
        )
        .groupBy(sql`CONCAT(YEAR(${exitInterviews.completedAt}), '-Q', QUARTER(${exitInterviews.completedAt}))`)
        .orderBy(sql`CONCAT(YEAR(${exitInterviews.completedAt}), '-Q', QUARTER(${exitInterviews.completedAt}))`);
      return {
        totalCompleted,
        terminationReasons,
        mainReasonDistribution,
        monthlyTrend,
        monthlyTrendPrevYear,
        recommendationScore,
        departmentBreakdown,
        quarterlyTrend,
      };
    }),

  // ── Crear plan de acción basado en análisis ───────────────────────────────
  createActionPlan: protectedProcedure
    .input(z.object({
      title: z.string().min(3).max(255),
      description: z.string().min(10),
      primaryCauses: z.array(z.string().min(1)).min(1),
      proposedActions: z.array(z.string().min(1)).min(1),
      analysisStartDate: z.string().min(1),
      analysisEndDate: z.string().min(1),
      assignedTo: z.number().int().positive().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Solo administradores pueden crear planes de acción" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      const [plan] = await (db.insert(turnoverActionPlans) as any).values({
        title: input.title,
        description: input.description,
        primaryCauses: input.primaryCauses,
        proposedActions: input.proposedActions,
        analysisStartDate: input.analysisStartDate,
        analysisEndDate: input.analysisEndDate,
        assignedTo: input.assignedTo ?? null,
        status: "draft",
        createdBy: ctx.user.id,
      }).$returningId();

      return { id: plan.id };
    }),

  // ── CRUD Catálogo de Preguntas (admin) ──────────────────────────────────
  getAllQuestions: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: 'Solo administradores' });
    const db = await getDb();
    if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB no disponible' });
    return db.select().from(exitInterviewQuestions).orderBy(exitInterviewQuestions.order);
  }),

  addQuestion: protectedProcedure
    .input(z.object({
      questionText: z.string().min(5, 'La pregunta debe tener al menos 5 caracteres'),
      category: z.string().min(1, 'Categoría requerida'),
      options: z.array(z.string()).min(2, 'Se requieren al menos 2 opciones').optional(),
      order: z.number().int().min(1).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: 'Solo administradores' });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB no disponible' });
      const [{ maxOrder }] = await db.select({ maxOrder: sql<number>`COALESCE(MAX(${exitInterviewQuestions.order}), 0)` }).from(exitInterviewQuestions);
      await (db.insert(exitInterviewQuestions) as any).values({
        questionText: input.questionText,
        questionType: 'multiple_choice',
        options: input.options ?? ['Muy satisfecho', 'Satisfecho', 'Neutral', 'Insatisfecho', 'Muy insatisfecho'],
        category: input.category,
        order: input.order ?? (maxOrder + 1),
        isActive: true,
      });
      return { success: true };
    }),

  updateQuestion: protectedProcedure
    .input(z.object({
      id: z.number().int().positive(),
      questionText: z.string().min(5).optional(),
      category: z.string().optional(),
      options: z.array(z.string()).min(2).optional(),
      order: z.number().int().min(1).optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: 'Solo administradores' });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB no disponible' });
      const { id, ...data } = input;
      await (db.update(exitInterviewQuestions) as any).set({ ...data, updatedAt: new Date() }).where(eq(exitInterviewQuestions.id, id));
      return { success: true };
    }),

  deleteQuestion: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== 'admin') throw new TRPCError({ code: 'FORBIDDEN', message: 'Solo administradores' });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: 'INTERNAL_SERVER_ERROR', message: 'DB no disponible' });
      // Soft delete: marcar como inactiva
      await (db.update(exitInterviewQuestions) as any).set({ isActive: false }).where(eq(exitInterviewQuestions.id, input.id));
      return { success: true };
    }),

  // ── Actualizar estado de plan de acción (con notificación al completar) ───────
  updateActionPlanStatus: protectedProcedure
    .input(z.object({
      id: z.number(),
      status: z.enum(["draft", "approved", "in_progress", "completed"]),
    }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
      const [existing] = await db
        .select({ id: turnoverActionPlans.id, title: turnoverActionPlans.title, status: turnoverActionPlans.status })
        .from(turnoverActionPlans)
        .where(eq(turnoverActionPlans.id, input.id))
        .limit(1);
      if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Plan no encontrado" });
      await (db.update(turnoverActionPlans) as any)
        .set({ status: input.status, updatedAt: new Date() })
        .where(eq(turnoverActionPlans.id, input.id));
      // Notificar al owner cuando el plan se marca como completado
      if (input.status === "completed" && existing.status !== "completed") {
        try {
          const { notifyOwner } = await import("../_core/notification");
          await notifyOwner({
            title: `✅ Plan de Acción Completado: ${existing.title}`,
            content: `El plan de acción "${existing.title}" (ID #${input.id}) ha sido marcado como completado por ${ctx.user.name ?? ctx.user.email ?? "un administrador"}. Revisa el módulo de Entrevistas de Salida para ver el resumen de acciones ejecutadas.`,
          });
        } catch { /* notificación no crítica */ }
      }
      return { success: true, newStatus: input.status };
    }),

  // ── Eliminar plan de acción ───────────────────────────────────────────────
  deleteActionPlan: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });
      await db.delete(turnoverActionPlans).where(eq(turnoverActionPlans.id, input.id));
      return { success: true };
    }),

  // ── Listar planes de acción ───────────────────────────────────────────────
  listActionPlans: protectedProcedure.query(async ({ ctx }) => {
    if (ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN", message: "Solo administradores pueden ver los planes de acción" });
    }
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

    return db
      .select({
        id: turnoverActionPlans.id,
        title: turnoverActionPlans.title,
        description: turnoverActionPlans.description,
        primaryCauses: turnoverActionPlans.primaryCauses,
        proposedActions: turnoverActionPlans.proposedActions,
        analysisStartDate: turnoverActionPlans.analysisStartDate,
        analysisEndDate: turnoverActionPlans.analysisEndDate,
        status: turnoverActionPlans.status,
        createdAt: turnoverActionPlans.createdAt,
        assignedToName: users.name,
      })
      .from(turnoverActionPlans)
      .leftJoin(users, eq(turnoverActionPlans.assignedTo, users.id))
      .orderBy(desc(turnoverActionPlans.createdAt));
  }),

  // ── Importar preguntas desde Excel/XLSX ────────────────────────────────────
  importQuestions: protectedProcedure
    .input(
      z.object({
        questions: z.array(
          z.object({
            questionText: z.string().min(1),
            category: z.string().optional(),
            order: z.number().optional(),
          })
        ).min(1).max(500),
        replaceAll: z.boolean().optional().default(false),
      })
    )
    .mutation(async ({ input, ctx }) => {
      if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "DB no disponible" });

      const VALID_CATEGORIES = [
        "Clima Laboral", "Liderazgo", "Desarrollo Profesional",
        "Compensación", "Condiciones de Trabajo", "Otro",
        "ambiente", "liderazgo", "compensacion", "desarrollo",
        "carga_trabajo", "reconocimiento", "comunicacion",
        "herramientas", "equilibrio", "capacitacion",
        "compañeros", "politicas", "seguridad", "motivo_salida", "recomendacion",
      ];

      if (input.replaceAll) {
        await db.update(exitInterviewQuestions)
          .set({ isActive: false })
          .where(eq(exitInterviewQuestions.isActive, true));
      }

      let inserted = 0;
      let skipped = 0;
      for (let i = 0; i < input.questions.length; i++) {
        const q = input.questions[i];
        const text = q.questionText.trim();
        if (!text) { skipped++; continue; }
        const cat = VALID_CATEGORIES.includes(q.category ?? "") ? q.category! : "Otro";
        const maxOrderResult = await db
          .select({ m: sql<number>`COALESCE(MAX(\`order\`), 0)` })
          .from(exitInterviewQuestions);
        const nextOrder = (maxOrderResult[0]?.m ?? 0) + 1;
        await (db.insert(exitInterviewQuestions) as any).values({
          questionText: text,
          category: cat,
          order: q.order ?? nextOrder,
          isActive: true,
        });
        inserted++;
      }
      return { success: true, inserted, skipped };
    }),
});
