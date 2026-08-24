import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  users,
  cases,
  surveyResponses,
  employees,
  trainingAssignments,
  courses,
} from "../../drizzle/schema";
import { eq, and, sql, gte } from "drizzle-orm";

/**
 * Dashboard Router - Procedures para dashboard de gerente.
 * Las métricas se calculan exclusivamente a partir de registros persistidos.
 */
export const dashboardRouter = router({
  // Estadísticas del gerente
  getManagerStats: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Total de usuarios
    const totalUsers = db
      ? await db.select({ count: sql<number>`count(*)` }).from(users)
      : [{ count: 0 }];

    // Casos abiertos
    const openCases = db
      ? await db
          .select({ count: sql<number>`count(*)` })
          .from(cases)
          .where(sql`${cases.status} = 'open'`)
      : [{ count: 0 }];

    // Casos en investigación
    const casesInInvestigation = db
      ? await db
          .select({ count: sql<number>`count(*)` })
          .from(cases)
          .where(sql`${cases.status} = 'investigating'`)
      : [{ count: 0 }];

    // Total de empleados activos
    const activeEmployees = db
      ? await db
          .select({ count: sql<number>`count(*)` })
          .from(employees)
          .where(eq(employees.isActive, true))
      : [{ count: 0 }];

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);

    const newEmployees = await db
      .select({ count: sql<number>`count(*)` })
      .from(employees)
      .where(
        and(eq(employees.isActive, true), gte(employees.hireDate, monthStart))
      );

    // Total de personas con respuestas NOM-035 concluidas.
    const totalSurveyResponses = db
      ? await db
          .select({
            count: sql<number>`count(DISTINCT coalesce(${surveyResponses.userId}, ${surveyResponses.curp}))`,
          })
          .from(surveyResponses)
          .where(sql`${surveyResponses.completedAt} IS NOT NULL`)
      : [{ count: 0 }];

    // Calcular cumplimiento NOM-035 (% de empleados que han respondido encuestas)
    const activeEmployeesCount = Number(activeEmployees[0]?.count || 0);
    const respondedEmployeesCount = Number(totalSurveyResponses[0]?.count || 0);
    const nom035Compliance =
      activeEmployeesCount > 0
        ? Math.round((respondedEmployeesCount / activeEmployeesCount) * 100)
        : 0;

    return {
      activeEmployees: activeEmployeesCount,
      newEmployeesThisMonth: Number(newEmployees[0]?.count || 0),
      nom035Compliance,
      nom035Trend: "stable" as const,
      nom035Change: 0,
      openCases: Number(openCases[0]?.count || 0),
      casesInInvestigation: Number(casesInInvestigation[0]?.count || 0),
      overallPerformance: nom035Compliance, // Usar cumplimiento NOM-035 como métrica general
    };
  }),

  // Estado verificable de las asignaciones de capacitación registradas.
  getTeamPerformance: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const assignmentCounts = await db
      .select({
        total: sql<number>`count(*)`,
        completed: sql<number>`sum(case when ${trainingAssignments.status} = 'completed' then 1 else 0 end)`,
      })
      .from(trainingAssignments);

    const total = Number(assignmentCounts[0]?.total || 0);
    const completed = Number(assignmentCounts[0]?.completed || 0);
    const completionRate =
      total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      labels: total > 0 ? ["Asignaciones registradas"] : [],
      trainingCompletion: total > 0 ? [completionRate] : [],
    };
  }),

  // Métricas de cumplimiento NOM-035 calculadas desde fuentes disponibles.
  getNOM035Compliance: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [
      employeeCount,
      responseCount,
      assignmentCount,
      resolvedCaseCount,
      totalCaseCount,
    ] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(employees)
        .where(eq(employees.isActive, true)),
      db
        .select({
          count: sql<number>`count(DISTINCT coalesce(${surveyResponses.userId}, ${surveyResponses.curp}))`,
        })
        .from(surveyResponses)
        .where(sql`${surveyResponses.completedAt} IS NOT NULL`),
      db
        .select({
          total: sql<number>`count(*)`,
          completed: sql<number>`sum(case when ${trainingAssignments.status} = 'completed' then 1 else 0 end)`,
        })
        .from(trainingAssignments),
      db
        .select({ count: sql<number>`count(*)` })
        .from(cases)
        .where(sql`${cases.status} IN ('resolved', 'closed')`),
      db.select({ count: sql<number>`count(*)` }).from(cases),
    ]);

    const employeesTotal = Number(employeeCount[0]?.count || 0);
    const responsesTotal = Number(responseCount[0]?.count || 0);
    const assignmentsTotal = Number(assignmentCount[0]?.total || 0);
    const assignmentsCompleted = Number(assignmentCount[0]?.completed || 0);
    const casesTotal = Number(totalCaseCount[0]?.count || 0);
    const casesResolved = Number(resolvedCaseCount[0]?.count || 0);

    return {
      labels: [
        "Encuestas NOM-035",
        "Capacitaciones asignadas",
        "Casos atendidos",
      ],
      values: [
        employeesTotal > 0
          ? Math.round((responsesTotal / employeesTotal) * 100)
          : 0,
        assignmentsTotal > 0
          ? Math.round((assignmentsCompleted / assignmentsTotal) * 100)
          : 0,
        casesTotal > 0 ? Math.round((casesResolved / casesTotal) * 100) : 0,
      ],
    };
  }),

  getReportsMetrics: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const [
      employeeCount,
      responseCount,
      assignmentCount,
      resolvedCaseCount,
      totalCaseCount,
      caseRows,
      courseRows,
    ] = await Promise.all([
      db
        .select({ count: sql<number>`count(*)` })
        .from(employees)
        .where(eq(employees.isActive, true)),
      db
        .select({
          count: sql<number>`count(DISTINCT coalesce(${surveyResponses.userId}, ${surveyResponses.curp}))`,
        })
        .from(surveyResponses)
        .where(sql`${surveyResponses.completedAt} IS NOT NULL`),
      db
        .select({
          total: sql<number>`count(*)`,
          completed: sql<number>`sum(case when ${trainingAssignments.status} = 'completed' then 1 else 0 end)`,
          inProgress: sql<number>`sum(case when ${trainingAssignments.status} = 'in_progress' then 1 else 0 end)`,
        })
        .from(trainingAssignments),
      db
        .select({ count: sql<number>`count(*)` })
        .from(cases)
        .where(sql`${cases.status} IN ('resolved', 'closed')`),
      db.select({ count: sql<number>`count(*)` }).from(cases),
      db
        .select({ type: cases.caseType, value: sql<number>`count(*)` })
        .from(cases)
        .groupBy(cases.caseType),
      db
        .select({ category: courses.category, value: sql<number>`count(*)` })
        .from(courses)
        .where(eq(courses.isPublished, true))
        .groupBy(courses.category),
    ]);

    const activeEmployees = Number(employeeCount[0]?.count || 0);
    const completedSurveys = Number(responseCount[0]?.count || 0);
    const assignedTrainings = Number(assignmentCount[0]?.total || 0);
    const completedTrainings = Number(assignmentCount[0]?.completed || 0);
    const inProgressTrainings = Number(assignmentCount[0]?.inProgress || 0);
    const totalCases = Number(totalCaseCount[0]?.count || 0);
    const resolvedCases = Number(resolvedCaseCount[0]?.count || 0);

    const caseLabels: Record<string, string> = {
      mobbing: "Mobbing",
      burnout: "Burnout",
      violence: "Violencia",
      stress: "Estrés",
      other: "Otro",
    };
    const categoryLabels: Record<string, string> = {
      fundamentos: "Fundamentos",
      categorias_dominios: "Categorías y dominios",
      mobbing: "Mobbing",
      burnout: "Burnout",
      protocolos: "Protocolos",
      comite: "Comité",
      analisis_puestos: "Análisis de puestos",
      otros: "Otros",
    };

    return {
      stats: {
        completedTrainings,
        trainedParticipants: completedTrainings,
        resolvedCases,
        nom035Compliance:
          activeEmployees > 0
            ? Math.round((completedSurveys / activeEmployees) * 100)
            : 0,
      },
      training:
        assignedTrainings > 0
          ? [
              {
                name: "Asignaciones actuales",
                completadas: completedTrainings,
                enProgreso: inProgressTrainings,
              },
            ]
          : [],
      cases: caseRows.map(row => ({
        name: caseLabels[row.type] ?? row.type,
        value: Number(row.value || 0),
      })),
      compliance:
        activeEmployees > 0
          ? [
              {
                mes: "Actual",
                cumplimiento: Math.round(
                  (completedSurveys / activeEmployees) * 100
                ),
              },
            ]
          : [],
      categories: courseRows.map(row => ({
        categoria: categoryLabels[row.category] ?? row.category,
        cantidad: Number(row.value || 0),
      })),
      hasData: activeEmployees > 0 || assignedTrainings > 0 || totalCases > 0,
    };
  }),
});
