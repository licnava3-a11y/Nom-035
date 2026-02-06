import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { surveyResponses, surveyPeriods, surveys, users } from "../../drizzle/schema";
import { eq, and, sql, gte, lte, desc } from "drizzle-orm";

export const nom035AdminRouter = router({
  /**
   * Obtener estadísticas generales de encuestas NOM-035
   */
  getStats: protectedProcedure
    .input(z.object({
      periodId: z.number().optional(),
      surveyType: z.enum(["guia_i", "guia_ii", "guia_iii"]).optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      let conditions = [];
      if (input.periodId) {
        conditions.push(eq(surveyResponses.periodId, input.periodId));
      }
      if (input.surveyType) {
        const [survey] = await db
          .select({ id: surveys.id })
          .from(surveys)
          .where(eq(surveys.type, input.surveyType))
          .limit(1);
        if (survey) {
          conditions.push(eq(surveyResponses.surveyId, survey.id));
        }
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Total de respuestas
      const [totalResult] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(surveyResponses)
        .where(whereClause);

      // Respuestas completadas
      const [completedResult] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(surveyResponses)
        .where(and(whereClause, sql`${surveyResponses.completedAt} IS NOT NULL`));

      // Distribución por nivel de riesgo (extraer del JSON results)
      const completedResponses = await db
        .select({
          results: surveyResponses.results,
        })
        .from(surveyResponses)
        .where(and(whereClause, sql`${surveyResponses.completedAt} IS NOT NULL`));

      // Procesar resultados para obtener distribución de riesgo
      const riskCounts: Record<string, number> = {};
      completedResponses.forEach(response => {
        if (response.results) {
          try {
            const results = JSON.parse(response.results);
            const riskLevel = results.riskLevel || "Sin clasificar";
            riskCounts[riskLevel] = (riskCounts[riskLevel] || 0) + 1;
          } catch (e) {
            riskCounts["Sin clasificar"] = (riskCounts["Sin clasificar"] || 0) + 1;
          }
        }
      });

      const riskDistribution = Object.entries(riskCounts).map(([level, count]) => ({
        level,
        count,
      }));

      return {
        total: totalResult.count,
        completed: completedResult.count,
        inProgress: totalResult.count - completedResult.count,
        riskDistribution: riskDistribution,
      };
    }),

  /**
   * Obtener resultados agregados por departamento
   */
  getResultsByDepartment: protectedProcedure
    .input(z.object({
      periodId: z.number().optional(),
      surveyType: z.enum(["guia_i", "guia_ii", "guia_iii"]).optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      let conditions = [sql`${surveyResponses.completedAt} IS NOT NULL`];
      if (input.periodId) {
        conditions.push(eq(surveyResponses.periodId, input.periodId));
      }
      if (input.surveyType) {
        const [survey] = await db
          .select({ id: surveys.id })
          .from(surveys)
          .where(eq(surveys.type, input.surveyType))
          .limit(1);
        if (survey) {
          conditions.push(eq(surveyResponses.surveyId, survey.id));
        }
      }

      const responsesWithDept = await db
        .select({
          departamento: users.departamento,
          results: surveyResponses.results,
        })
        .from(surveyResponses)
        .innerJoin(users, eq(surveyResponses.userId, users.id))
        .where(and(...conditions));

      // Agrupar y procesar resultados por departamento
      const deptStats: Record<string, { total: number; totalScore: number; highRisk: number }> = {};
      responsesWithDept.forEach(response => {
        const dept = response.departamento || "Sin departamento";
        if (!deptStats[dept]) {
          deptStats[dept] = { total: 0, totalScore: 0, highRisk: 0 };
        }
        deptStats[dept].total++;
        
        if (response.results) {
          try {
            const results = JSON.parse(response.results);
            deptStats[dept].totalScore += results.totalScore || 0;
            if (results.riskLevel === "Alto" || results.riskLevel === "Muy Alto") {
              deptStats[dept].highRisk++;
            }
          } catch (e) {
            // Ignorar errores de parsing
          }
        }
      });

      const results = Object.entries(deptStats).map(([departamento, stats]) => ({
        departamento,
        totalResponses: stats.total,
        avgScore: Math.round((stats.totalScore / stats.total) * 10) / 10,
        highRiskCount: stats.highRisk,
        highRiskPercentage: Math.round((stats.highRisk / stats.total) * 100),
      }));

      return results;
    }),

  /**
   * Comparar resultados entre periodos
   */
  comparePeriods: protectedProcedure
    .input(z.object({
      periodIds: z.array(z.number()).min(2).max(5),
      surveyType: z.enum(["guia_i", "guia_ii", "guia_iii"]),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Obtener información de los periodos
      const periods = await db
        .select({
          id: surveyPeriods.id,
          name: surveyPeriods.name,
          startDate: surveyPeriods.startDate,
          endDate: surveyPeriods.endDate,
        })
        .from(surveyPeriods)
        .where(sql`${surveyPeriods.id} IN (${sql.join(input.periodIds, sql`, `)})`);

      // Obtener ID de la encuesta
      const [survey] = await db
        .select({ id: surveys.id })
        .from(surveys)
        .where(eq(surveys.type, input.surveyType))
        .limit(1);

      if (!survey) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Encuesta no encontrada" });
      }

      // Obtener estadísticas por periodo
      const periodStats = await Promise.all(
        input.periodIds.map(async (periodId) => {
          const responsesData = await db
            .select({
              completedAt: surveyResponses.completedAt,
              results: surveyResponses.results,
            })
            .from(surveyResponses)
            .where(and(
              eq(surveyResponses.periodId, periodId),
              eq(surveyResponses.surveyId, survey.id)
            ));

          let totalResponses = responsesData.length;
          let completedResponses = 0;
          let totalScore = 0;
          let highRisk = 0;

          responsesData.forEach(response => {
            if (response.completedAt) {
              completedResponses++;
              if (response.results) {
                try {
                  const results = JSON.parse(response.results);
                  totalScore += results.totalScore || 0;
                  if (results.riskLevel === "Alto" || results.riskLevel === "Muy Alto") {
                    highRisk++;
                  }
                } catch (e) {
                  // Ignorar errores de parsing
                }
              }
            }
          });

          const avgScore = completedResponses > 0 ? totalScore / completedResponses : 0;

          const period = periods.find(p => p.id === periodId);

          return {
            periodId,
            periodName: period?.name || `Periodo ${periodId}`,
            startDate: period?.startDate,
            endDate: period?.endDate,
            totalResponses,
            completedResponses,
            completionRate: totalResponses > 0 
              ? Math.round((completedResponses / totalResponses) * 100) 
              : 0,
            avgScore: Math.round(avgScore * 10) / 10,
            highRiskCount: highRisk,
            highRiskPercentage: completedResponses > 0 
              ? Math.round((highRisk / completedResponses) * 100) 
              : 0,
          };
        })
      );

      return {
        periods,
        stats: periodStats,
      };
    }),

  /**
   * Obtener tendencias históricas
   */
  getTrends: protectedProcedure
    .input(z.object({
      surveyType: z.enum(["guia_i", "guia_ii", "guia_iii"]),
      limit: z.number().default(12), // Últimos 12 periodos
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Obtener ID de la encuesta
      const [survey] = await db
        .select({ id: surveys.id })
        .from(surveys)
        .where(eq(surveys.type, input.surveyType))
        .limit(1);

      if (!survey) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Encuesta no encontrada" });
      }

      // Obtener periodos cerrados ordenados por fecha
      const periods = await db
        .select({
          id: surveyPeriods.id,
          name: surveyPeriods.name,
          startDate: surveyPeriods.startDate,
          endDate: surveyPeriods.endDate,
        })
        .from(surveyPeriods)
        .where(and(
          eq(surveyPeriods.surveyType, input.surveyType),
          eq(surveyPeriods.status, "closed")
        ))
        .orderBy(desc(surveyPeriods.endDate))
        .limit(input.limit);

      // Obtener estadísticas por periodo
      const trends = await Promise.all(
        periods.map(async (period) => {
          const completedData = await db
            .select({
              results: surveyResponses.results,
            })
            .from(surveyResponses)
            .where(and(
              eq(surveyResponses.periodId, period.id),
              eq(surveyResponses.surveyId, survey.id),
              sql`${surveyResponses.completedAt} IS NOT NULL`
            ));

          let completedResponses = completedData.length;
          let totalScore = 0;
          let highRisk = 0;

          completedData.forEach(response => {
            if (response.results) {
              try {
                const results = JSON.parse(response.results);
                totalScore += results.totalScore || 0;
                if (results.riskLevel === "Alto" || results.riskLevel === "Muy Alto") {
                  highRisk++;
                }
              } catch (e) {
                // Ignorar errores de parsing
              }
            }
          });

          const avgScore = completedResponses > 0 ? totalScore / completedResponses : 0;

          return {
            periodId: period.id,
            periodName: period.name,
            startDate: period.startDate,
            endDate: period.endDate,
            completedResponses,
            avgScore: Math.round(avgScore * 10) / 10,
            highRiskPercentage: completedResponses > 0 
              ? Math.round((highRisk / completedResponses) * 100) 
              : 0,
          };
        })
      );

      return trends.reverse(); // Orden cronológico
    }),

  /**
   * Generar recomendaciones automáticas basadas en resultados
   */
  getRecommendations: protectedProcedure
    .input(z.object({
      periodId: z.number(),
      surveyType: z.enum(["guia_i", "guia_ii", "guia_iii"]),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Obtener ID de la encuesta
      const [survey] = await db
        .select({ id: surveys.id })
        .from(surveys)
        .where(eq(surveys.type, input.surveyType))
        .limit(1);

      if (!survey) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Encuesta no encontrada" });
      }

      // Obtener estadísticas del periodo
      const completedData = await db
        .select({
          results: surveyResponses.results,
        })
        .from(surveyResponses)
        .where(and(
          eq(surveyResponses.periodId, input.periodId),
          eq(surveyResponses.surveyId, survey.id),
          sql`${surveyResponses.completedAt} IS NOT NULL`
        ));

      let totalCompleted = completedData.length;
      let totalScore = 0;
      let highRisk = 0;
      let mediumRisk = 0;

      completedData.forEach(response => {
        if (response.results) {
          try {
            const results = JSON.parse(response.results);
            totalScore += results.totalScore || 0;
            if (results.riskLevel === "Alto" || results.riskLevel === "Muy Alto") {
              highRisk++;
            } else if (results.riskLevel === "Medio") {
              mediumRisk++;
            }
          } catch (e) {
            // Ignorar errores de parsing
          }
        }
      });

      const avgScore = totalCompleted > 0 ? totalScore / totalCompleted : 0;

      const highRiskPercentage = totalCompleted > 0 
        ? (highRisk / totalCompleted) * 100 
        : 0;

      const mediumRiskPercentage = totalCompleted > 0 
        ? (mediumRisk / totalCompleted) * 100 
        : 0;

      // Generar recomendaciones basadas en los resultados
      const recommendations = [];

      if (highRiskPercentage > 30) {
        recommendations.push({
          priority: "Alta",
          category: "Intervención Urgente",
          recommendation: "Se detectó un alto porcentaje de trabajadores en riesgo alto/muy alto. Se recomienda implementar acciones correctivas inmediatas y realizar evaluaciones individuales.",
          actions: [
            "Realizar entrevistas individuales con trabajadores en riesgo alto",
            "Implementar programa de apoyo psicológico",
            "Revisar cargas de trabajo y redistribuir responsabilidades",
            "Capacitar a líderes en gestión del estrés laboral",
          ],
        });
      } else if (highRiskPercentage > 15) {
        recommendations.push({
          priority: "Media",
          category: "Atención Preventiva",
          recommendation: "Se detectaron trabajadores en riesgo alto. Se recomienda implementar medidas preventivas y dar seguimiento cercano.",
          actions: [
            "Implementar talleres de manejo del estrés",
            "Mejorar canales de comunicación interna",
            "Revisar políticas de trabajo flexible",
          ],
        });
      }

      if (mediumRiskPercentage > 40) {
        recommendations.push({
          priority: "Media",
          category: "Mejora Continua",
          recommendation: "Un porcentaje significativo de trabajadores presenta riesgo medio. Se recomienda implementar acciones de mejora del ambiente laboral.",
          actions: [
            "Realizar actividades de integración y team building",
            "Mejorar programas de reconocimiento",
            "Implementar encuestas de clima laboral periódicas",
          ],
        });
      }

      if (avgScore > 70) {
        recommendations.push({
          priority: "Baja",
          category: "Mantenimiento",
          recommendation: "Los resultados generales son favorables. Se recomienda mantener las prácticas actuales y continuar con el monitoreo periódico.",
          actions: [
            "Mantener programas de bienestar actuales",
            "Continuar con evaluaciones periódicas",
            "Documentar buenas prácticas para replicar",
          ],
        });
      }

      return {
        periodId: input.periodId,
        surveyType: input.surveyType,
        stats: {
          totalCompleted,
          avgScore: Math.round(avgScore * 10) / 10,
          highRiskPercentage: Math.round(highRiskPercentage),
          mediumRiskPercentage: Math.round(mediumRiskPercentage),
        },
        recommendations,
      };
    }),
});
