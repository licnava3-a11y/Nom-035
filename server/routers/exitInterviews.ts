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
      // Non-admin users can only see their own interviews
      if (ctx.user.role !== "admin") {
        conditions.push(eq(exitInterviews.employeeId, ctx.user.id));
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

      // Confidentiality: non-admin can only see their own
      if (ctx.user.role !== "admin" && interview.employeeId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes acceso a esta entrevista" });
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
      if (ctx.user.role !== "admin" && interview.employeeId !== ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "No tienes acceso a esta entrevista" });
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

      return {
        totalCompleted,
        terminationReasons,
        mainReasonDistribution,
        monthlyTrend,
        recommendationScore,
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
});
