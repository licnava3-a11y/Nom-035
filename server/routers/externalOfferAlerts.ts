/**
 * Router de Alertas de Ofertas Externas
 * Consultas y gestión de alertas de riesgo de ofertas externas
 */

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { externalOfferRiskAlerts } from "../../drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";

export const externalOfferAlertsRouter = router({
  getActiveAlerts: protectedProcedure.query(async () => {
    const db = await getDb();
      if (!db) throw new Error('Database not initialized');
    
    const alerts = await db
      .select()
      .from(externalOfferRiskAlerts)
      .where(eq(externalOfferRiskAlerts.status, "active"))
      .orderBy(desc(externalOfferRiskAlerts.riskScore));

    return alerts;
  }),

  getAlertHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().optional().default(50),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not initialized');

      const alerts = await db
        .select()
        .from(externalOfferRiskAlerts)
        .orderBy(desc(externalOfferRiskAlerts.alertDate))
        .limit(input.limit);

      return alerts;
    }),

  resolveAlert: protectedProcedure
    .input(
      z.object({
        alertId: z.number(),
        resolutionNotes: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not initialized');

      await db
        .update(externalOfferRiskAlerts)
        .set({
          status: "resolved",
          resolvedAt: new Date(),
          resolutionNotes: input.resolutionNotes,
        })
        .where(eq(externalOfferRiskAlerts.id, input.alertId));

      return { success: true };
    }),

  dismissAlert: protectedProcedure
    .input(
      z.object({
        alertId: z.number(),
        reason: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error('Database not initialized');

      await db
        .update(externalOfferRiskAlerts)
        .set({
          status: "dismissed",
          resolvedAt: new Date(),
          resolutionNotes: input.reason,
        })
        .where(eq(externalOfferRiskAlerts.id, input.alertId));

      return { success: true };
    }),

  getAlertStats: protectedProcedure.query(async () => {
    const db = await getDb();
      if (!db) throw new Error('Database not initialized');

    const stats = await db.execute(sql`
      SELECT 
        COUNT(*) as total_alerts,
        SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active_alerts,
        SUM(CASE WHEN risk_level = 'critical' AND status = 'active' THEN 1 ELSE 0 END) as critical_alerts,
        SUM(CASE WHEN risk_level = 'high' AND status = 'active' THEN 1 ELSE 0 END) as high_alerts,
        SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) as resolved_alerts,
        AVG(CASE WHEN status = 'active' THEN risk_score ELSE NULL END) as avg_risk_score
      FROM external_offer_risk_alerts
      WHERE alert_date >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
    `);

    return stats.rows[0];
  }),

  getAlertsByDepartment: protectedProcedure.query(async () => {
    const db = await getDb();
      if (!db) throw new Error('Database not initialized');

    const byDept = await db.execute(sql`
      SELECT 
        department,
        COUNT(*) as alert_count,
        AVG(risk_score) as avg_risk_score,
        SUM(CASE WHEN risk_level = 'critical' THEN 1 ELSE 0 END) as critical_count
      FROM external_offer_risk_alerts
      WHERE status = 'active'
      GROUP BY department
      ORDER BY avg_risk_score DESC
    `);

    return byDept.rows;
  }),
});
