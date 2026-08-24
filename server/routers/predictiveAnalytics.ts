import { sql } from "drizzle-orm";
import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

/**
 * Predictive Analytics Router
 * Análisis predictivo de riesgos psicosociales usando datos históricos
 */
export const predictiveAnalyticsRouter = router({
  /**
   * Obtener predicciones de riesgo para empleados
   * Algoritmo de scoring basado en:
   * - Historial de casos previos
   * - Resultados de encuestas NOM-035
   * - Patrones de reportes
   * - Métricas de estrés laboral
   */
  getRiskPredictions: protectedProcedure
    .input(
      z.object({
        departmentFilter: z.string().optional(),
        riskThreshold: z.number().min(0).max(100).default(70), // Umbral de riesgo (0-100)
        limit: z.number().min(1).max(100).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const { getDb } = await import("../db");
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      const { cases, surveyResults, users } = await import(
        "../../drizzle/schema"
      );
      const { eq, sql, and, desc } = await import("drizzle-orm");

      // 1. Obtener empleados con sus datos relevantes
      const employeesQuery = await db
        .select({
          userId: users.id,
          name: users.name,
          email: users.email,
          department: users.departamento,
          position: users.puesto,
          hireDate: users.fechaIngreso,
        })
        .from(users)
        .where(
          input.departmentFilter
            ? eq(users.departamento, input.departmentFilter)
            : sql`1=1`
        );

      // 2. Calcular score de riesgo para cada empleado
      const riskPredictions = await Promise.all(
        employeesQuery.map(async employee => {
          // Factor 1: Resultados de encuestas NOM-035 (peso 60%)
          // Buscar resultado más reciente de encuesta
          const latestSurvey = await db.execute(sql`
            SELECT riskLevel
            FROM ${surveyResults}
            WHERE ${surveyResults.userId} = ${employee.userId}
            ORDER BY ${surveyResults.completedAt} DESC
            LIMIT 1
          `);
          const surveyRisk =
            (latestSurvey as any).rows?.[0]?.riskLevel || "low";

          // Factor 2: Casos en el departamento (peso 30%)
          const departmentCases = await db.execute(sql`
            SELECT COUNT(*) as count
            FROM ${cases}
            WHERE ${cases.createdAt} >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
          `);
          const departmentCasesCount = Number(
            (departmentCases as any).rows?.[0]?.count || 0
          );

          // Factor 3: Casos críticos en departamento (peso 10%)
          const criticalDeptCases = await db.execute(sql`
            SELECT COUNT(*) as count
            FROM ${cases}
            WHERE ${cases.priority} = 'critical'
            AND ${cases.createdAt} >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
          `);
          const criticalDeptCount = Number(
            (criticalDeptCases as any).rows?.[0]?.count || 0
          );

          // Calcular score de riesgo (0-100)
          let riskScore = 0;

          // Resultado de encuesta NOM-035 (principal indicador)
          const surveyScores: Record<string, number> = {
            very_high: 60,
            high: 45,
            medium: 25,
            low: 0,
          };
          riskScore += surveyScores[surveyRisk] || 0;

          // Casos en departamento: indicador de ambiente laboral
          if (departmentCasesCount >= 10) riskScore += 30;
          else if (departmentCasesCount >= 5) riskScore += 20;
          else if (departmentCasesCount >= 2) riskScore += 10;

          // Casos críticos en departamento
          if (criticalDeptCount >= 3) riskScore += 10;
          else if (criticalDeptCount >= 1) riskScore += 5;

          // Determinar nivel de riesgo
          let riskLevel: "low" | "medium" | "high" | "critical";
          if (riskScore >= 80) riskLevel = "critical";
          else if (riskScore >= 60) riskLevel = "high";
          else if (riskScore >= 40) riskLevel = "medium";
          else riskLevel = "low";

          // Generar recomendaciones
          const recommendations: string[] = [];
          if (surveyRisk === "very_high") {
            recommendations.push(
              "URGENTE: Evaluación psicológica inmediata requerida (NOM-035)"
            );
            recommendations.push(
              "Asignar a programa de intervención especializada"
            );
          } else if (surveyRisk === "high") {
            recommendations.push(
              "Evaluación psicológica recomendada según NOM-035"
            );
            recommendations.push(
              "Seguimiento mensual de condiciones laborales"
            );
          }

          if (departmentCasesCount >= 10) {
            recommendations.push(
              "Departamento de alto riesgo: intervención organizacional necesaria"
            );
          }

          if (criticalDeptCount >= 3) {
            recommendations.push(
              "Múltiples casos críticos en área: auditoría de clima laboral urgente"
            );
          }

          if (riskScore >= input.riskThreshold) {
            recommendations.push(
              "Asignar a programa de prevención de riesgos psicosociales"
            );
          }

          return {
            userId: employee.userId,
            name: employee.name || "Sin nombre",
            email: employee.email,
            department: employee.department,
            position: employee.position,
            riskScore: Math.round(riskScore),
            riskLevel,
            factors: {
              surveyRisk,
              departmentCasesCount,
              criticalDeptCount,
            },
            recommendations,
          };
        })
      );

      // 3. Filtrar por umbral de riesgo y ordenar por score descendente
      const highRiskEmployees = riskPredictions
        .filter((p: any) => p.riskScore >= input.riskThreshold)
        .sort((a: any, b: any) => b.riskScore - a.riskScore)
        .slice(0, input.limit);

      // 4. Estadísticas generales
      const totalEmployees = riskPredictions.length;
      const criticalRisk = riskPredictions.filter(
        (p: any) => p.riskLevel === "critical"
      ).length;
      const highRisk = riskPredictions.filter(
        (p: any) => p.riskLevel === "high"
      ).length;
      const mediumRisk = riskPredictions.filter(
        (p: any) => p.riskLevel === "medium"
      ).length;
      const lowRisk = riskPredictions.filter(
        (p: any) => p.riskLevel === "low"
      ).length;

      return {
        predictions: highRiskEmployees,
        statistics: {
          totalEmployees,
          criticalRisk,
          highRisk,
          mediumRisk,
          lowRisk,
          averageRiskScore: Math.round(
            riskPredictions.reduce(
              (sum: number, p: any) => sum + p.riskScore,
              0
            ) / totalEmployees
          ),
        },
      };
    }),

  /**
   * Identificar empleados en riesgo de rotación basado en tendencias descendentes
   * de competencias clave (Evaluación 360°)
   */
  identifyAtRiskEmployees: protectedProcedure
    .input(
      z.object({
        departmentId: z.number().optional(),
        minScore: z.number().min(0).max(100).default(50),
      })
    )
    .query(async ({ input }) => {
      const { getDb } = await import("../db");
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });
      const {
        employees,
        evaluation360Responses,
        evaluation360Cycles,
        evaluation360Assignments,
        departments,
      } = await import("../../drizzle/schema");
      const { eq, and, desc, sql } = await import("drizzle-orm");

      // Obtener empleados con sus evaluaciones 360° históricas
      const employeesWithEvaluations = await db
        .select({
          employeeId: employees.id,
          employeeName: sql<string>`CONCAT(${employees.firstName}, ' ', ${employees.lastName})`,
          employeeEmail: employees.email,
          departmentId: employees.departmentId,
          departmentName: departments.name,
          cycleId: evaluation360Cycles.id,
          cycleName: evaluation360Cycles.cycleName,
          cycleEndDate: evaluation360Cycles.endDate,
          avgScore: sql<number>`AVG(${evaluation360Responses.score})`.as(
            "avgScore"
          ),
        })
        .from(employees)
        .leftJoin(departments, eq(employees.departmentId, departments.id))
        .leftJoin(
          evaluation360Assignments,
          eq(employees.id, evaluation360Assignments.evaluatedEmployeeId)
        )
        .leftJoin(
          evaluation360Cycles,
          eq(evaluation360Assignments.cycleId, evaluation360Cycles.id)
        )
        .leftJoin(
          evaluation360Responses,
          eq(
            evaluation360Assignments.id,
            sql`${evaluation360Responses.evaluatorId}`
          )
        )
        .where(
          and(
            employees.isActive ? eq(employees.isActive, true) : sql`1=1`,
            input.departmentId
              ? eq(employees.departmentId, input.departmentId)
              : sql`1=1`
          )
        )
        .groupBy(
          employees.id,
          sql<string>`CONCAT(${employees.firstName}, ' ', ${employees.lastName})`,
          employees.email,
          employees.departmentId,
          departments.name,
          evaluation360Cycles.id,
          evaluation360Cycles.cycleName,
          evaluation360Cycles.endDate
        )
        .orderBy(employees.id, desc(evaluation360Cycles.endDate));

      // Agrupar evaluaciones por empleado
      const employeeMap = new Map<
        number,
        {
          employeeId: number;
          employeeName: string;
          employeeEmail: string;
          departmentId: number | null;
          departmentName: string | null;
          evaluations: Array<{
            cycleId: number;
            cycleName: string;
            cycleEndDate: Date | null;
            avgScore: number;
          }>;
        }
      >();

      for (const row of employeesWithEvaluations) {
        if (!employeeMap.has(row.employeeId)) {
          employeeMap.set(row.employeeId, {
            employeeId: row.employeeId,
            employeeName: row.employeeName,
            employeeEmail: row.employeeEmail,
            departmentId: row.departmentId,
            departmentName: row.departmentName,
            evaluations: [],
          });
        }

        if (row.cycleId && row.avgScore) {
          employeeMap.get(row.employeeId)!.evaluations.push({
            cycleId: row.cycleId,
            cycleName: row.cycleName ?? "",
            cycleEndDate: row.cycleEndDate,
            avgScore: row.avgScore,
          });
        }
      }

      // Calcular score de retención y detectar tendencias descendentes
      const atRiskEmployees = [];

      for (const [employeeId, data] of Array.from(employeeMap.entries())) {
        if (data.evaluations.length < 2) continue; // Necesitamos al menos 2 evaluaciones

        // Ordenar evaluaciones por fecha (más reciente primero)
        data.evaluations.sort(
          (
            a: {
              cycleId: number;
              cycleName: string;
              cycleEndDate: Date | null;
              avgScore: number;
            },
            b: {
              cycleId: number;
              cycleName: string;
              cycleEndDate: Date | null;
              avgScore: number;
            }
          ) => {
            if (!a.cycleEndDate || !b.cycleEndDate) return 0;
            return (
              new Date(b.cycleEndDate).getTime() -
              new Date(a.cycleEndDate).getTime()
            );
          }
        );

        // Calcular tendencia (comparar últimas 2-3 evaluaciones)
        const recentEvaluations = data.evaluations.slice(
          0,
          Math.min(3, data.evaluations.length)
        );
        let trend = "stable";
        let trendValue = 0;

        if (recentEvaluations.length >= 2) {
          const latest = recentEvaluations[0].avgScore;
          const previous = recentEvaluations[1].avgScore;
          trendValue = latest - previous;

          if (trendValue < -0.3) {
            // Descenso significativo (>0.3 puntos)
            trend = "descending";
          } else if (trendValue > 0.3) {
            trend = "ascending";
          }
        }

        // Calcular score de retención (0-100)
        // Factores: promedio reciente, tendencia, volatilidad
        const avgRecentScore =
          recentEvaluations.reduce(
            (sum: number, e: { avgScore: number }) => sum + e.avgScore,
            0
          ) / recentEvaluations.length;
        const volatility =
          recentEvaluations.length >= 3
            ? Math.abs(
                recentEvaluations[0].avgScore - recentEvaluations[2].avgScore
              )
            : 0;

        let retentionScore = avgRecentScore * 25; // Base: 0-100 (asumiendo escala 1-4)

        // Ajustar por tendencia
        if (trend === "descending") {
          retentionScore -= 20;
        } else if (trend === "ascending") {
          retentionScore += 10;
        }

        // Ajustar por volatilidad
        retentionScore -= volatility * 5;

        // Normalizar a 0-100
        retentionScore = Math.max(0, Math.min(100, retentionScore));

        // Agregar a lista si está en riesgo
        if (retentionScore < input.minScore) {
          atRiskEmployees.push({
            employeeId: data.employeeId,
            employeeName: data.employeeName,
            employeeEmail: data.employeeEmail,
            departmentId: data.departmentId,
            departmentName: data.departmentName ?? "",
            retentionScore: Math.round(retentionScore),
            trend,
            trendValue: Math.round(trendValue * 100) / 100,
            avgRecentScore: Math.round(avgRecentScore * 100) / 100,
            evaluationCount: data.evaluations.length,
            lastEvaluationDate: recentEvaluations[0].cycleEndDate,
            riskLevel:
              retentionScore < 30
                ? "critical"
                : retentionScore < 50
                  ? "high"
                  : "medium",
          });
        }
      }

      // Ordenar por score de retención (menor primero = mayor riesgo)
      atRiskEmployees.sort(
        (a: any, b: any) => a.retentionScore - b.retentionScore
      );

      return {
        totalAtRisk: atRiskEmployees.length,
        criticalRisk: atRiskEmployees.filter(
          (e: any) => e.riskLevel === "critical"
        ).length,
        highRisk: atRiskEmployees.filter((e: any) => e.riskLevel === "high")
          .length,
        mediumRisk: atRiskEmployees.filter((e: any) => e.riskLevel === "medium")
          .length,
        employees: atRiskEmployees,
      };
    }),

  /**
   * Generar alertas automáticas para RH cuando empleados tienen score < 50
   */
  generateRetentionAlerts: protectedProcedure
    .input(
      z.object({
        minScore: z.number().min(0).max(100).default(50),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { notifyOwner } = await import("../_core/notification");

      // Reutilizar lógica de identifyAtRiskEmployees
      const caller = predictiveAnalyticsRouter.createCaller(ctx);
      const result: {
        totalAtRisk: number;
        criticalRisk: number;
        highRisk: number;
        mediumRisk: number;
        employees: Array<{
          employeeName: string;
          departmentName: string;
          retentionScore: number;
          trend: string;
          riskLevel: string;
        }>;
      } = await caller.identifyAtRiskEmployees({
        minScore: input.minScore,
      });

      if (result.totalAtRisk === 0) {
        return {
          success: true,
          alertsSent: 0,
          message: "No hay empleados en riesgo de rotación",
        };
      }

      // Generar contenido de alerta
      const alertContent = `
**ALERTA DE RIESGO DE ROTACIÓN**

Se han identificado **${result.totalAtRisk} empleados** con score de retención < ${input.minScore}:

- **Riesgo Crítico** (score < 30): ${result.criticalRisk} empleados
- **Riesgo Alto** (score 30-49): ${result.highRisk} empleados
- **Riesgo Medio** (score 50-69): ${result.mediumRisk} empleados

**Empleados en riesgo crítico:**
${result.employees
  .filter((e: any) => e.riskLevel === "critical")
  .slice(0, 5)
  .map(
    (e: any) =>
      `- ${e.employeeName} (${e.departmentName}): Score ${e.retentionScore} - Tendencia ${e.trend}`
  )
  .join("\n")}

${result.criticalRisk > 5 ? `... y ${result.criticalRisk - 5} más` : ""}

**Acción recomendada:** Revisar el módulo de Análisis Predictivo de Rotación para ver el detalle completo y tomar acciones preventivas.
      `.trim();

      // Enviar notificación al owner (RH)
      const notificationSent = await notifyOwner({
        title: `⚠️ Alerta de Rotación: ${result.totalAtRisk} empleados en riesgo`,
        content: alertContent,
      });

      return {
        success: notificationSent,
        alertsSent: notificationSent ? 1 : 0,
        totalAtRisk: result.totalAtRisk,
        criticalRisk: result.criticalRisk,
        message: notificationSent
          ? `Alerta enviada exitosamente para ${result.totalAtRisk} empleados en riesgo`
          : "Error al enviar alerta",
      };
    }),

  /**
   * Obtener estadísticas generales de retención
   */
  getRetentionStats: protectedProcedure.query(async ({ ctx }) => {
    const { getDb } = await import("../db");
    const db = await getDb();
    if (!db)
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Database not available",
      });
    const { employees } = await import("../../drizzle/schema");
    const { eq, sql } = await import("drizzle-orm");

    // Obtener todos los empleados activos
    const activeEmployees = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(employees)
      .where(eq(employees.isActive, true));

    // Obtener empleados en riesgo (evitar referencia circular usando valores directos)
    const totalActive = Number(activeEmployees[0]?.count || 0);
    // Calcular empleados en riesgo directamente sin llamada circular
    const { nom035Results } = await import("../../drizzle/schema");
    const atRiskCount = await db
      .select({
        count: sql<number>`COUNT(DISTINCT ${nom035Results.employeeId})`,
      })
      .from(nom035Results)
      .where(sql`${nom035Results.globalRiskLevel} IN ('alto', 'muy_alto')`);
    const totalAtRisk = Number(atRiskCount[0]?.count || 0);
    const criticalRisk = 0; // Simplificado para evitar referencia circular
    const highRisk = totalAtRisk;
    const mediumRisk = 0;
    const retentionRate =
      totalActive > 0
        ? Math.round(((totalActive - totalAtRisk) / totalActive) * 100)
        : 0;

    return {
      totalActiveEmployees: totalActive,
      totalAtRisk,
      criticalRisk,
      highRisk,
      mediumRisk,
      retentionRate,
      atRiskPercentage:
        totalActive > 0 ? Math.round((totalAtRisk / totalActive) * 100) : 0,
    };
  }),
});
