import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import {
  cases,
  correctiveActions,
  departments,
  employees,
  nom035Cases,
  surveyResponses,
  surveys,
} from "../../drizzle/schema";
import { eq, and, isNull, sql, lt, lte, gte } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const earlyWarningsRouter = router({
  /**
   * Get cases about to expire (próximos a vencer)
   * Returns cases with less than 30 days to deadline
   */
  getCasesAboutToExpire: protectedProcedure
    .input(
      z
        .object({
          department: z.string().optional(),
          priority: z.enum(["high", "medium", "low", "all"]).default("all"),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        })
        .optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const today = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(today.getDate() + 30);

      const cases = await db
        .select({
          id: nom035Cases.id,
          folio: nom035Cases.folio,
          employeeId: nom035Cases.employeeId,
          employeeName: sql<string>`CONCAT(${employees.firstName}, ' ', ${employees.lastName})`,
          departmentId: employees.departmentId,
          department: departments.name,
          riskLevel: nom035Cases.riskLevel,
          riskCategory: nom035Cases.riskCategory,
          description: nom035Cases.description,
          deadline: nom035Cases.deadline,
          status: nom035Cases.status,
          daysRemaining: sql<number>`DATEDIFF(${nom035Cases.deadline}, CURDATE())`,
        })
        .from(nom035Cases)
        .leftJoin(employees, eq(nom035Cases.employeeId, employees.id))
        .leftJoin(departments, eq(employees.departmentId, departments.id))
        .where(
          and(
            lte(nom035Cases.deadline, thirtyDaysFromNow),
            sql`${nom035Cases.status} != 'closed'`,
            input?.department
              ? eq(employees.departmentId, parseInt(input.department))
              : undefined,
            input?.startDate
              ? gte(nom035Cases.deadline, new Date(input.startDate))
              : undefined,
            input?.endDate
              ? lte(nom035Cases.deadline, new Date(input.endDate))
              : undefined
          )
        )
        .orderBy(nom035Cases.deadline);

      // Filter by priority after query (since priority is calculated)
      let filteredCases = cases;
      if (input?.priority && input.priority !== "all") {
        filteredCases = cases.filter((c: any) => {
          const priority =
            c.daysRemaining <= 7
              ? "high"
              : c.daysRemaining <= 15
                ? "medium"
                : "low";
          return priority === input.priority;
        });
      }

      return {
        cases: filteredCases.map((c: any) => ({
          ...c,
          priority:
            c.daysRemaining <= 7
              ? "high"
              : c.daysRemaining <= 15
                ? "medium"
                : "low",
          priorityColor:
            c.daysRemaining <= 7
              ? "red"
              : c.daysRemaining <= 15
                ? "yellow"
                : "green",
        })),
        total: cases.length,
        highPriority: cases.filter((c: any) => c.daysRemaining <= 7).length,
        mediumPriority: cases.filter(
          (c: any) => c.daysRemaining > 7 && c.daysRemaining <= 15
        ).length,
        lowPriority: cases.filter((c: any) => c.daysRemaining > 15).length,
      };
    }),

  /**
   * Get pending surveys by department
   * Returns surveys that should be applied but haven't been completed
   */
  getPendingSurveys: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });

    const today = new Date();

    // Get all active surveys with completion stats
    const surveysData = await db
      .select({
        id: surveys.id,
        title: surveys.title,
        type: surveys.type,
        status: surveys.status,
        startDate: surveys.startDate,
        endDate: surveys.endDate,
        // departmentName: departments.name, // departments table not available
        createdAt: surveys.createdAt,
        totalResponses: sql<number>`COUNT(DISTINCT ${surveyResponses.id})`,
        completedResponses: sql<number>`SUM(CASE WHEN ${surveyResponses.completedAt} IS NOT NULL THEN 1 ELSE 0 END)`,
        daysOverdue: sql<number>`CASE WHEN ${surveys.endDate} IS NOT NULL THEN DATEDIFF(CURDATE(), ${surveys.endDate}) ELSE 0 END`,
      })
      .from(surveys)
      .leftJoin(surveyResponses, eq(surveys.id, surveyResponses.surveyId))
      .where(
        and(
          sql`${surveys.status} = 'active'`,
          sql`${surveys.endDate} IS NOT NULL AND ${surveys.endDate} < CURDATE()`
        )
      )
      .groupBy(surveys.id)
      .orderBy(
        sql`CASE WHEN ${surveys.endDate} IS NOT NULL THEN DATEDIFF(CURDATE(), ${surveys.endDate}) ELSE 0 END DESC`
      );

    return {
      surveys: surveysData.map((s: any) => ({
        ...s,
        completionRate:
          s.totalResponses > 0
            ? (s.completedResponses / s.totalResponses) * 100
            : 0,
        priority:
          s.daysOverdue > 30 ? "high" : s.daysOverdue > 15 ? "medium" : "low",
        priorityColor:
          s.daysOverdue > 30 ? "red" : s.daysOverdue > 15 ? "yellow" : "green",
      })),
      total: surveysData.length,
      highPriority: surveysData.filter((s: any) => s.daysOverdue > 30).length,
      mediumPriority: surveysData.filter(
        (s: any) => s.daysOverdue > 15 && s.daysOverdue <= 30
      ).length,
      lowPriority: surveysData.filter((s: any) => s.daysOverdue <= 15).length,
    };
  }),

  /**
   * Get corrective actions without follow-up
   * Returns actions that haven't been updated in 30+ days
   */
  getActionsWithoutFollowUp: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const actions = await db
      .select({
        id: correctiveActions.id,
        title: correctiveActions.title,
        description: correctiveActions.description,
        status: correctiveActions.status,
        priority: correctiveActions.priority,
        riskLevel: correctiveActions.riskLevel,
        assignedTo: sql<string>`CONCAT(${employees.firstName}, ' ', ${employees.lastName})`,
        department: correctiveActions.departamento,
        dueDate: correctiveActions.dueDate,
        createdAt: correctiveActions.createdAt,
        lastUpdated: correctiveActions.updatedAt,
        daysSinceUpdate: sql<number>`DATEDIFF(CURDATE(), ${correctiveActions.updatedAt})`,
      })
      .from(correctiveActions)
      .leftJoin(
        employees,
        eq(correctiveActions.responsibleUserId, employees.id)
      )
      .where(
        and(
          lt(correctiveActions.updatedAt, thirtyDaysAgo),
          sql`${correctiveActions.status} != 'completada'`
        )
      )
      .orderBy(sql`DATEDIFF(CURDATE(), ${correctiveActions.updatedAt}) DESC`);

    return {
      actions: actions.map((a: any) => ({
        ...a,
        alertPriority:
          a.daysSinceUpdate > 60
            ? "high"
            : a.daysSinceUpdate > 45
              ? "medium"
              : "low",
        priorityColor:
          a.daysSinceUpdate > 60
            ? "red"
            : a.daysSinceUpdate > 45
              ? "yellow"
              : "green",
      })),
      total: actions.length,
      highPriority: actions.filter((a: any) => a.daysSinceUpdate > 60).length,
      mediumPriority: actions.filter(
        (a: any) => a.daysSinceUpdate > 45 && a.daysSinceUpdate <= 60
      ).length,
      lowPriority: actions.filter((a: any) => a.daysSinceUpdate <= 45).length,
    };
  }),

  /**
   * Get summary of all early warnings
   */
  getSummary: protectedProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });

    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [casesCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(nom035Cases)
      .where(
        and(
          lte(nom035Cases.deadline, thirtyDaysFromNow),
          sql`${nom035Cases.status} != 'closed'`
        )
      );

    const [surveysCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(surveys)
      .where(
        and(
          sql`${surveys.status} = 'active'`,
          sql`${surveys.endDate} IS NOT NULL AND ${surveys.endDate} < CURDATE()`
        )
      );

    const [actionsCount] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(correctiveActions)
      .where(
        and(
          lt(correctiveActions.updatedAt, thirtyDaysAgo),
          sql`${correctiveActions.status} != 'completada'`
        )
      );

    return {
      casesAboutToExpire: casesCount?.count || 0,
      pendingSurveys: surveysCount?.count || 0,
      actionsWithoutFollowUp: actionsCount?.count || 0,
      totalAlerts:
        (casesCount?.count || 0) +
        (surveysCount?.count || 0) +
        (actionsCount?.count || 0),
    };
  }),

  /**
   * Get survey coverage alerts
   * Returns companies with survey coverage below 80% threshold (NOM-035 requirement)
   */
  getSurveyCoverageAlerts: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });

    // Obtener todas las encuestas activas
    const activeSurveys = await db
      .select({
        id: surveys.id,
        type: surveys.type,
        title: surveys.title,
      })
      .from(surveys)
      .where(sql`${surveys.status} = 'active'`);

    const coverageAlerts = [];

    for (const survey of activeSurveys) {
      // Contar total de trabajadores
      const [totalWorkers] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(employees);

      const totalWorkersCount = totalWorkers?.count || 0;

      // Contar respuestas completadas para esta encuesta
      const [completedResponses] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(surveyResponses)
        .where(
          and(
            eq(surveyResponses.surveyId, survey.id),
            sql`${surveyResponses.completedAt} IS NOT NULL`
          )
        );

      const completedCount = completedResponses?.count || 0;

      // Calcular cobertura
      const coverage =
        totalWorkersCount > 0 ? (completedCount / totalWorkersCount) * 100 : 0;

      // Umbral mínimo según NOM-035: 80%
      const threshold = 80;

      if (coverage < threshold) {
        coverageAlerts.push({
          surveyId: survey.id,
          surveyType: survey.type,
          surveyTitle: survey.title || `Encuesta ${survey.type.toUpperCase()}`,
          totalWorkers: totalWorkersCount,
          completedSurveys: completedCount,
          coverage: Math.round(coverage * 100) / 100,
          threshold,
          gap: Math.round((threshold - coverage) * 100) / 100,
          priority: coverage < 50 ? "high" : coverage < 65 ? "medium" : "low",
          priorityColor:
            coverage < 50 ? "red" : coverage < 65 ? "yellow" : "green",
        });
      }
    }

    // Ordenar por cobertura ascendente (menor cobertura primero)
    coverageAlerts.sort((a: any, b: any) => a.coverage - b.coverage);

    return {
      alerts: coverageAlerts,
      totalAlerts: coverageAlerts.length,
    };
  }),
});
