/**
 * Router de Dashboard de Alertas Consolidado
 * Integra alertas departamentales, encuestas y casos críticos
 */

import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  cases,
  departments,
  postCaseSurveys,
  surveys,
} from "../../drizzle/schema";
import { eq, and, gte, lte, sql, or, isNull } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

export const alertsDashboardRouter = router({
  /**
   * Obtener alertas consolidadas con filtros
   */
  getConsolidatedAlerts: protectedProcedure
    .input(
      z.object({
        category: z
          .enum(["all", "departmental", "survey", "case"])
          .default("all"),
        priority: z
          .enum(["all", "low", "medium", "high", "critical"])
          .default("all"),
        status: z
          .enum(["all", "active", "resolved", "silenced"])
          .default("active"),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      const alerts: Array<{
        id: string;
        category: "departmental" | "survey" | "case";
        priority: "low" | "medium" | "high" | "critical";
        title: string;
        description: string;
        createdAt: Date;
        status: "active" | "resolved" | "silenced";
        actionUrl?: string;
        metadata?: any;
      }> = [];

      // 1. Alertas Departamentales (placeholder - requiere campo departmentId en cases)
      // Temporalmente deshabilitado hasta agregar campo departmentId a tabla cases

      // 2. Alertas de Encuestas Post-Caso
      if (input.category === "all" || input.category === "survey") {
        const now = new Date();
        const twoDaysFromNow = new Date(
          now.getTime() + 2 * 24 * 60 * 60 * 1000
        );

        const expiringSurveys = await db
          .select()
          .from(postCaseSurveys)
          .where(
            and(
              eq(postCaseSurveys.status, "sent"),
              isNull(postCaseSurveys.completedAt),
              lte(postCaseSurveys.expiresAt, twoDaysFromNow)
            )
          );

        if (expiringSurveys.length > 0) {
          alerts.push({
            id: `survey-expiring`,
            category: "survey",
            priority: "medium",
            title: `${expiringSurveys.length} encuestas próximas a expirar`,
            description: `Hay ${expiringSurveys.length} encuestas post-caso que expiran en los próximos 2 días.`,
            createdAt: new Date(),
            status: "active",
            actionUrl: `/post-case-surveys`,
            metadata: { count: expiringSurveys.length },
          });
        }

        // Tasa de completitud baja
        const [surveyStats] = await db
          .select({
            total: sql<number>`COUNT(*)`,
            completed: sql<number>`SUM(CASE WHEN ${postCaseSurveys.status} = 'completed' THEN 1 ELSE 0 END)`,
          })
          .from(postCaseSurveys);

        const totalSurveys = Number(surveyStats?.total) || 0;
        const completedSurveys = Number(surveyStats?.completed) || 0;
        const completionRate =
          totalSurveys > 0 ? (completedSurveys / totalSurveys) * 100 : 0;

        if (totalSurveys > 10 && completionRate < 50) {
          alerts.push({
            id: `survey-low-completion`,
            category: "survey",
            priority: "high",
            title: `Baja tasa de completitud de encuestas (${completionRate.toFixed(1)}%)`,
            description: `Solo ${completedSurveys} de ${totalSurveys} encuestas han sido completadas.`,
            createdAt: new Date(),
            status: "active",
            actionUrl: `/post-case-surveys`,
            metadata: { completionRate, totalSurveys, completedSurveys },
          });
        }
      }

      // 3. Alertas de Casos Críticos
      if (input.category === "all" || input.category === "case") {
        const unassignedCritical = await db
          .select()
          .from(cases)
          .where(
            and(
              sql`${cases.priority} = 'critical'`,
              isNull(cases.assignedTo),
              sql`${cases.status} = 'open'`
            )
          );

        if (unassignedCritical.length > 0) {
          alerts.push({
            id: `case-unassigned-critical`,
            category: "case",
            priority: "critical",
            title: `${unassignedCritical.length} casos críticos sin asignar`,
            description: `Hay ${unassignedCritical.length} casos críticos abiertos que no han sido asignados a ningún responsable.`,
            createdAt: new Date(),
            status: "active",
            actionUrl: `/cases`,
            metadata: { count: unassignedCritical.length },
          });
        }

        // Casos abiertos por más de 30 días
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const staleCases = await db
          .select()
          .from(cases)
          .where(
            and(
              sql`(${cases.status} = 'open' OR ${cases.status} = 'investigating')`,
              lte(cases.createdAt, thirtyDaysAgo)
            )
          );

        if (staleCases.length > 0) {
          alerts.push({
            id: `case-stale`,
            category: "case",
            priority: "medium",
            title: `${staleCases.length} casos abiertos por más de 30 días`,
            description: `Hay ${staleCases.length} casos que llevan más de 30 días sin resolverse.`,
            createdAt: new Date(),
            status: "active",
            actionUrl: `/cases`,
            metadata: { count: staleCases.length },
          });
        }
      }

      // Filtrar por prioridad
      let filteredAlerts = alerts;
      if (input.priority !== "all") {
        filteredAlerts = alerts.filter(
          (a: any) => a.priority === input.priority
        );
      }

      // Filtrar por estado
      if (input.status !== "all") {
        filteredAlerts = filteredAlerts.filter(
          (a: any) => a.status === input.status
        );
      }

      // Ordenar por prioridad (critical > high > medium > low)
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      filteredAlerts.sort(
        (a: any, b: any) =>
          priorityOrder[a.priority as keyof typeof priorityOrder] -
          priorityOrder[b.priority as keyof typeof priorityOrder]
      );

      return {
        alerts: filteredAlerts,
        total: filteredAlerts.length,
        criticalCount: filteredAlerts.filter(
          (a: any) => a.priority === "critical"
        ).length,
        highCount: filteredAlerts.filter((a: any) => a.priority === "high")
          .length,
        mediumCount: filteredAlerts.filter((a: any) => a.priority === "medium")
          .length,
        lowCount: filteredAlerts.filter((a: any) => a.priority === "low")
          .length,
      };
    }),

  /**
   * Marcar alerta como resuelta (placeholder, en producción se vincularía a acciones reales)
   */
  resolveAlert: protectedProcedure
    .input(z.object({ alertId: z.string() }))
    .mutation(async ({ input }) => {
      // En producción, aquí se actualizaría el estado en base de datos
      // Por ahora es placeholder
      return { success: true, alertId: input.alertId };
    }),

  /**
   * Silenciar alerta temporalmente
   */
  silenceAlert: protectedProcedure
    .input(
      z.object({ alertId: z.string(), duration: z.number().min(1).max(168) })
    ) // 1-168 horas
    .mutation(async ({ input }) => {
      // En producción, aquí se registraría en tabla de alertas silenciadas
      return {
        success: true,
        alertId: input.alertId,
        silencedUntil: new Date(Date.now() + input.duration * 60 * 60 * 1000),
      };
    }),
});
