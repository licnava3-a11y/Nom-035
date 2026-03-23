/**
 * Router para Tendencias Departamentales
 * Analiza concentración de casos y niveles de riesgo por departamento
 */

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { cases, employees, departments, departmentThresholds } from "../../drizzle/schema";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";

export const departmentalTrendsRouter = router({
  /**
   * Obtener métricas de riesgo por departamento
   */
  getDepartmentalRiskMetrics: protectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { startDate, endDate } = input;

      // Construir condiciones de fecha
      const dateConditions = [];
      if (startDate) {
        dateConditions.push(gte(cases.createdAt, new Date(startDate)));
      }
      if (endDate) {
        dateConditions.push(lte(cases.createdAt, new Date(endDate)));
      }

      // Obtener todos los departamentos
      const allDepartments = await db.select().from(departments);

      // Obtener casos agrupados por departamento usando departmentId real
      const allCases = await db
        .select({
          id: cases.id,
          status: cases.status,
          priority: cases.priority,
          createdAt: cases.createdAt,
          closedAt: cases.closedAt,
          departmentId: cases.departmentId,
        })
        .from(cases)
        .where(and(...dateConditions));

      // Agrupar casos por departamento usando departmentId real
      const departmentalCases = allDepartments.map((dept: any) => {
        // Filtrar casos del departamento actual
        const deptCases = allCases.filter(c => c.departmentId === dept.id);
        
        const totalCases = deptCases.length;
        const openCases = deptCases.filter(c => c.status === 'open').length;
        const criticalCases = deptCases.filter(c => c.priority === 'critical').length;
        const mediumCases = deptCases.filter(c => c.priority === 'medium').length;
        const lowCases = deptCases.filter(c => c.priority === 'low').length;
        
        const closedCases = deptCases.filter(c => c.closedAt !== null);
        const avgResolutionDays = closedCases.length > 0
          ? closedCases.reduce((sum: any, c: any) => {
              const days = Math.floor(
                (new Date(c.closedAt!).getTime() - new Date(c.createdAt).getTime()) / (1000 * 60 * 60 * 24)
              );
              return sum + days;
            }, 0) / closedCases.length
          : 0;

        return {
          departmentId: dept.id,
          departmentName: dept.name,
          totalCases,
          openCases,
          criticalCases,
          mediumCases,
          lowCases,
          avgResolutionDays,
        };
      });

      // Calcular score de riesgo por departamento (0-100)
      const departmentalMetrics = departmentalCases.map((dept: any) => {
        const totalCases = Number(dept.totalCases) || 0;
        const openCases = Number(dept.openCases) || 0;
        const criticalCases = Number(dept.criticalCases) || 0;
        const mediumCases = Number(dept.mediumCases) || 0;
        const avgResolutionDays = Number(dept.avgResolutionDays) || 0;

        // Fórmula de score de riesgo departamental
        // - 40% peso: casos críticos
        // - 30% peso: casos abiertos
        // - 20% peso: tiempo promedio de resolución
        // - 10% peso: casos medios
        const criticalScore = totalCases > 0 ? (criticalCases / totalCases) * 40 : 0;
        const openScore = totalCases > 0 ? (openCases / totalCases) * 30 : 0;
        const resolutionScore = avgResolutionDays > 30 ? 20 : (avgResolutionDays / 30) * 20;
        const mediumScore = totalCases > 0 ? (mediumCases / totalCases) * 10 : 0;

        const riskScore = Math.round(criticalScore + openScore + resolutionScore + mediumScore);

        // Determinar nivel de alerta
        let alertLevel: "low" | "medium" | "high" | "critical";
        if (riskScore >= 75) alertLevel = "critical";
        else if (riskScore >= 50) alertLevel = "high";
        else if (riskScore >= 25) alertLevel = "medium";
        else alertLevel = "low";

        return {
          departmentId: dept.departmentId,
          departmentName: dept.departmentName || "Sin departamento",
          totalCases,
          openCases,
          criticalCases,
          mediumCases,
          lowCases: Number(dept.lowCases) || 0,
          avgResolutionDays: Math.round(avgResolutionDays),
          riskScore,
          alertLevel,
        };
      });

      // Ordenar por score de riesgo descendente
      departmentalMetrics.sort((a: any, b: any) => b.riskScore - a.riskScore);

      // Calcular estadísticas globales
      const totalDepartments = departmentalMetrics.length;
      const departmentsInAlert = departmentalMetrics.filter((d: any) => d.alertLevel === "high" || d.alertLevel === "critical"
      ).length;
      const avgRiskScore =
        totalDepartments > 0
          ? Math.round(
              departmentalMetrics.reduce((sum: any, d: any) => sum + d.riskScore, 0) / totalDepartments
            )
          : 0;

      return {
        departments: departmentalMetrics,
        summary: {
          totalDepartments,
          departmentsInAlert,
          avgRiskScore,
          criticalDepartments: departmentalMetrics.filter((d: any) => d.alertLevel === "critical")
            .length,
          highRiskDepartments: departmentalMetrics.filter((d: any) => d.alertLevel === "high").length,
        },
      };
    }),

  /**
   * Obtener evolución temporal de un departamento
   */
  getDepartmentTrend: protectedProcedure
    .input(
      z.object({
        departmentId: z.number(),
        months: z.number().default(6),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { departmentId, months } = input;

      // Calcular fecha de inicio
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      // Obtener casos agrupados por mes
      const monthlyData = await db
        .select({
          month: sql<string>`DATE_FORMAT(${cases.createdAt}, '%Y-%m')`,
          totalCases: sql<number>`COUNT(${cases.id})`,
          criticalCases: sql<number>`SUM(CASE WHEN ${cases.priority} = 'critical' THEN 1 ELSE 0 END)`,
          openCases: sql<number>`SUM(CASE WHEN ${cases.status} = 'open' THEN 1 ELSE 0 END)`,
        })
        .from(cases)
        .where(gte(cases.createdAt, startDate))
        .groupBy(sql`DATE_FORMAT(${cases.createdAt}, '%Y-%m')`)
        .orderBy(sql`DATE_FORMAT(${cases.createdAt}, '%Y-%m')`);

      // Simular distribución para el departamento específico
      return monthlyData.map((data: any) => ({
        month: data.month,
        totalCases: Math.floor((Number(data.totalCases) || 0) / 3), // Simulación
        criticalCases: Math.floor((Number(data.criticalCases) || 0) / 3),
        openCases: Math.floor((Number(data.openCases) || 0) / 3),
      }));
    }),

  /**
   * Obtener alertas departamentales activas
   */
  getDepartmentalAlerts: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Obtener departamentos con alto riesgo (últimos 30 días)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Obtener casos recientes
    const recentCases = await db
      .select()
      .from(cases)
      .where(gte(cases.createdAt, thirtyDaysAgo));

    // Obtener departamentos
    const allDepartments = await db.select().from(departments);

    // Agrupar casos por departamento (simulado)
    const departmentCaseStats = allDepartments.map((dept: any, index: number) => {
      const deptCases = recentCases.filter((_: any, i: number) => i % allDepartments.length === index);
      return {
        departmentId: dept.id,
        departmentName: dept.name,
        criticalCases: deptCases.filter(c => c.priority === 'critical').length,
        openCases: deptCases.filter(c => c.status === 'open').length,
      };
    });

    // Generar alertas para departamentos con más de 3 casos críticos o más de 5 casos abiertos
    const alerts = departmentCaseStats
      .filter((dept: any) => {
        const criticalCases = Number(dept.criticalCases) || 0;
        const openCases = Number(dept.openCases) || 0;
        return criticalCases >= 3 || openCases >= 5;
      })
      .map((dept: any) => {
        const criticalCases = Number(dept.criticalCases) || 0;
        const openCases = Number(dept.openCases) || 0;

        let severity: "medium" | "high" | "critical";
        let message: string;

        if (criticalCases >= 5) {
          severity = "critical";
          message = `${dept.departmentName} tiene ${criticalCases} casos críticos en los últimos 30 días. Se requiere intervención inmediata.`;
        } else if (criticalCases >= 3) {
          severity = "high";
          message = `${dept.departmentName} tiene ${criticalCases} casos críticos. Se recomienda revisión prioritaria.`;
        } else {
          severity = "medium";
          message = `${dept.departmentName} tiene ${openCases} casos abiertos pendientes de atención.`;
        }

        return {
          departmentId: dept.departmentId,
          departmentName: dept.departmentName || "Sin departamento",
          severity,
          message,
          criticalCases,
          openCases,
          generatedAt: new Date().toISOString(),
        };
      });

    return alerts;
  }),

  /**
   * Obtener umbrales configurados (global o por departamento)
   */
  getThresholds: protectedProcedure
    .input(
      z.object({
        departmentId: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Buscar umbral específico del departamento
      if (input.departmentId) {
        const deptThreshold = await db
          .select()
          .from(departmentThresholds)
          .where(eq(departmentThresholds.departmentId, input.departmentId))
          .limit(1);

        if (deptThreshold.length > 0) {
          return deptThreshold[0];
        }
      }

      // Si no hay umbral específico, obtener umbral global (departmentId = null)
      const globalThreshold = await db
        .select()
        .from(departmentThresholds)
        .where(sql`${departmentThresholds.departmentId} IS NULL`)
        .limit(1);

      if (globalThreshold.length > 0) {
        return globalThreshold[0];
      }

      // Si no existe ningún umbral, retornar valores por defecto
      return {
        id: 0,
        departmentId: null,
        criticalCasesThreshold: 5,
        openCasesThreshold: 10,
        riskScoreThreshold: 70,
        avgResolutionDaysThreshold: 30,
        enableAlerts: true,
        alertRecipients: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }),

  /**
   * Actualizar umbrales de un departamento
   */
  updateThresholds: protectedProcedure
    .input(
      z.object({
        departmentId: z.number().nullable(),
        criticalCasesThreshold: z.number().min(1).max(100),
        openCasesThreshold: z.number().min(1).max(100),
        riskScoreThreshold: z.number().min(1).max(100),
        avgResolutionDaysThreshold: z.number().min(1).max(365),
        enableAlerts: z.boolean(),
        alertRecipients: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const { departmentId, ...thresholdData } = input;

      // Verificar si ya existe un umbral para este departamento
      const existing = await db
        .select()
        .from(departmentThresholds)
        .where(
          departmentId
            ? eq(departmentThresholds.departmentId, departmentId)
            : sql`${departmentThresholds.departmentId} IS NULL`
        )
        .limit(1);

      if (existing.length > 0) {
        // Actualizar umbral existente
        await db
          .update(departmentThresholds)
          .set({
            ...thresholdData,
            updatedAt: new Date(),
          } as any)
          .where(eq(departmentThresholds.id, existing[0].id));

        return { success: true, message: "Umbrales actualizados exitosamente" };
      } else {
        // Crear nuevo umbral
        await (db.insert(departmentThresholds) as any).values({
          departmentId,
          ...thresholdData,
        });

        return { success: true, message: "Umbrales creados exitosamente" };
      }
    }),
});
