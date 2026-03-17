/**
 * Router: Correlación Sentimiento-Casos
 * Visualiza la relación entre análisis de sentimiento y casos generados
 */

import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { sentimentAnalysis, nom035Cases, surveyResponses, users, departments } from "../../drizzle/schema";
import { eq, and, gte, desc, sql, count } from "drizzle-orm";
import { z } from "zod";

export const sentimentCasesCorrelationRouter = router({
  /**
   * Query: Datos de correlación temporal (comentarios críticos vs casos abiertos)
   */
  getCorrelationData: protectedProcedure
    .input(
      z.object({
        departmentId: z.number().optional(),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { departmentId, startDate, endDate } = input;

      // Rango de fechas por defecto: últimos 90 días
      const end = endDate ? new Date(endDate) : new Date();
      const start = startDate ? new Date(startDate) : new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);

      // Obtener comentarios críticos por mes
      const criticalComments = await db
        .select({
          month: sql<string>`DATE_FORMAT(${sentimentAnalysis.analyzedAt}, '%Y-%m')`,
          count: count(),
        })
        .from(sentimentAnalysis)
        .innerJoin(surveyResponses, eq(sentimentAnalysis.responseId, surveyResponses.id))
        .innerJoin(users, eq(surveyResponses.userId, users.id))
        .where(
          and(
            eq(sentimentAnalysis.riskLevel, "critical"),
            gte(sentimentAnalysis.analyzedAt, start),
            departmentId ? eq(users.departamento, departmentId) : sql`1=1`
          )
        )
        .groupBy(sql`DATE_FORMAT(${sentimentAnalysis.analyzedAt}, '%Y-%m')`)
        .orderBy(sql`DATE_FORMAT(${sentimentAnalysis.analyzedAt}, '%Y-%m')`);

      // Obtener casos abiertos por mes
      const casesOpened = await db
        .select({
          month: sql<string>`DATE_FORMAT(${nom035Cases.createdAt}, '%Y-%m')`,
          count: count(),
        })
        .from(nom035Cases)
        .where(
          and(
            gte(nom035Cases.createdAt, start),
            departmentId ? sql`${nom035Cases.employeeId} IN (SELECT id FROM employees WHERE department_id = ${departmentId})` : sql`1=1`
          )
        )
        .groupBy(sql`DATE_FORMAT(${nom035Cases.createdAt}, '%Y-%m')`)
        .orderBy(sql`DATE_FORMAT(${nom035Cases.createdAt}, '%Y-%m')`);

      // Combinar datos por mes
      const months = Array.from(new Set([...criticalComments.map(c => c.month), ...casesOpened.map(c => c.month)])).sort();
      
      const correlationData = months.map(month => {
        const criticalCount = criticalComments.find(c => c.month === month)?.count || 0;
        const casesCount = casesOpened.find(c => c.month === month)?.count || 0;
        return {
          month,
          criticalComments: criticalCount,
          casesOpened: casesCount,
        };
      });

      return correlationData;
    }),

  /**
   * Query: Casos generados automáticamente por análisis de sentimiento
   */
  getAutoCases: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(20),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const autoCases = await db
        .select({
          id: nom035Cases.id,
          title: nom035Cases.folio,
          description: nom035Cases.description,
          priority: nom035Cases.riskLevel,
          status: nom035Cases.status,
          createdAt: nom035Cases.createdAt,
          departmentName: users.departamento,
        })
        .from(nom035Cases)
        .leftJoin(users, eq(nom035Cases.reportedBy, users.id))
        .where(eq(nom035Cases.source, "sentiment_analysis_auto"))
        .orderBy(desc(nom035Cases.createdAt))
        .limit(input.limit);

      return autoCases;
    }),

  /**
   * Query: Métricas de efectividad de intervenciones
   */
  getInterventionMetrics: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Total de casos generados automáticamente
    const totalAutoCases = await db
      .select({ count: count() })
      .from(nom035Cases)
      .where(eq(nom035Cases.source, "sentiment_analysis_auto"));

    // Casos cerrados
    const closedAutoCases = await db
      .select({ count: count() })
      .from(nom035Cases)
      .where(
        and(
          eq(nom035Cases.source, "sentiment_analysis_auto"),
          sql`${nom035Cases.status} = 'closed'`
        )
      );

    // Casos en proceso
    const inProgressAutoCases = await db
      .select({ count: count() })
      .from(nom035Cases)
      .where(
        and(
          eq(nom035Cases.source, "sentiment_analysis_auto"),
          sql`${nom035Cases.status} = 'investigating'`
        )
      );

    // Casos abiertos
    const openAutoCases = await db
      .select({ count: count() })
      .from(nom035Cases)
      .where(
        and(
          eq(nom035Cases.source, "sentiment_analysis_auto"),
          sql`${nom035Cases.status} = 'open'`
        )
      );

    // Calcular tasa de resolución
    const resolutionRate = totalAutoCases[0].count > 0
      ? ((closedAutoCases[0].count / totalAutoCases[0].count) * 100).toFixed(1)
      : "0.0";

    // Tiempo promedio de resolución (días) - solo casos cerrados
    const avgResolutionTime = await db
      .select({
        avgDays: sql<number>`AVG(DATEDIFF(${nom035Cases.closedAt}, ${nom035Cases.createdAt}))`,
      })
      .from(nom035Cases)
      .where(
        and(
          eq(nom035Cases.source, "sentiment_analysis_auto"),
          sql`${nom035Cases.status} = 'closed'`,
          sql`${nom035Cases.closedAt} IS NOT NULL`
        )
      );

    return {
      totalCases: totalAutoCases[0].count,
      closedCases: closedAutoCases[0].count,
      inProgressCases: inProgressAutoCases[0].count,
      openCases: openAutoCases[0].count,
      resolutionRate: parseFloat(resolutionRate),
      avgResolutionDays: avgResolutionTime[0]?.avgDays ? Math.round(avgResolutionTime[0].avgDays) : 0,
    };
  }),

  /**
   * Query: Distribución de casos automáticos por departamento
   */
  getCasesByDepartment: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    const casesByDept = await db
      .select({
        department: users.departamento,
        count: count(),
      })
      .from(nom035Cases)
      .innerJoin(users, eq(nom035Cases.reportedBy, users.id))
      .where(eq(nom035Cases.source, "sentiment_analysis_auto"))
      .groupBy(users.departamento)
      .orderBy(desc(count()));

    return casesByDept;
  }),
});
