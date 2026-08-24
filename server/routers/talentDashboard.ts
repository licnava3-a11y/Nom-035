import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { sql } from "drizzle-orm";

export const talentDashboardRouter = router({
  getDashboardMetrics: protectedProcedure
    .input(
      z.object({
        departmentId: z.number().optional(),
        period: z.enum(["month", "quarter", "year"]).default("month"),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const { departmentId, period } = input;

      // Calcular fecha de inicio según período
      const now = new Date();
      let startDate: Date;

      if (period === "month") {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (period === "quarter") {
        const currentQuarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), currentQuarter * 3, 1);
      } else {
        startDate = new Date(now.getFullYear(), 0, 1);
      }

      // 1. KPIs Principales
      const kpisQuery = await db.execute(sql`
        SELECT
          COUNT(DISTINCT e.id) as total_employees,
          COUNT(DISTINCT CASE WHEN e.is_active = 1 THEN e.id END) as active_employees,
          COUNT(DISTINCT CASE WHEN sr.risk_level = 'very_high' THEN sr.employee_id END) as critical_risk_count,
          COUNT(DISTINCT CASE WHEN sr.risk_level IN ('high', 'very_high') THEN sr.employee_id END) as high_risk_count,
          AVG(CASE WHEN sr.risk_level = 'low' THEN 100 WHEN sr.risk_level = 'medium' THEN 70 WHEN sr.risk_level = 'high' THEN 40 ELSE 20 END) as avg_retention_score
        FROM employees e
        LEFT JOIN survey_results sr ON e.id = sr.employee_id
        WHERE (${departmentId} IS NULL OR e.department_id = ${departmentId})
      `);

      const kpis = kpisQuery[0] as any;

      // 2. Nine Box Matrix Data
      const nineBoxQuery = await db.execute(sql`
        SELECT
          nbe.performance_rating,
          nbe.potential_rating,
          COUNT(*) as count
        FROM nine_box_evaluations nbe
        JOIN employees e ON nbe.employee_id = e.id
        WHERE (${departmentId} IS NULL OR e.department_id = ${departmentId})
          AND nbe.evaluation_date >= ${startDate.toISOString().split("T")[0]}
        GROUP BY nbe.performance_rating, nbe.potential_rating
      `);

      // 3. Alertas de Riesgo Psicosocial
      const riskAlertsQuery = await db.execute(sql`
        SELECT
          COUNT(DISTINCT rah.id) as total_alerts,
          COUNT(DISTINCT CASE WHEN rah.status = 'active' THEN rah.id END) as active_alerts,
          COUNT(DISTINCT CASE WHEN rah.severity = 'critical' THEN rah.id END) as critical_alerts
        FROM risk_alert_history rah
        WHERE rah.triggered_at >= ${startDate.toISOString().split("T")[0]}
          AND (${departmentId} IS NULL OR rah.department_id = ${departmentId})
      `);

      const riskAlerts = riskAlertsQuery[0] as any;

      // 4. Score de Retención
      const retentionQuery = await db.execute(sql`
        SELECT
          e.id as employee_id,
          e.name as employee_name,
          e.department_id,
          d.name as department_name,
          CASE 
            WHEN sr.risk_level = 'low' THEN 100
            WHEN sr.risk_level = 'medium' THEN 70
            WHEN sr.risk_level = 'high' THEN 40
            ELSE 20
          END as retention_score,
          sr.risk_level
        FROM employees e
        LEFT JOIN survey_results sr ON e.id = sr.employee_id
        LEFT JOIN departments d ON e.department_id = d.id
        WHERE e.is_active = 1
          AND (${departmentId} IS NULL OR e.department_id = ${departmentId})
        ORDER BY retention_score ASC
        LIMIT 10
      `);

      // 5. Métricas de Reportes
      const reportsQuery = await db.execute(sql`
        SELECT
          COUNT(*) as total_reports,
          COUNT(CASE WHEN rh.status = 'sent' THEN 1 END) as sent_reports,
          COUNT(CASE WHEN rh.status = 'pending' THEN 1 END) as pending_reports,
          COUNT(CASE WHEN rh.status = 'failed' THEN 1 END) as failed_reports
        FROM report_history rh
        WHERE rh.sent_at >= ${startDate.toISOString().split("T")[0]}
      `);

      const reports = reportsQuery[0] as any;

      // 6. Tendencias Mensuales (últimos 6 meses)
      const trendsQuery = await db.execute(sql`
        SELECT
          DATE_FORMAT(sr.created_at, '%Y-%m') as month,
          AVG(CASE 
            WHEN sr.risk_level = 'low' THEN 100
            WHEN sr.risk_level = 'medium' THEN 70
            WHEN sr.risk_level = 'high' THEN 40
            ELSE 20
          END) as avg_retention_score,
          COUNT(DISTINCT CASE WHEN sr.risk_level IN ('high', 'very_high') THEN sr.employee_id END) as high_risk_count
        FROM survey_results sr
        JOIN employees e ON sr.employee_id = e.id
        WHERE sr.created_at >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
          AND (${departmentId} IS NULL OR e.department_id = ${departmentId})
        GROUP BY DATE_FORMAT(sr.created_at, '%Y-%m')
        ORDER BY month ASC
      `);

      return {
        kpis: {
          totalEmployees: Number(kpis.total_employees) || 0,
          activeEmployees: Number(kpis.active_employees) || 0,
          criticalRiskCount: Number(kpis.critical_risk_count) || 0,
          highRiskCount: Number(kpis.high_risk_count) || 0,
          avgRetentionScore: Number(kpis.avg_retention_score) || 0,
          retentionRate:
            kpis.total_employees > 0
              ? ((kpis.active_employees / kpis.total_employees) * 100).toFixed(
                  1
                )
              : "0.0",
        },
        nineBoxMatrix: nineBoxQuery.map((row: any) => ({
          performance: Number(row.performance_rating),
          potential: Number(row.potential_rating),
          count: Number(row.count),
        })),
        riskAlerts: {
          total: Number(riskAlerts.total_alerts) || 0,
          active: Number(riskAlerts.active_alerts) || 0,
          critical: Number(riskAlerts.critical_alerts) || 0,
        },
        retentionScores: retentionQuery.map((row: any) => ({
          employeeId: Number(row.employee_id),
          employeeName: row.employee_name,
          departmentId: Number(row.department_id),
          departmentName: row.department_name,
          retentionScore: Number(row.retention_score),
          riskLevel: row.risk_level,
        })),
        reports: {
          total: Number(reports.total_reports) || 0,
          sent: Number(reports.sent_reports) || 0,
          pending: Number(reports.pending_reports) || 0,
          failed: Number(reports.failed_reports) || 0,
        },
        trends: trendsQuery.map((row: any) => ({
          month: row.month,
          avgRetentionScore: Number(row.avg_retention_score) || 0,
          highRiskCount: Number(row.high_risk_count) || 0,
        })),
      };
    }),
});
