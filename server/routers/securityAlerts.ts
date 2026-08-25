import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { securityAlerts, documentAuditLog } from "../../drizzle/schema";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";

export const securityAlertsRouter = router({
  /**
   * Detectar patrones sospechosos automáticamente
   * Se ejecuta después de cada acción de auditoría
   */
  detectSuspiciousActivity: protectedProcedure
    .input(
      z.object({
        userId: z.number().optional(),
        ipAddress: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const alerts: any[] = [];
      const now = new Date();
      const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000);

      // 1. Detectar múltiples descargas en corto tiempo (>5 en 10 minutos)
      if (input.userId) {
        const recentDownloads = await db
          .select()
          .from(documentAuditLog)
          .where(
            and(
              eq(documentAuditLog.userId, input.userId),
              eq(documentAuditLog.action, "download"),
              gte(documentAuditLog.timestamp, tenMinutesAgo)
            )
          );

        if (recentDownloads.length > 5) {
          const alert = {
            alertType: "multiple_downloads" as const,
            severity: "high" as const,
            userId: input.userId,
            userName: ctx.user.name,
            description: `Usuario ${ctx.user.name} ha descargado ${recentDownloads.length} documentos en los últimos 10 minutos`,
            metadata: {
              downloadCount: recentDownloads.length,
              timeWindow: "10 minutes",
              reportIds: recentDownloads.map((d: any) => d.reportId),
            },
          };

          await (db.insert(securityAlerts) as any).values(alert);
          alerts.push(alert);

          // Enviar notificación al administrador
          await notifyOwner({
            title: "🚨 Alerta de Seguridad: Múltiples Descargas",
            content: alert.description,
          });
        }
      }

      // 2. Detectar accesos desde IPs desconocidas
      if (input.userId && input.ipAddress) {
        // Obtener IPs históricas del usuario
        const historicalIPs = await db
          .select({ ipAddress: documentAuditLog.ipAddress })
          .from(documentAuditLog)
          .where(eq(documentAuditLog.userId, input.userId))
          .groupBy(documentAuditLog.ipAddress);

        const knownIPs = historicalIPs
          .map((row: any) => row.ipAddress)
          .filter((ip: any) => ip !== null);

        // Si la IP actual no está en el historial y el usuario tiene más de 5 accesos previos
        if (knownIPs.length > 5 && !knownIPs.includes(input.ipAddress)) {
          const alert = {
            alertType: "unknown_ip" as const,
            severity: "medium" as const,
            userId: input.userId,
            userName: ctx.user.name,
            ipAddress: input.ipAddress,
            description: `Usuario ${ctx.user.name} accedió desde una IP desconocida: ${input.ipAddress}`,
            metadata: {
              newIP: input.ipAddress,
              knownIPsCount: knownIPs.length,
            },
          };

          await (db.insert(securityAlerts) as any).values(alert);
          alerts.push(alert);

          // Enviar notificación al administrador
          await notifyOwner({
            title: "⚠️ Alerta de Seguridad: IP Desconocida",
            content: alert.description,
          });
        }
      }

      // 3. Detectar accesos fuera de horario laboral (antes de 7am o después de 8pm)
      const currentHour = now.getHours();
      if (currentHour < 7 || currentHour >= 20) {
        const alert = {
          alertType: "off_hours" as const,
          severity: "low" as const,
          userId: input.userId || null,
          userName: ctx.user?.name || "Anónimo",
          ipAddress: input.ipAddress || null,
          description: `Acceso fuera de horario laboral a las ${now.toLocaleTimeString("es-MX")}`,
          metadata: {
            accessTime: now.toISOString(),
            hour: currentHour,
          },
        };

        await (db.insert(securityAlerts) as any).values(alert);
        alerts.push(alert);
      }

      return {
        alertsCreated: alerts.length,
        alerts,
      };
    }),

  /**
   * Obtener alertas de seguridad con filtros
   */
  getAlerts: protectedProcedure
    .input(
      z.object({
        alertType: z
          .enum([
            "multiple_downloads",
            "unknown_ip",
            "off_hours",
            "suspicious_pattern",
          ])
          .optional(),
        severity: z.enum(["low", "medium", "high", "critical"]).optional(),
        status: z
          .enum(["pending", "reviewed", "resolved", "false_positive"])
          .optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        page: z.number().default(1),
        pageSize: z.number().default(50),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions: any[] = [];

      if (input.alertType) {
        conditions.push(eq(securityAlerts.alertType, input.alertType));
      }
      if (input.severity) {
        conditions.push(eq(securityAlerts.severity, input.severity));
      }
      if (input.status) {
        conditions.push(eq(securityAlerts.status, input.status));
      }
      if (input.startDate) {
        conditions.push(
          gte(securityAlerts.createdAt, new Date(input.startDate))
        );
      }
      if (input.endDate) {
        conditions.push(gte(securityAlerts.createdAt, new Date(input.endDate)));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const alerts = await db
        .select()
        .from(securityAlerts)
        .where(where)
        .orderBy(desc(securityAlerts.createdAt))
        .limit(input.pageSize)
        .offset((input.page - 1) * input.pageSize);

      const totalCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(securityAlerts)
        .where(where);

      return {
        alerts,
        total: Number(totalCount[0]?.count || 0),
        page: input.page,
        pageSize: input.pageSize,
      };
    }),

  /**
   * Actualizar estado de alerta
   */
  updateAlertStatus: protectedProcedure
    .input(
      z.object({
        alertId: z.number(),
        status: z.enum(["pending", "reviewed", "resolved", "false_positive"]),
        reviewNotes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db
        .update(securityAlerts)
        .set({
          status: input.status,
          reviewedBy: ctx.user.id,
          reviewedAt: new Date(),
          reviewNotes: input.reviewNotes || null,
        } as any)
        .where(eq(securityAlerts.id, input.alertId));

      return { success: true };
    }),

  /**
   * Obtener estadísticas de alertas
   */
  getStatistics: protectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const conditions: any[] = [];

      if (input.startDate) {
        conditions.push(
          gte(securityAlerts.createdAt, new Date(input.startDate))
        );
      }
      if (input.endDate) {
        conditions.push(gte(securityAlerts.createdAt, new Date(input.endDate)));
      }

      const where = conditions.length > 0 ? and(...conditions) : undefined;

      const allAlerts = await db.select().from(securityAlerts).where(where);

      const totalAlerts = allAlerts.length;
      const pendingAlerts = allAlerts.filter(
        (a: any) => a.status === "pending"
      ).length;
      const criticalAlerts = allAlerts.filter(
        (a: any) => a.severity === "critical"
      ).length;
      const highAlerts = allAlerts.filter(
        (a: any) => a.severity === "high"
      ).length;
      const resolvedAlerts = allAlerts.filter(
        (a: any) => a.status === "resolved"
      ).length;

      return {
        totalAlerts,
        pendingAlerts,
        criticalAlerts,
        highAlerts,
        resolvedAlerts,
      };
    }),
});
