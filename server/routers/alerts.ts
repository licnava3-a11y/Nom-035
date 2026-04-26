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
      const [alert] = await (db.insert(alertHistory) as any).values(input);
      
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
        page: z.number().int().min(1).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
      })
    )
    .query(async ({ input }) => {
      const { alertType, status, priority, startDate, endDate, page, pageSize } = input;

      const conditions = [];
      if (alertType) conditions.push(eq(alertHistory.alertType, alertType));
      if (status) conditions.push(eq(alertHistory.status, status));
      if (priority) conditions.push(eq(alertHistory.priority, priority));
      if (startDate) conditions.push(gte(alertHistory.triggeredAt, new Date(startDate)));
      if (endDate) conditions.push(lte(alertHistory.triggeredAt, new Date(endDate)));

      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Total para paginación
      const [{ total }] = await db
        .select({ total: sql<number>`count(*)` })
        .from(alertHistory)
        .where(whereClause);

      const alerts = await db
        .select()
        .from(alertHistory)
        .where(whereClause)
        .orderBy(
          sql`CASE ${alertHistory.priority} WHEN 'critical' THEN 1 WHEN 'warning' THEN 2 WHEN 'info' THEN 3 END`,
          desc(alertHistory.triggeredAt)
        )
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      return { alerts, total: Number(total), page, pageSize, totalPages: Math.ceil(Number(total) / pageSize) };
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
        } as any)
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
      .filter((alert: any) => alert.resolvedAt)
      .map((alert: any) => {
        const triggered = new Date(alert.triggeredAt).getTime();
        const resolved = new Date(alert.resolvedAt!).getTime();
        return (resolved - triggered) / (1000 * 60 * 60); // Convertir a horas
      });

    const avgResolutionTime =
      resolutionTimes.length > 0
        ? resolutionTimes.reduce((a: any, b: any) => a + b, 0) / resolutionTimes.length
        : 0;

    // Calcular tiempo promedio por tipo de alerta
    const byType: Record<string, { total: number; count: number; avg: number }> = {
      critical_cases: { total: 0, count: 0, avg: 0 },
      low_coverage: { total: 0, count: 0, avg: 0 },
      excellent_compliance: { total: 0, count: 0, avg: 0 },
    };

    resolvedAlerts.forEach((alert: any) => {
      if (!alert.resolvedAt) return;
      const triggered = new Date(alert.triggeredAt).getTime();
      const resolved = new Date(alert.resolvedAt).getTime();
      const hours = (resolved - triggered) / (1000 * 60 * 60);

      byType[alert.alertType].total += hours;
      byType[alert.alertType].count += 1;
    });

    // Calcular promedios
    Object.keys(byType).forEach((type: any) => {
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

  // Marcar todas las alertas activas como resueltas ("leídas")
  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    // Contar alertas activas antes de resolverlas
    const activeAlerts = await db
      .select({ id: alertHistory.id, priority: alertHistory.priority })
      .from(alertHistory)
      .where(eq(alertHistory.status, "active"));
    const total = activeAlerts.length;
    if (total === 0) return { success: true, resolved: 0 };
    const critical = activeAlerts.filter(a => a.priority === "critical").length;
    const warning = activeAlerts.filter(a => a.priority === "warning").length;
    const info = activeAlerts.filter(a => a.priority === "info").length;
    await db
      .update(alertHistory)
      .set({
        status: "resolved",
        resolvedAt: new Date(),
        userId: ctx.user.id,
        notes: "Marcadas como leídas desde el navbar",
      } as any)
      .where(eq(alertHistory.status, "active"));
    // Enviar correo de confirmación al administrador
    try {
      const { sendEmail } = await import("../_core/email");
      const adminEmail = (ctx.user as any).email as string | undefined;
      const adminName = (ctx.user as any).name as string | undefined || "Administrador";
      if (adminEmail) {
        await sendEmail({
          to: adminEmail,
          subject: `[NOM-035] Confirmación: ${total} alerta${total !== 1 ? "s" : ""} marcada${total !== 1 ? "s" : ""} como leídas`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <div style="background: #0f172a; color: #fff; padding: 16px 24px; border-radius: 8px 8px 0 0;">
                <h2 style="margin: 0; font-size: 18px;">&#10003; Alertas marcadas como leídas</h2>
                <p style="margin: 4px 0 0; font-size: 13px; color: #94a3b8;">NOM-035 STPS 2018 &mdash; Sistema de Gestión de Cumplimiento</p>
              </div>
              <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px;">
                <p style="color: #334155; margin: 0 0 16px;">Estimado/a <strong>${adminName}</strong>,</p>
                <p style="color: #334155; margin: 0 0 16px;">
                  Se han marcado como leídas <strong>${total} alerta${total !== 1 ? "s" : ""}</strong> en el Sistema NOM-035 STPS 2018.
                </p>
                <div style="background: #fff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 16px; margin-bottom: 16px;">
                  <p style="margin: 0 0 8px; font-weight: bold; color: #1e293b;">Resumen por prioridad:</p>
                  ${critical > 0 ? `<p style="margin: 4px 0; color: #dc2626;">&#9679; Críticas: <strong>${critical}</strong></p>` : ""}
                  ${warning > 0 ? `<p style="margin: 4px 0; color: #d97706;">&#9679; Advertencias: <strong>${warning}</strong></p>` : ""}
                  ${info > 0 ? `<p style="margin: 4px 0; color: #2563eb;">&#9679; Informativas: <strong>${info}</strong></p>` : ""}
                </div>
                <p style="color: #334155; margin: 0 0 8px;">
                  Acción realizada por: <strong>${adminName}</strong><br/>
                  Fecha y hora: <strong>${new Date().toLocaleString("es-MX")}</strong>
                </p>
                <p style="color: #64748b; font-size: 12px; margin: 16px 0 0; border-top: 1px solid #e2e8f0; padding-top: 12px;">
                  Este mensaje fue generado automáticamente por el Sistema de Gestión NOM-035 STPS 2018.
                </p>
              </div>
            </div>
          `,
        });
      }
    } catch {
      // Correo no crítico: si falla, la acción ya fue completada
    }
    return { success: true, resolved: total };
  }),

  // Tendencia mensual de alertas desglosada por prioridad (para gráfica)
  getMonthlyByPriority: protectedProcedure
    .input(z.object({ months: z.number().min(1).max(24).default(12) }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - input.months);
      const rows = await db
        .select({
          month: sql<string>`DATE_FORMAT(${alertHistory.triggeredAt}, '%Y-%m')`,
          priority: alertHistory.priority,
          count: sql<number>`COUNT(*)`,
        })
        .from(alertHistory)
        .where(gte(alertHistory.triggeredAt, startDate))
        .groupBy(
          sql`DATE_FORMAT(${alertHistory.triggeredAt}, '%Y-%m')`,
          alertHistory.priority
        )
        .orderBy(sql`DATE_FORMAT(${alertHistory.triggeredAt}, '%Y-%m')`);
      // Pivotar: { month, critical, warning, info }
      const byMonth: Record<string, { month: string; critical: number; warning: number; info: number }> = {};
      for (const row of rows) {
        if (!byMonth[row.month]) byMonth[row.month] = { month: row.month, critical: 0, warning: 0, info: 0 };
        if (row.priority === "critical") byMonth[row.month].critical += Number(row.count);
        else if (row.priority === "warning") byMonth[row.month].warning += Number(row.count);
        else if (row.priority === "info") byMonth[row.month].info += Number(row.count);
      }
      return Object.values(byMonth);
    }),
});
