/**
 * Router de Monitoreo de Jobs
 * Historial de ejecuciones, estadísticas y ejecución manual
 */

import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { jobExecutions, surveys } from "../../drizzle/schema";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

// Importar funciones de ejecución manual de jobs
import { runPostCaseSurveysJobs } from "../jobs/post-case-surveys-job";
import { runDepartmentalAlertsJob } from "../jobs/departmental-alerts-job";
import { runSurveyRemindersJob } from "../jobs/survey-reminders-job";

export const jobMonitoringRouter = router({
  /**
   * Obtener historial de ejecuciones con paginación y filtros
   */
  getJobExecutions: protectedProcedure
    .input(
      z.object({
        jobName: z.string().optional(),
        status: z.enum(["running", "success", "failed"]).optional(),
        limit: z.number().min(1).max(100).default(50),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const conditions = [];
      if (input.jobName) conditions.push(eq(jobExecutions.jobName, input.jobName));
      if (input.status) conditions.push(eq(jobExecutions.status, input.status));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const executions = await db
        .select()
        .from(jobExecutions)
        .where(whereClause)
        .orderBy(desc(jobExecutions.startedAt))
        .limit(input.limit)
        .offset(input.offset);

      const [totalCount] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(jobExecutions)
        .where(whereClause);

      return {
        executions,
        total: (totalCount as any)?.count || 0,
        hasMore: input.offset + input.limit < ((totalCount as any)?.count || 0),
      };
    }),

  /**
   * Obtener estadísticas de éxito/fallo por job
   */
  getJobStats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    // Últimas 24 horas
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const stats = await db
      .select({
        jobName: jobExecutions.jobName,
        totalExecutions: sql<number>`COUNT(*)`,
        successCount: sql<number>`SUM(CASE WHEN ${jobExecutions.status} = 'success' THEN 1 ELSE 0 END)`,
        failedCount: sql<number>`SUM(CASE WHEN ${jobExecutions.status} = 'failed' THEN 1 ELSE 0 END)`,
        avgDuration: sql<number>`AVG(${jobExecutions.duration})`,
        lastExecution: sql<Date>`MAX(${jobExecutions.startedAt})`,
      })
      .from(jobExecutions)
      .where(gte(jobExecutions.startedAt, oneDayAgo))
      .groupBy(jobExecutions.jobName);

    return stats.map((stat: any) => ({
      jobName: stat.jobName,
      totalExecutions: Number(stat.totalExecutions) || 0,
      successCount: Number(stat.successCount) || 0,
      failedCount: Number(stat.failedCount) || 0,
      successRate: Number(stat.totalExecutions) > 0 
        ? ((Number(stat.successCount) / Number(stat.totalExecutions)) * 100).toFixed(1)
        : "0.0",
      avgDuration: stat.avgDuration ? Math.round(Number(stat.avgDuration)) : 0,
      lastExecution: stat.lastExecution,
    }));
  }),

  /**
   * Ejecutar job manualmente: Post-Case Surveys
   */
  runPostCaseSurveysJob: protectedProcedure.mutation(async () => {
    const startedAt = new Date();
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    try {
      // Registrar inicio
      const [execution] = await (db.insert(jobExecutions) as any).values({
        jobName: "post-case-surveys-job",
        status: "running",
        startedAt,
      }).$returningId();

      // Ejecutar job
      const result = await runPostCaseSurveysJobs();;
      const completedAt = new Date();
      const duration = completedAt.getTime() - startedAt.getTime();

      // Actualizar con resultado
      await db
        .update(jobExecutions)
        .set({
          status: "success",
          completedAt,
          duration,
          result: result as any,
        } as any)
        .where(eq(jobExecutions.id, execution.id));

      return { success: true, result, duration };
    } catch (error: any) {
      const completedAt = new Date();
      const duration = completedAt.getTime() - startedAt.getTime();

      // Registrar error
      await (db.insert(jobExecutions) as any).values({
        jobName: "post-case-surveys-job",
        status: "failed",
        startedAt,
        completedAt,
        duration,
        error: error.message,
      });

      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
    }
  }),

  /**
   * Ejecutar job manualmente: Departmental Alerts
   */
  runDepartmentalAlertsJob: protectedProcedure.mutation(async () => {
    const startedAt = new Date();
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    try {
      const [execution] = await (db.insert(jobExecutions) as any).values({
        jobName: "departmental-alerts-job",
        status: "running",
        startedAt,
      }).$returningId();

      const result = await runDepartmentalAlertsJob();
      const completedAt = new Date();
      const duration = completedAt.getTime() - startedAt.getTime();

      await db
        .update(jobExecutions)
        .set({
          status: "success",
          completedAt,
          duration,
          result: result as any,
        } as any)
        .where(eq(jobExecutions.id, execution.id));

      return { success: true, result, duration };
    } catch (error: any) {
      const completedAt = new Date();
      const duration = completedAt.getTime() - startedAt.getTime();

      await (db.insert(jobExecutions) as any).values({
        jobName: "departmental-alerts-job",
        status: "failed",
        startedAt,
        completedAt,
        duration,
        error: error.message,
      });

      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
    }
  }),

  /**
   * Ejecutar job manualmente: Survey Reminders
   */
  runSurveyRemindersJob: protectedProcedure.mutation(async () => {
    const startedAt = new Date();
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

    try {
      const [execution] = await (db.insert(jobExecutions) as any).values({
        jobName: "survey-reminders-job",
        status: "running",
        startedAt,
      }).$returningId();

      const result = await runSurveyRemindersJob();
      const completedAt = new Date();
      const duration = completedAt.getTime() - startedAt.getTime();

      await db
        .update(jobExecutions)
        .set({
          status: "success",
          completedAt,
          duration,
          result: result as any,
        } as any)
        .where(eq(jobExecutions.id, execution.id));

      return { success: true, result, duration };
    } catch (error: any) {
      const completedAt = new Date();
      const duration = completedAt.getTime() - startedAt.getTime();

      await (db.insert(jobExecutions) as any).values({
        jobName: "survey-reminders-job",
        status: "failed",
        startedAt,
        completedAt,
        duration,
        error: error.message,
      });

      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
    }
  }),
});
