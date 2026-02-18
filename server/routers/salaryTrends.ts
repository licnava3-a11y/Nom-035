/**
 * Router de Tendencias Salariales
 * Análisis histórico de evolución salarial y proyecciones de mercado
 */

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { sql } from "drizzle-orm";

export const salaryTrendsRouter = router({
  getTrendsByDepartment: protectedProcedure.query(async () => {
    const db = await getDb();

    // Obtener histórico de últimos 12 meses por departamento
    const trends = await db.execute(sql`
      SELECT 
        department,
        DATE_FORMAT(effective_date, '%Y-%m') as month,
        AVG(new_salary) as avg_salary,
        COUNT(*) as adjustment_count
      FROM salary_history
      WHERE effective_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY department, DATE_FORMAT(effective_date, '%Y-%m')
      ORDER BY department, month
    `);

    return trends.rows;
  }),

  getTrendsByPosition: protectedProcedure.query(async () => {
    const db = await getDb();

    // Obtener histórico de últimos 12 meses por puesto
    const trends = await db.execute(sql`
      SELECT 
        position,
        DATE_FORMAT(effective_date, '%Y-%m') as month,
        AVG(new_salary) as avg_salary,
        COUNT(*) as adjustment_count
      FROM salary_history
      WHERE effective_date >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
      GROUP BY position, DATE_FORMAT(effective_date, '%Y-%m')
      ORDER BY position, month
    `);

    return trends.rows;
  }),

  getMarketProjections: protectedProcedure.query(async () => {
    const db = await getDb();

    // Calcular proyecciones basadas en tendencias históricas
    const projections = await db.execute(sql`
      SELECT 
        department,
        position,
        AVG(new_salary) as current_avg_salary,
        AVG(market_rate) as current_market_rate,
        AVG(salary_gap_percentage) as avg_gap,
        COUNT(*) as sample_size,
        -- Proyección a 6 meses (asumiendo crecimiento anual de mercado del 5%)
        AVG(market_rate) * 1.025 as projected_market_rate_6m,
        -- Ajuste recomendado anticipado
        CASE 
          WHEN AVG(salary_gap_percentage) < -20 THEN 'CRÍTICO - Ajustar inmediatamente'
          WHEN AVG(salary_gap_percentage) < -10 THEN 'ALTO - Ajustar en próximos 3 meses'
          WHEN AVG(salary_gap_percentage) < 0 THEN 'MEDIO - Monitorear y ajustar en 6 meses'
          ELSE 'BAJO - Sin ajuste requerido'
        END as recommendation
      FROM payroll_data
      WHERE market_rate IS NOT NULL
      GROUP BY department, position
      HAVING sample_size > 0
      ORDER BY avg_gap ASC
    `);

    return projections.rows;
  }),

  getHistoricalAdjustments: protectedProcedure
    .input(
      z.object({
        department: z.string().optional(),
        position: z.string().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();

      let query = sql`
        SELECT 
          id,
          employee_name,
          department,
          position,
          previous_salary,
          new_salary,
          adjustment_percentage,
          adjustment_type,
          market_rate,
          salary_gap_percentage,
          effective_date,
          reason
        FROM salary_history
        WHERE 1=1
      `;

      if (input.department) {
        query = sql`${query} AND department = ${input.department}`;
      }

      if (input.position) {
        query = sql`${query} AND position = ${input.position}`;
      }

      if (input.startDate) {
        query = sql`${query} AND effective_date >= ${input.startDate}`;
      }

      if (input.endDate) {
        query = sql`${query} AND effective_date <= ${input.endDate}`;
      }

      query = sql`${query} ORDER BY effective_date DESC LIMIT 100`;

      const adjustments = await db.execute(query);
      return adjustments.rows;
    }),

  getDepartmentSummary: protectedProcedure.query(async () => {
    const db = await getDb();

    const summary = await db.execute(sql`
      SELECT 
        p.department,
        COUNT(DISTINCT p.employee_id) as total_employees,
        AVG(p.salary) as avg_current_salary,
        AVG(p.market_rate) as avg_market_rate,
        AVG(p.salary_gap_percentage) as avg_gap,
        SUM(CASE WHEN p.requires_review = 1 THEN 1 ELSE 0 END) as critical_count,
        -- Costo estimado de ajustes a mercado
        SUM(CASE 
          WHEN p.market_rate > p.salary THEN (p.market_rate - p.salary) * 12
          ELSE 0
        END) as estimated_adjustment_cost,
        -- Número de ajustes en últimos 6 meses
        (SELECT COUNT(*) 
         FROM salary_history sh 
         WHERE sh.department = p.department 
         AND sh.effective_date >= DATE_SUB(CURDATE(), INTERVAL 6 MONTH)
        ) as recent_adjustments
      FROM payroll_data p
      GROUP BY p.department
      ORDER BY avg_gap ASC
    `);

    return summary.rows;
  }),
});
