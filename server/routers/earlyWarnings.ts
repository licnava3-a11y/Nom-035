import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { nom035Cases, correctiveActions, employees, surveys, surveyResponses } from "../../drizzle/schema";
import { eq, and, isNull, sql, lt, lte, gte } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

export const earlyWarningsRouter = router({
  /**
   * Get cases about to expire (próximos a vencer)
   * Returns cases with less than 30 days to deadline
   */
  getCasesAboutToExpire: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const today = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(today.getDate() + 30);

      const cases = await db
        .select({
          id: nom035Cases.id,
          folio: nom035Cases.folio,
          employeeName: sql<string>`CONCAT(${employees.firstName}, ' ', ${employees.lastName})`,
          department: employees.department,
          riskLevel: nom035Cases.riskLevel,
          riskCategory: nom035Cases.riskCategory,
          description: nom035Cases.description,
          deadline: nom035Cases.deadline,
          status: nom035Cases.status,
          daysRemaining: sql<number>`DATEDIFF(${nom035Cases.deadline}, CURDATE())`,
        })
        .from(nom035Cases)
        .leftJoin(employees, eq(nom035Cases.employeeId, employees.id))
        .where(
          and(
            lte(nom035Cases.deadline, thirtyDaysFromNow),
            sql`${nom035Cases.status} != 'closed'`
          )
        )
        .orderBy(nom035Cases.deadline);

      return {
        cases: cases.map((c) => ({
          ...c,
          priority: c.daysRemaining <= 7 ? "high" : c.daysRemaining <= 15 ? "medium" : "low",
          priorityColor: c.daysRemaining <= 7 ? "red" : c.daysRemaining <= 15 ? "yellow" : "green",
        })),
        total: cases.length,
        highPriority: cases.filter((c) => c.daysRemaining <= 7).length,
        mediumPriority: cases.filter((c) => c.daysRemaining > 7 && c.daysRemaining <= 15).length,
        lowPriority: cases.filter((c) => c.daysRemaining > 15).length,
      };
    }),

  /**
   * Get pending surveys by department
   * Returns surveys that should be applied but haven't been completed
   */
  getPendingSurveys: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

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
            eq(surveys.status, "active"),
            sql`${surveys.endDate} IS NOT NULL AND ${surveys.endDate} < CURDATE()`
          )
        )
        .groupBy(surveys.id, departments.name)
        .orderBy(sql`daysOverdue DESC`);

      return {
        surveys: surveysData.map((s) => ({
          ...s,
          completionRate: s.totalResponses > 0 ? (s.completedResponses / s.totalResponses) * 100 : 0,
          priority: s.daysOverdue > 30 ? "high" : s.daysOverdue > 15 ? "medium" : "low",
          priorityColor: s.daysOverdue > 30 ? "red" : s.daysOverdue > 15 ? "yellow" : "green",
        })),
        total: surveysData.length,
        highPriority: surveysData.filter((s) => s.daysOverdue > 30).length,
        mediumPriority: surveysData.filter((s) => s.daysOverdue > 15 && s.daysOverdue <= 30).length,
        lowPriority: surveysData.filter((s) => s.daysOverdue <= 15).length,
      };
    }),

  /**
   * Get corrective actions without follow-up
   * Returns actions that haven't been updated in 30+ days
   */
  getActionsWithoutFollowUp: protectedProcedure
    .query(async () => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

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
        .leftJoin(employees, eq(correctiveActions.responsibleUserId, employees.id))
        .where(
          and(
            lt(correctiveActions.updatedAt, thirtyDaysAgo),
            sql`${correctiveActions.status} != 'completada'`
          )
        )
        .orderBy(sql`daysSinceUpdate DESC`);

      return {
        actions: actions.map((a) => ({
          ...a,
          alertPriority: a.daysSinceUpdate > 60 ? "high" : a.daysSinceUpdate > 45 ? "medium" : "low",
          priorityColor: a.daysSinceUpdate > 60 ? "red" : a.daysSinceUpdate > 45 ? "yellow" : "green",
        })),
        total: actions.length,
        highPriority: actions.filter((a) => a.daysSinceUpdate > 60).length,
        mediumPriority: actions.filter((a) => a.daysSinceUpdate > 45 && a.daysSinceUpdate <= 60).length,
        lowPriority: actions.filter((a) => a.daysSinceUpdate <= 45).length,
      };
    }),

  /**
   * Get summary of all early warnings
   */
  getSummary: protectedProcedure
    .query(async ({ ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

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
            eq(surveys.status, "active"),
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
        totalAlerts: (casesCount?.count || 0) + (surveysCount?.count || 0) + (actionsCount?.count || 0),
      };
    }),
});
