import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { cases, surveyResponses, surveys, users } from "../../drizzle/schema";
import { sql, and, gte, lte } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

/**
 * Router para gráficas de tendencias temporales
 * Proporciona datos de evolución semanal/mensual de:
 * - Casos NOM-035
 * - Cobertura de encuestas
 * - Cumplimiento normativo
 */
export const trendsRouter = router({
  /**
   * Obtener tendencias de casos NOM-035
   * Agrupa casos por semana o mes y compara con período anterior
   */
  getCasesTrends: protectedProcedure
    .input(
      z.object({
        period: z.enum(["weekly", "monthly"]),
        startDate: z.string(),
        endDate: z.string(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      const { period, startDate, endDate } = input;

      // Calcular período anterior para comparación
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffMs = end.getTime() - start.getTime();
      const prevStart = new Date(start.getTime() - diffMs);
      const prevEnd = new Date(start.getTime() - 1);

      // Formato de agrupación según período
      const dateFormat =
        period === "weekly"
          ? sql`DATE_FORMAT(createdAt, '%Y-%u')` // Año-Semana
          : sql`DATE_FORMAT(createdAt, '%Y-%m')`; // Año-Mes

      // Datos del período actual
      const currentData = await db
        .select({
          period: dateFormat,
          total: sql<number>`COUNT(*)`,
          abiertos: sql<number>`SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END)`,
          enInvestigacion: sql<number>`SUM(CASE WHEN status = 'investigating' THEN 1 ELSE 0 END)`,
          cerrados: sql<number>`SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END)`,
        })
        .from(cases)
        .where(and(gte(cases.createdAt, start), lte(cases.createdAt, end)))
        .groupBy(dateFormat)
        .orderBy(dateFormat);

      // Datos del período anterior
      const previousData = await db
        .select({
          period: dateFormat,
          total: sql<number>`COUNT(*)`,
        })
        .from(cases)
        .where(
          and(gte(cases.createdAt, prevStart), lte(cases.createdAt, prevEnd))
        )
        .groupBy(dateFormat);

      // Calcular totales para comparación
      const currentTotal = currentData.reduce(
        (sum: any, item: any) => sum + Number(item.total),
        0
      );
      const previousTotal = previousData.reduce(
        (sum: any, item: any) => sum + Number(item.total),
        0
      );
      const percentageChange =
        previousTotal > 0
          ? ((currentTotal - previousTotal) / previousTotal) * 100
          : 0;

      return {
        current: currentData.map(item => ({
          period: String(item.period),
          total: Number(item.total),
          abiertos: Number(item.abiertos),
          enInvestigacion: Number(item.enInvestigacion),
          cerrados: Number(item.cerrados),
        })),
        comparison: {
          currentTotal,
          previousTotal,
          percentageChange: Math.round(percentageChange * 10) / 10,
          trend:
            percentageChange > 0
              ? "up"
              : percentageChange < 0
                ? "down"
                : "stable",
        },
      };
    }),

  /**
   * Obtener tendencias de cobertura de encuestas
   */
  getSurveyCoverageTrends: protectedProcedure
    .input(
      z.object({
        period: z.enum(["weekly", "monthly"]),
        startDate: z.string(),
        endDate: z.string(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      const { period, startDate, endDate } = input;

      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffMs = end.getTime() - start.getTime();
      const prevStart = new Date(start.getTime() - diffMs);
      const prevEnd = new Date(start.getTime() - 1);

      const dateFormat =
        period === "weekly"
          ? sql`DATE_FORMAT(completed_at, '%Y-%u')`
          : sql`DATE_FORMAT(completed_at, '%Y-%m')`;

      // Respuestas completadas por período
      const currentData = await db
        .select({
          period: dateFormat,
          completadas: sql<number>`COUNT(*)`,
          guiaI: sql<number>`SUM(CASE WHEN survey_id = 1 THEN 1 ELSE 0 END)`,
          guiaII: sql<number>`SUM(CASE WHEN survey_id = 2 THEN 1 ELSE 0 END)`,
          guiaIII: sql<number>`SUM(CASE WHEN survey_id = 3 THEN 1 ELSE 0 END)`,
        })
        .from(surveyResponses)
        .where(
          and(
            sql`completed_at IS NOT NULL`,
            gte(surveyResponses.completedAt, start),
            lte(surveyResponses.completedAt, end)
          )
        )
        .groupBy(dateFormat)
        .orderBy(dateFormat);

      const previousData = await db
        .select({
          period: dateFormat,
          completadas: sql<number>`COUNT(*)`,
        })
        .from(surveyResponses)
        .where(
          and(
            sql`completed_at IS NOT NULL`,
            gte(surveyResponses.completedAt, prevStart),
            lte(surveyResponses.completedAt, prevEnd)
          )
        )
        .groupBy(dateFormat);

      const currentTotal = currentData.reduce(
        (sum: any, item: any) => sum + Number(item.completadas),
        0
      );
      const previousTotal = previousData.reduce(
        (sum: any, item: any) => sum + Number(item.completadas),
        0
      );
      const percentageChange =
        previousTotal > 0
          ? ((currentTotal - previousTotal) / previousTotal) * 100
          : 0;

      return {
        current: currentData.map(item => ({
          period: String(item.period),
          completadas: Number(item.completadas),
          guiaI: Number(item.guiaI),
          guiaII: Number(item.guiaII),
          guiaIII: Number(item.guiaIII),
        })),
        comparison: {
          currentTotal,
          previousTotal,
          percentageChange: Math.round(percentageChange * 10) / 10,
          trend:
            percentageChange > 0
              ? "up"
              : percentageChange < 0
                ? "down"
                : "stable",
        },
      };
    }),

  /**
   * Obtener tendencias de cumplimiento normativo
   * Basado en completitud de encuestas y acciones correctivas
   */
  getComplianceTrends: protectedProcedure
    .input(
      z.object({
        period: z.enum(["weekly", "monthly"]),
        startDate: z.string(),
        endDate: z.string(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database connection failed",
        });
      }

      const { period, startDate, endDate } = input;

      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffMs = end.getTime() - start.getTime();
      const prevStart = new Date(start.getTime() - diffMs);
      const prevEnd = new Date(start.getTime() - 1);

      const dateFormat =
        period === "weekly"
          ? sql`DATE_FORMAT(completed_at, '%Y-%u')`
          : sql`DATE_FORMAT(completed_at, '%Y-%m')`;

      // Calcular porcentaje de cumplimiento por período
      // (encuestas completadas / total de empleados activos)
      const currentData = await db
        .select({
          period: dateFormat,
          encuestasCompletadas: sql<number>`COUNT(DISTINCT user_id)`,
        })
        .from(surveyResponses)
        .where(
          and(
            sql`completed_at IS NOT NULL`,
            gte(surveyResponses.completedAt, start),
            lte(surveyResponses.completedAt, end)
          )
        )
        .groupBy(dateFormat)
        .orderBy(dateFormat);

      const previousData = await db
        .select({
          period: dateFormat,
          encuestasCompletadas: sql<number>`COUNT(DISTINCT user_id)`,
        })
        .from(surveyResponses)
        .where(
          and(
            sql`completed_at IS NOT NULL`,
            gte(surveyResponses.completedAt, prevStart),
            lte(surveyResponses.completedAt, prevEnd)
          )
        )
        .groupBy(dateFormat);

      // Obtener total de empleados para calcular porcentaje
      const [totalEmployeesResult] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(sql`users`);

      const totalEmployees = Number(totalEmployeesResult?.count || 1);

      const currentTotal = currentData.reduce(
        (sum: any, item: any) => sum + Number(item.encuestasCompletadas),
        0
      );
      const previousTotal = previousData.reduce(
        (sum: any, item: any) => sum + Number(item.encuestasCompletadas),
        0
      );

      const currentPercentage = (currentTotal / totalEmployees) * 100;
      const previousPercentage = (previousTotal / totalEmployees) * 100;
      const percentageChange =
        previousPercentage > 0
          ? ((currentPercentage - previousPercentage) / previousPercentage) *
            100
          : 0;

      return {
        current: currentData.map(item => ({
          period: String(item.period),
          encuestasCompletadas: Number(item.encuestasCompletadas),
          porcentajeCumplimiento:
            Math.round(
              (Number(item.encuestasCompletadas) / totalEmployees) * 100 * 10
            ) / 10,
        })),
        comparison: {
          currentPercentage: Math.round(currentPercentage * 10) / 10,
          previousPercentage: Math.round(previousPercentage * 10) / 10,
          percentageChange: Math.round(percentageChange * 10) / 10,
          trend:
            percentageChange > 0
              ? "up"
              : percentageChange < 0
                ? "down"
                : "stable",
        },
        totalEmployees,
      };
    }),
});
