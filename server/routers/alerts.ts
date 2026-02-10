import { z } from "zod";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import { alertHistory } from "../../drizzle/schema";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { emitCriticalAlert } from "../_core/websocket";

export const alertsRouter = router({
  // Crear nueva alerta
  create: protectedProcedure
    .input(
      z.object({
        alertType: z.enum(["critical_cases", "low_coverage", "excellent_compliance"]),
        priority: z.enum(["info", "warning", "critical"]).optional(),
        threshold: z.number(),
        currentValue: z.number(),
        description: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      // Verificar si ya existe una alerta activa del mismo tipo
      const [existingAlert] = await db
        .select()
        .from(alertHistory)
        .where(
          and(
            eq(alertHistory.alertType, input.alertType),
            eq(alertHistory.status, "active")
          )
        )
        .limit(1);
      
      // Si ya existe, retornar la alerta existente sin crear duplicado
      if (existingAlert) {
        return { 
          success: true, 
          alertId: existingAlert.id, 
          isDuplicate: true,
          message: "Ya existe una alerta activa de este tipo" 
        };
      }
      
      // Si no existe, crear nueva alerta
      const [alert] = await db.insert(alertHistory).values(input);
      
      // Si la alerta es crítica, emitir notificación por WebSocket
      if (input.priority === "critical" || input.alertType === "critical_cases") {
        emitCriticalAlert({
          id: alert.insertId,
          alertType: input.alertType,
          description: input.description,
          priority: input.priority || "critical",
          currentValue: input.currentValue,
          threshold: input.threshold,
        });
      }
      
      return { success: true, alertId: alert.insertId, isDuplicate: false };
    }),

  // Obtener histórico de alertas con filtros
  getHistory: protectedProcedure
    .input(
      z.object({
        alertType: z.enum(["critical_cases", "low_coverage", "excellent_compliance"]).optional(),
        status: z.enum(["active", "resolved"]).optional(),
        priority: z.enum(["info", "warning", "critical"]).optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const { alertType, status, priority, startDate, endDate } = input;

      const conditions = [];
      if (alertType) conditions.push(eq(alertHistory.alertType, alertType));
      if (status) conditions.push(eq(alertHistory.status, status));
      if (priority) conditions.push(eq(alertHistory.priority, priority));
      if (startDate) conditions.push(gte(alertHistory.triggeredAt, new Date(startDate)));
      if (endDate) conditions.push(lte(alertHistory.triggeredAt, new Date(endDate)));

      const db = await getDb();
      if (!db) throw new Error("Database not available");
      
      const alerts = await db
        .select()
        .from(alertHistory)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(
          // Ordenar primero por prioridad (critical > warning > info), luego por fecha
          sql`CASE ${alertHistory.priority} WHEN 'critical' THEN 1 WHEN 'warning' THEN 2 WHEN 'info' THEN 3 END`,
          desc(alertHistory.triggeredAt)
        )
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

  // Enviar resumen manual de alertas
  sendSummary: protectedProcedure
    .input(
      z.object({
        frequency: z.enum(["weekly", "monthly"]).default("weekly"),
      })
    )
    .mutation(async ({ input }) => {
      const { sendManualAlertSummary } = await import("../jobs/alertSummaryJob");
      const result = await sendManualAlertSummary(input.frequency);
      return result;
    }),

  // Obtener métricas de tiempo de resolución
  getResolutionMetrics: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Obtener alertas resueltas con tiempo de resolución
    const resolvedAlerts = await db
      .select({
        id: alertHistory.id,
        alertType: alertHistory.alertType,
        triggeredAt: alertHistory.triggeredAt,
        resolvedAt: alertHistory.resolvedAt,
      })
      .from(alertHistory)
      .where(eq(alertHistory.status, "resolved"));

    // Calcular tiempo promedio de resolución (en horas)
    const resolutionTimes = resolvedAlerts
      .filter((alert) => alert.resolvedAt)
      .map((alert) => {
        const triggered = new Date(alert.triggeredAt).getTime();
        const resolved = new Date(alert.resolvedAt!).getTime();
        return (resolved - triggered) / (1000 * 60 * 60); // Convertir a horas
      });

    const avgResolutionTime =
      resolutionTimes.length > 0
        ? resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length
        : 0;

    // Calcular tiempo promedio por tipo de alerta
    const byType: Record<string, { total: number; count: number; avg: number }> = {
      critical_cases: { total: 0, count: 0, avg: 0 },
      low_coverage: { total: 0, count: 0, avg: 0 },
      excellent_compliance: { total: 0, count: 0, avg: 0 },
    };

    resolvedAlerts.forEach((alert) => {
      if (!alert.resolvedAt) return;
      const triggered = new Date(alert.triggeredAt).getTime();
      const resolved = new Date(alert.resolvedAt).getTime();
      const hours = (resolved - triggered) / (1000 * 60 * 60);

      byType[alert.alertType].total += hours;
      byType[alert.alertType].count += 1;
    });

    // Calcular promedios
    Object.keys(byType).forEach((type) => {
      if (byType[type].count > 0) {
        byType[type].avg = byType[type].total / byType[type].count;
      }
    });

    return {
      avgResolutionTime,
      totalResolved: resolvedAlerts.length,
      byType: {
        critical_cases: byType.critical_cases.avg,
        low_coverage: byType.low_coverage.avg,
        excellent_compliance: byType.excellent_compliance.avg,
      },
    };
  }),
});
