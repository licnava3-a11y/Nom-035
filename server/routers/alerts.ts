import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { alertHistory } from "../../drizzle/schema";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";

export const alertsRouter = router({
  // Crear nueva alerta
  create: protectedProcedure
    .input(
      z.object({
        alertType: z.enum(["critical_cases", "low_coverage", "excellent_compliance"]),
        threshold: z.number(),
        currentValue: z.number(),
        description: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [alert] = await db.insert(alertHistory).values(input);
      return { success: true, alertId: alert.insertId };
    }),

  // Obtener histórico de alertas con filtros
  getHistory: protectedProcedure
    .input(
      z.object({
        alertType: z.enum(["critical_cases", "low_coverage", "excellent_compliance"]).optional(),
        status: z.enum(["active", "resolved"]).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const { alertType, status, startDate, endDate } = input;

      const conditions = [];
      if (alertType) conditions.push(eq(alertHistory.alertType, alertType));
      if (status) conditions.push(eq(alertHistory.status, status));
      if (startDate) conditions.push(gte(alertHistory.triggeredAt, new Date(startDate)));
      if (endDate) conditions.push(lte(alertHistory.triggeredAt, new Date(endDate)));

      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const alerts = await db
        .select()
        .from(alertHistory)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(alertHistory.triggeredAt))
        .limit(100);

      return alerts;
    }),

  // Resolver alerta
  resolve: protectedProcedure
    .input(
      z.object({
        alertId: z.number(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      await db
        .update(alertHistory)
        .set({
          status: "resolved",
          resolvedAt: new Date(),
          userId: ctx.user.id,
          notes: input.notes,
        })
        .where(eq(alertHistory.id, input.alertId));

      return { success: true };
    }),

  // Obtener estadísticas de alertas
  getStats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    
    const [stats] = await db
      .select({
        totalAlerts: sql<number>`COUNT(*)`,
        activeAlerts: sql<number>`SUM(CASE WHEN ${alertHistory.status} = 'active' THEN 1 ELSE 0 END)`,
        resolvedAlerts: sql<number>`SUM(CASE WHEN ${alertHistory.status} = 'resolved' THEN 1 ELSE 0 END)`,
        criticalCases: sql<number>`SUM(CASE WHEN ${alertHistory.alertType} = 'critical_cases' THEN 1 ELSE 0 END)`,
        lowCoverage: sql<number>`SUM(CASE WHEN ${alertHistory.alertType} = 'low_coverage' THEN 1 ELSE 0 END)`,
        excellentCompliance: sql<number>`SUM(CASE WHEN ${alertHistory.alertType} = 'excellent_compliance' THEN 1 ELSE 0 END)`,
      })
      .from(alertHistory);

    return stats;
  }),

  // Obtener tendencia de alertas por mes
  getTrends: protectedProcedure
    .input(
      z.object({
        months: z.number().min(1).max(24).default(6), // Últimos 6 meses por defecto
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Calcular fecha de inicio (N meses atrás)
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - input.months);
      
      const trends = await db
        .select({
          month: sql<string>`DATE_FORMAT(${alertHistory.triggeredAt}, '%Y-%m')`,
          activeAlerts: sql<number>`SUM(CASE WHEN ${alertHistory.status} = 'active' THEN 1 ELSE 0 END)`,
          resolvedAlerts: sql<number>`SUM(CASE WHEN ${alertHistory.status} = 'resolved' THEN 1 ELSE 0 END)`,
        })
        .from(alertHistory)
        .where(gte(alertHistory.triggeredAt, startDate))
        .groupBy(sql`DATE_FORMAT(${alertHistory.triggeredAt}, '%Y-%m')`)
        .orderBy(sql`DATE_FORMAT(${alertHistory.triggeredAt}, '%Y-%m')`);
      
      return trends;
    }),
});
