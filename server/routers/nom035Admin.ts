import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import {
  surveyResponses,
  surveyPeriods,
  surveys,
  users,
  surveyQuestions,
  surveyAnswers,
} from "../../drizzle/schema";
import { eq, and, sql, gte, lte, desc } from "drizzle-orm";

export const nom035AdminRouter = router({
  /**
   * Obtener estadísticas generales de encuestas NOM-035
   */
  getStats: protectedProcedure
    .input(
      z.object({
        periodId: z.number().optional(),
        surveyType: z.enum(["guia_i", "guia_ii", "guia_iii"]).optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

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

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;

      // Total de respuestas
      const [totalResult] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(surveyResponses)
        .where(whereClause);

      // Respuestas completadas
      const [completedResult] = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(surveyResponses)
        .where(
          and(whereClause, sql`${surveyResponses.completedAt} IS NOT NULL`)
        );

      // Distribución por nivel de riesgo (extraer del JSON results)
      const completedResponses = await db
        .select({
          results: surveyResponses.results,
        })
        .from(surveyResponses)
        .where(
          and(whereClause, sql`${surveyResponses.completedAt} IS NOT NULL`)
        );

      // Procesar resultados para obtener distribución de riesgo
      // Solo incluir niveles oficiales de la NOM-035-STPS-2018
      const validRiskLevels = ["Nulo", "Bajo", "Medio", "Alto", "Muy Alto"];
      const riskCounts: Record<string, number> = {};
      completedResponses.forEach(response => {
        if (response.results) {
          try {
            const results = JSON.parse(response.results);
            const riskLevel = results.riskLevel;
            // Solo contar si el nivel de riesgo es válido según NOM-035
            if (riskLevel && validRiskLevels.includes(riskLevel)) {
              riskCounts[riskLevel] = (riskCounts[riskLevel] || 0) + 1;
            }
          } catch (e) {
            // Ignorar respuestas con JSON inválido
          }
        }
      });

      const riskDistribution = Object.entries(riskCounts).map(
        ([level, count]: [string, any]) => ({
          level,
          count,
        })
      );

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
    .input(
      z.object({
        periodId: z.number().optional(),
        surveyType: z.enum(["guia_i", "guia_ii", "guia_iii"]).optional(),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

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
      const deptStats: Record<
        string,
        { total: number; totalScore: number; highRisk: number }
      > = {};
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
            if (
              results.riskLevel === "Alto" ||
              results.riskLevel === "Muy Alto"
            ) {
              deptStats[dept].highRisk++;
            }
          } catch (e) {
            // Ignorar errores de parsing
          }
        }
      });

      const results = Object.entries(deptStats).map(
        ([departamento, stats]: [string, any]) => ({
          departamento,
          totalResponses: stats.total,
          avgScore: Math.round((stats.totalScore / stats.total) * 10) / 10,
          highRiskCount: stats.highRisk,
          highRiskPercentage: Math.round((stats.highRisk / stats.total) * 100),
        })
      );

      return results;
    }),

  /**
   * Comparar resultados entre periodos
   */
  comparePeriods: protectedProcedure
    .input(
      z.object({
        periodIds: z.array(z.number()).min(2).max(5),
        surveyType: z.enum(["guia_i", "guia_ii", "guia_iii"]),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Obtener información de los periodos
      const periods = await db
        .select({
          id: surveyPeriods.id,
          name: surveyPeriods.name,
          startDate: surveyPeriods.startDate,
          endDate: surveyPeriods.endDate,
        })
        .from(surveyPeriods)
        .where(
          sql`${surveyPeriods.id} IN (${sql.join(input.periodIds, sql`, `)})`
        );

      // Obtener ID de la encuesta
      const [survey] = await db
        .select({ id: surveys.id })
        .from(surveys)
        .where(eq(surveys.type, input.surveyType))
        .limit(1);

      if (!survey) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Encuesta no encontrada",
        });
      }

      // Obtener estadísticas por periodo
      const periodStats = await Promise.all(
        input.periodIds.map(async periodId => {
          const responsesData = await db
            .select({
              completedAt: surveyResponses.completedAt,
              results: surveyResponses.results,
            })
            .from(surveyResponses)
            .where(
              and(
                eq(surveyResponses.periodId, periodId),
                eq(surveyResponses.surveyId, survey.id)
              )
            );

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
                  if (
                    results.riskLevel === "Alto" ||
                    results.riskLevel === "Muy Alto"
                  ) {
                    highRisk++;
                  }
                } catch (e) {
                  // Ignorar errores de parsing
                }
              }
            }
          });

          const avgScore =
            completedResponses > 0 ? totalScore / completedResponses : 0;

          const period = periods.find(p => p.id === periodId);

          return {
            periodId,
            periodName: period?.name || `Periodo ${periodId}`,
            startDate: period?.startDate,
            endDate: period?.endDate,
            totalResponses,
            completedResponses,
            completionRate:
              totalResponses > 0
                ? Math.round((completedResponses / totalResponses) * 100)
                : 0,
            avgScore: Math.round(avgScore * 10) / 10,
            highRiskCount: highRisk,
            highRiskPercentage:
              completedResponses > 0
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
    .input(
      z.object({
        surveyType: z.enum(["guia_i", "guia_ii", "guia_iii"]),
        limit: z.number().default(12), // Últimos 12 periodos
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Obtener ID de la encuesta
      const [survey] = await db
        .select({ id: surveys.id })
        .from(surveys)
        .where(eq(surveys.type, input.surveyType))
        .limit(1);

      if (!survey) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Encuesta no encontrada",
        });
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
        .where(
          and(
            eq(surveyPeriods.surveyType, input.surveyType),
            eq(surveyPeriods.status, "closed")
          )
        )
        .orderBy(desc(surveyPeriods.endDate))
        .limit(input.limit);

      // Obtener estadísticas por periodo
      const trends = await Promise.all(
        periods.map(async period => {
          const completedData = await db
            .select({
              results: surveyResponses.results,
            })
            .from(surveyResponses)
            .where(
              and(
                eq(surveyResponses.periodId, period.id),
                eq(surveyResponses.surveyId, survey.id),
                sql`${surveyResponses.completedAt} IS NOT NULL`
              )
            );

          let completedResponses = completedData.length;
          let totalScore = 0;
          let highRisk = 0;

          completedData.forEach(response => {
            if (response.results) {
              try {
                const results = JSON.parse(response.results);
                totalScore += results.totalScore || 0;
                if (
                  results.riskLevel === "Alto" ||
                  results.riskLevel === "Muy Alto"
                ) {
                  highRisk++;
                }
              } catch (e) {
                // Ignorar errores de parsing
              }
            }
          });

          const avgScore =
            completedResponses > 0 ? totalScore / completedResponses : 0;

          return {
            periodId: period.id,
            periodName: period.name,
            startDate: period.startDate,
            endDate: period.endDate,
            completedResponses,
            avgScore: Math.round(avgScore * 10) / 10,
            highRiskPercentage:
              completedResponses > 0
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
    .input(
      z.object({
        periodId: z.number(),
        surveyType: z.enum(["guia_i", "guia_ii", "guia_iii"]),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Obtener ID de la encuesta
      const [survey] = await db
        .select({ id: surveys.id })
        .from(surveys)
        .where(eq(surveys.type, input.surveyType))
        .limit(1);

      if (!survey) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Encuesta no encontrada",
        });
      }

      // Obtener estadísticas del periodo
      const completedData = await db
        .select({
          results: surveyResponses.results,
        })
        .from(surveyResponses)
        .where(
          and(
            eq(surveyResponses.periodId, input.periodId),
            eq(surveyResponses.surveyId, survey.id),
            sql`${surveyResponses.completedAt} IS NOT NULL`
          )
        );

      let totalCompleted = completedData.length;
      let totalScore = 0;
      let highRisk = 0;
      let mediumRisk = 0;

      completedData.forEach(response => {
        if (response.results) {
          try {
            const results = JSON.parse(response.results);
            totalScore += results.totalScore || 0;
            if (
              results.riskLevel === "Alto" ||
              results.riskLevel === "Muy Alto"
            ) {
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

      const highRiskPercentage =
        totalCompleted > 0 ? (highRisk / totalCompleted) * 100 : 0;

      const mediumRiskPercentage =
        totalCompleted > 0 ? (mediumRisk / totalCompleted) * 100 : 0;

      // Generar recomendaciones basadas en los resultados
      const recommendations = [];

      if (highRiskPercentage > 30) {
        recommendations.push({
          priority: "Alta",
          category: "Intervención Urgente",
          recommendation:
            "Se detectó un alto porcentaje de trabajadores en riesgo alto/muy alto. Se recomienda implementar acciones correctivas inmediatas y realizar evaluaciones individuales.",
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
          recommendation:
            "Se detectaron trabajadores en riesgo alto. Se recomienda implementar medidas preventivas y dar seguimiento cercano.",
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
          recommendation:
            "Un porcentaje significativo de trabajadores presenta riesgo medio. Se recomienda implementar acciones de mejora del ambiente laboral.",
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
          recommendation:
            "Los resultados generales son favorables. Se recomienda mantener las prácticas actuales y continuar con el monitoreo periódico.",
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

  /**
   * Exportar reporte a Excel
   */
  exportToExcel: protectedProcedure
    .input(
      z.object({
        periodId: z.number().optional(),
        surveyType: z.enum(["guia_i", "guia_ii", "guia_iii"]),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Obtener datos para el reporte
      let conditions = [];
      if (input.periodId) {
        conditions.push(eq(surveyResponses.periodId, input.periodId));
      }
      const [survey] = await db
        .select({ id: surveys.id })
        .from(surveys)
        .where(eq(surveys.type, input.surveyType))
        .limit(1);
      if (survey) {
        conditions.push(eq(surveyResponses.surveyId, survey.id));
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;
      const responses = await db
        .select()
        .from(surveyResponses)
        .where(whereClause)
        .orderBy(desc(surveyResponses.completedAt));

      // Preparar datos para Excel
      const excelData = responses.map(response => {
        let riskLevel = "N/A";
        let totalScore = 0;
        if (response.results) {
          try {
            const results = JSON.parse(response.results);
            riskLevel = results.riskLevel || "N/A";
            totalScore = results.totalScore || 0;
          } catch (e) {
            // Ignorar
          }
        }
        return {
          ID: response.id,
          "Usuario ID": response.userId || "N/A",
          CURP: response.curp || "N/A",
          "Fecha Completado": response.completedAt
            ? new Date(response.completedAt).toLocaleDateString("es-MX")
            : "En progreso",
          "Nivel de Riesgo": riskLevel,
          "Puntaje Total": totalScore,
        };
      });

      // Generar archivo Excel usando xlsx
      const XLSX = await import("xlsx");
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Resultados NOM-035");
      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      const filename = `NOM035_${input.surveyType}_${new Date().toISOString().split("T")[0]}.xlsx`;
      return {
        base64: buffer.toString("base64"),
        filename,
      };
    }),

  /**
   * Exportar reporte a PDF
   */
  exportToPDF: protectedProcedure
    .input(
      z.object({
        periodId: z.number().optional(),
        surveyType: z.enum(["guia_i", "guia_ii", "guia_iii"]),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Database not available",
        });

      // Obtener estadísticas para el reporte
      let conditions = [];
      if (input.periodId) {
        conditions.push(eq(surveyResponses.periodId, input.periodId));
      }
      const [survey] = await db
        .select({ id: surveys.id })
        .from(surveys)
        .where(eq(surveys.type, input.surveyType))
        .limit(1);
      if (survey) {
        conditions.push(eq(surveyResponses.surveyId, survey.id));
      }

      const whereClause =
        conditions.length > 0 ? and(...conditions) : undefined;
      const responses = await db
        .select()
        .from(surveyResponses)
        .where(whereClause);

      // Calcular distribución de riesgo
      const riskDistribution: Record<string, number> = {};
      responses.forEach(response => {
        if (response.results && response.completedAt) {
          try {
            const results = JSON.parse(response.results);
            const level = results.riskLevel || "N/A";
            riskDistribution[level] = (riskDistribution[level] || 0) + 1;
          } catch (e) {
            // Ignorar
          }
        }
      });

      // Generar PDF usando la librería existente
      const { generateAggregatedReport } = await import(
        "../lib/nom035-pdf-reports"
      );
      const pdfBuffer = await generateAggregatedReport({
        organizationName: "Organización",
        reportDate: new Date(),
        totalEmployees: responses.length,
        totalResponses: responses.filter(r => r.completedAt).length,
        coverage:
          responses.length > 0
            ? (responses.filter(r => r.completedAt).length / responses.length) *
              100
            : 0,
        riskDistribution,
        averageRiskByCategory: [],
        atsDetected: 0,
      });

      const filename = `NOM035_Reporte_${input.surveyType}_${new Date().toISOString().split("T")[0]}.pdf`;
      return {
        base64: pdfBuffer.toString("base64"),
        filename,
      };
    }),

  /**
   * Resultados detallados por Categoría, Dominio y Dimensión (NOM-035 extendido)
   * Fórmula: puntajeDimension = (sumaReactivos / máximoPosible) * 100
   * Niveles: Nulo (0-5), Bajo (6-40), Medio (41-60), Alto (61-85), Muy Alto (86-100)
   */
  getDetailedResults: protectedProcedure
    .input(
      z.object({
        surveyPeriodId: z.number().optional(),
        showCategoria: z.boolean().default(true),
        showDominio: z.boolean().default(true),
        showDimension: z.boolean().default(true),
        showRecomendaciones: z.boolean().default(false),
        showPlanTrabajo: z.boolean().default(false),
      })
    )
    .query(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin")
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Solo administradores",
        });
      const db = await getDb();
      if (!db)
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "BD no disponible",
        });

      function getNivelRiesgo(puntaje: number) {
        if (puntaje <= 5)
          return { nivel: "Nulo", color: "#2e7d32", labelClass: "nulo" };
        if (puntaje <= 40)
          return { nivel: "Bajo", color: "#2c7a47", labelClass: "bajo" };
        if (puntaje <= 60)
          return { nivel: "Medio", color: "#b76e0e", labelClass: "medio" };
        if (puntaje <= 85)
          return { nivel: "Alto", color: "#d95b0f", labelClass: "alto" };
        return { nivel: "Muy Alto", color: "#c62828", labelClass: "muy_alto" };
      }

      const completedResponses = await db
        .select({ id: surveyResponses.id })
        .from(surveyResponses)
        .where(
          input.surveyPeriodId
            ? and(
                eq(surveyResponses.periodId, input.surveyPeriodId),
                sql`${surveyResponses.completedAt} IS NOT NULL`
              )
            : sql`${surveyResponses.completedAt} IS NOT NULL`
        );

      if (completedResponses.length === 0) {
        return {
          totalRespuestas: 0,
          categoriaGeneral: null,
          dominios: [],
          dimensiones: [],
          requierePlanObligatorio: false,
          recomendaciones: [],
          planTrabajo: null,
        };
      }

      const responseIds = completedResponses.map(r => r.id);

      const answers = await db
        .select({
          answerValue: surveyAnswers.answerValue,
          category: surveyQuestions.category,
          domain: surveyQuestions.domain,
          dimension: surveyQuestions.dimension,
          isReverseScored: surveyQuestions.isReverseScored,
        })
        .from(surveyAnswers)
        .innerJoin(
          surveyQuestions,
          eq(surveyAnswers.questionId, surveyQuestions.id)
        )
        .where(
          sql`${surveyAnswers.responseId} IN (${sql.join(
            responseIds.map(id => sql`${id}`),
            sql`, `
          )})`
        );

      const dimMap: Record<
        string,
        {
          valores: number[];
          maxPosible: number;
          category?: string;
          domain?: string;
        }
      > = {};
      for (const ans of answers) {
        const dimKey =
          ans.dimension || ans.domain || ans.category || "Sin clasificar";
        if (!dimMap[dimKey])
          dimMap[dimKey] = {
            valores: [],
            maxPosible: 0,
            category: ans.category ?? undefined,
            domain: ans.domain ?? undefined,
          };
        const rawVal = parseInt(ans.answerValue, 10);
        const val = isNaN(rawVal) ? 0 : Math.max(0, Math.min(4, rawVal));
        const finalVal = ans.isReverseScored ? 4 - val : val;
        dimMap[dimKey].valores.push(finalVal);
        dimMap[dimKey].maxPosible += 4;
      }

      const dimensiones = Object.entries(dimMap)
        .map(([nombre, data]) => {
          const suma = data.valores.reduce((s, v) => s + v, 0);
          const puntaje =
            data.maxPosible > 0
              ? parseFloat(((suma / data.maxPosible) * 100).toFixed(2))
              : 0;
          return {
            nombre,
            puntaje,
            nivel: getNivelRiesgo(puntaje),
            category: data.category,
            domain: data.domain,
            totalReactivos: data.valores.length,
          };
        })
        .sort((a, b) => b.puntaje - a.puntaje);

      const domMap: Record<string, number[]> = {};
      for (const dim of dimensiones) {
        const domKey = dim.domain || dim.category || "Sin dominio";
        if (!domMap[domKey]) domMap[domKey] = [];
        domMap[domKey].push(dim.puntaje);
      }
      const dominios = Object.entries(domMap)
        .map(([nombre, puntajes]) => {
          const puntaje = parseFloat(
            (puntajes.reduce((s, v) => s + v, 0) / puntajes.length).toFixed(2)
          );
          return {
            nombre,
            puntaje,
            nivel: getNivelRiesgo(puntaje),
            totalDimensiones: puntajes.length,
          };
        })
        .sort((a, b) => b.puntaje - a.puntaje);

      const catPuntaje =
        dominios.length > 0
          ? parseFloat(
              (
                dominios.reduce((s, d) => s + d.puntaje, 0) / dominios.length
              ).toFixed(2)
            )
          : 0;
      const categoriaGeneral = {
        puntaje: catPuntaje,
        nivel: getNivelRiesgo(catPuntaje),
      };

      const requierePlan =
        dimensiones.some(
          d => d.nivel.nivel === "Alto" || d.nivel.nivel === "Muy Alto"
        ) ||
        dominios.some(
          d => d.nivel.nivel === "Alto" || d.nivel.nivel === "Muy Alto"
        ) ||
        categoriaGeneral.nivel.nivel === "Alto" ||
        categoriaGeneral.nivel.nivel === "Muy Alto";

      const criticas = [
        ...dimensiones.filter(d => d.puntaje > 60),
        ...dominios.filter(d => d.puntaje > 60),
      ];
      const recomendaciones: string[] = [];
      if (criticas.length > 0) {
        recomendaciones.push(
          `Áreas críticas (puntaje >60): ${criticas.map(c => c.nombre).join(", ")}`
        );
        recomendaciones.push(
          "Revisar cargas de trabajo y jornadas excesivas (Guía de Referencia III STPS)"
        );
        recomendaciones.push(
          "Establecer mecanismos de reconocimiento y liderazgo positivo"
        );
        recomendaciones.push(
          "Realizar pausas activas obligatorias cada 2 horas"
        );
        recomendaciones.push(
          "Difundir política de prevención de riesgos psicosociales (Art. 9 NOM-035)"
        );
      } else {
        recomendaciones.push(
          "Sin alertas críticas. Mantener capacitación semestral en factores psicosociales"
        );
        recomendaciones.push(
          "Fomentar canales de retroalimentación y encuestas de clima organizacional"
        );
        recomendaciones.push(
          "Monitoreo anual conforme a NOM-035 (mejora continua)"
        );
      }

      const planTrabajo = requierePlan
        ? {
            nivel1:
              "Reunión con responsables de RH y dirección. Aplicación de cuestionario complementario.",
            nivel2:
              "Talleres de liderazgo, clarificación de roles y pausas activas en jornada laboral.",
            nivel3:
              "Re-evaluación en 3 meses, bitácora de medidas correctivas.",
            comite:
              "Integrar comité de seguridad y salud en el trabajo para abordar dimensiones con puntaje >60.",
          }
        : null;

      return {
        totalRespuestas: completedResponses.length,
        categoriaGeneral: input.showCategoria ? categoriaGeneral : null,
        dominios: input.showDominio ? dominios : [],
        dimensiones: input.showDimension ? dimensiones : [],
        requierePlanObligatorio: requierePlan,
        recomendaciones: input.showRecomendaciones ? recomendaciones : [],
        planTrabajo: input.showPlanTrabajo ? planTrabajo : null,
      };
    }),
});
