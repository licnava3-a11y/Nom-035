import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { industrySectors, sectorBenchmarks, users, workplaceViolenceCases, trainingEvaluations, surveyResults } from "../../drizzle/schema";
import { eq, sql } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

export const benchmarkingRouter = router({
  // Listar sectores disponibles
  listSectors: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");
    const sectors = await db.select().from(industrySectors);
    return sectors;
  }),

  // Obtener benchmarks de un sector específico
  getSectorBenchmarks: protectedProcedure
    .input(z.object({ sectorId: z.number() }))
    .query(async ({ input }: { input: { sectorId: number } }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");
      const benchmarks = await db
        .select()
        .from(sectorBenchmarks)
        .where(eq(sectorBenchmarks.sectorId, input.sectorId));
      
      return benchmarks;
    }),

  // Calcular métricas organizacionales y compararlas con sector
  getComparison: protectedProcedure
    .input(z.object({ sectorId: z.number() }))
    .query(async ({ input }: { input: { sectorId: number } }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      // 1. Obtener benchmarks del sector
      const benchmarks = await db
        .select()
        .from(sectorBenchmarks)
        .where(eq(sectorBenchmarks.sectorId, input.sectorId));

      const benchmarkMap: Record<string, number> = {};
      benchmarks.forEach((b: any) => {
        benchmarkMap[b.metricName] = parseFloat(b.metricValue);
      });

      // 2. Calcular métricas organizacionales
      const totalEmployees = await db.select({ count: sql<number>`COUNT(*)` }).from(users);
      const employeeCount = totalEmployees[0]?.count || 1;

      // Casos por 100 empleados
      const totalCases = await db.select({ count: sql<number>`COUNT(*)` }).from(workplaceViolenceCases);
      const caseCount = totalCases[0]?.count || 0;
      const casesPerHundred = (caseCount / employeeCount) * 100;

      // Porcentaje de alto riesgo
      const highRiskCount = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(surveyResults)
        .where(sql`${surveyResults.riskLevel} = 'very_high' OR ${surveyResults.riskLevel} = 'high'`);
      const highRisk = highRiskCount[0]?.count || 0;
      const totalSurveys = await db.select({ count: sql<number>`COUNT(*)` }).from(surveyResults);
      const surveyCount = totalSurveys[0]?.count || 1;
      const highRiskPercentage = (highRisk / surveyCount) * 100;

      // Días promedio de resolución
      const avgResolution = await db
        .select({
          avg: sql<number>`AVG(DATEDIFF(${workplaceViolenceCases.updatedAt}, ${workplaceViolenceCases.createdAt}))`,
        })
        .from(workplaceViolenceCases)
        .where(sql`${workplaceViolenceCases.status} = 'closed'`);
      const avgResolutionDays = avgResolution[0]?.avg || 0;

      // Satisfacción de capacitaciones
      const avgSatisfaction = await db
        .select({
          avg: sql<number>`AVG((${trainingEvaluations.instructorKnowledge} + ${trainingEvaluations.contentRelevance} + ${trainingEvaluations.practicalApplication}) / 3)`,
        })
        .from(trainingEvaluations);
      const trainingSatisfaction = avgSatisfaction[0]?.avg || 0;

      // Tasa de burnout (aproximado desde riesgo alto)
      const burnoutRate = highRiskPercentage; // Simplificación

      // Tasa de rotación (no tenemos datos, usar 0 o calcular desde otro lado)
      const turnoverRate = 0; // Placeholder

      // 3. Comparar con benchmarks
      const comparisons = [
        {
          metric: "Casos por 100 empleados",
          orgValue: parseFloat(casesPerHundred.toFixed(2)),
          sectorValue: benchmarkMap["avg_cases_per_100_employees"] || 0,
          unit: "casos",
          gap: parseFloat((casesPerHundred - (benchmarkMap["avg_cases_per_100_employees"] || 0)).toFixed(2)),
          status: casesPerHundred <= (benchmarkMap["avg_cases_per_100_employees"] || 0) ? "better" : "worse",
        },
        {
          metric: "Porcentaje de alto riesgo",
          orgValue: parseFloat(highRiskPercentage.toFixed(2)),
          sectorValue: benchmarkMap["avg_high_risk_percentage"] || 0,
          unit: "porcentaje",
          gap: parseFloat((highRiskPercentage - (benchmarkMap["avg_high_risk_percentage"] || 0)).toFixed(2)),
          status: highRiskPercentage <= (benchmarkMap["avg_high_risk_percentage"] || 0) ? "better" : "worse",
        },
        {
          metric: "Días promedio de resolución",
          orgValue: parseFloat(avgResolutionDays.toFixed(2)),
          sectorValue: benchmarkMap["avg_resolution_days"] || 0,
          unit: "días",
          gap: parseFloat((avgResolutionDays - (benchmarkMap["avg_resolution_days"] || 0)).toFixed(2)),
          status: avgResolutionDays <= (benchmarkMap["avg_resolution_days"] || 0) ? "better" : "worse",
        },
        {
          metric: "Satisfacción de capacitaciones",
          orgValue: parseFloat(trainingSatisfaction.toFixed(2)),
          sectorValue: benchmarkMap["avg_training_satisfaction"] || 0,
          unit: "escala 1-5",
          gap: parseFloat((trainingSatisfaction - (benchmarkMap["avg_training_satisfaction"] || 0)).toFixed(2)),
          status: trainingSatisfaction >= (benchmarkMap["avg_training_satisfaction"] || 0) ? "better" : "worse",
        },
        {
          metric: "Tasa de burnout",
          orgValue: parseFloat(burnoutRate.toFixed(2)),
          sectorValue: benchmarkMap["avg_burnout_rate"] || 0,
          unit: "porcentaje",
          gap: parseFloat((burnoutRate - (benchmarkMap["avg_burnout_rate"] || 0)).toFixed(2)),
          status: burnoutRate <= (benchmarkMap["avg_burnout_rate"] || 0) ? "better" : "worse",
        },
        {
          metric: "Tasa de rotación",
          orgValue: parseFloat(turnoverRate.toFixed(2)),
          sectorValue: benchmarkMap["avg_turnover_rate"] || 0,
          unit: "porcentaje",
          gap: parseFloat((turnoverRate - (benchmarkMap["avg_turnover_rate"] || 0)).toFixed(2)),
          status: turnoverRate <= (benchmarkMap["avg_turnover_rate"] || 0) ? "better" : "worse",
        },
      ];

      return {
        sectorId: input.sectorId,
        comparisons,
      };
    }),

  // Generar recomendaciones basadas en brechas con IA
  generateRecommendations: protectedProcedure
    .input(z.object({ sectorId: z.number() }))
    .mutation(async ({ input }: { input: { sectorId: number } }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      // Obtener comparación (calcular directamente)
      const benchmarks = await db
        .select()
        .from(sectorBenchmarks)
        .where(eq(sectorBenchmarks.sectorId, input.sectorId));

      const benchmarkMap: Record<string, number> = {};
      benchmarks.forEach((b: any) => {
        benchmarkMap[b.metricName] = parseFloat(b.metricValue);
      });

      const totalEmployees = await db.select({ count: sql<number>`COUNT(*)` }).from(users);
      const employeeCount = totalEmployees[0]?.count || 1;
      const totalCases = await db.select({ count: sql<number>`COUNT(*)` }).from(workplaceViolenceCases);
      const caseCount = totalCases[0]?.count || 0;
      const casesPerHundred = (caseCount / employeeCount) * 100;

      const comparison: any = {
        comparisons: [
          {
            metric: "Casos por 100 empleados",
            orgValue: parseFloat(casesPerHundred.toFixed(2)),
            sectorValue: benchmarkMap["avg_cases_per_100_employees"] || 0,
            unit: "casos",
            gap: parseFloat((casesPerHundred - (benchmarkMap["avg_cases_per_100_employees"] || 0)).toFixed(2)),
            status: casesPerHundred <= (benchmarkMap["avg_cases_per_100_employees"] || 0) ? "better" : "worse",
          },
        ],
      };

      // Identificar brechas significativas (>10% o >5 unidades)
      const significantGaps: any[] = comparison.comparisons.filter((c: any) => {
        if (c.unit === "porcentaje") {
          return Math.abs(c.gap) > 10;
        } else if (c.unit === "días") {
          return Math.abs(c.gap) > 5;
        } else if (c.unit === "casos") {
          return Math.abs(c.gap) > 2;
        } else {
          return Math.abs(c.gap) > 0.5;
        }
      });

      // Generar recomendaciones con IA
      const prompt = `Eres un experto en riesgos psicosociales y cumplimiento NOM-035 STPS. Analiza las siguientes brechas identificadas en la organización comparadas con el promedio del sector:

${significantGaps.map((g: any) => `- ${g.metric}: Organización ${g.orgValue} ${g.unit}, Sector ${g.sectorValue} ${g.unit}, Brecha ${g.gap} ${g.unit} (${g.status === "worse" ? "peor que sector" : "mejor que sector"})`).join("\n")}

Genera 3-5 recomendaciones específicas y accionables para cerrar las brechas identificadas, priorizando las áreas donde la organización está por debajo del estándar sectorial.`;

      const response = await invokeLLM({
        messages: [
          { role: "system", content: "Eres un experto en riesgos psicosociales y cumplimiento NOM-035 STPS." },
          { role: "user", content: prompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "recommendations",
            strict: true,
            schema: {
              type: "object",
              properties: {
                recommendations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string", description: "Título de la recomendación" },
                      description: { type: "string", description: "Descripción detallada de la acción recomendada" },
                      priority: { type: "string", enum: ["high", "medium", "low"], description: "Prioridad de implementación" },
                      targetMetric: { type: "string", description: "Métrica objetivo que mejorará" },
                    },
                    required: ["title", "description", "priority", "targetMetric"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["recommendations"],
              additionalProperties: false,
            },
          },
        },
      });

      const content = typeof response.choices[0]?.message?.content === 'string' ? response.choices[0].message.content : "{}";
      const recommendations = JSON.parse(content);

      return {
        significantGaps,
        recommendations: recommendations.recommendations || [],
      };
    }),

  // Dashboard de benchmarking
  getDashboard: protectedProcedure
    .input(z.object({ sectorId: z.number() }))
    .query(async ({ input }: { input: { sectorId: number } }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      // Obtener nombre del sector
      const sector = await db.select().from(industrySectors).where(eq(industrySectors.id, input.sectorId)).limit(1);
      const sectorName = sector[0]?.name || "Desconocido";

      // Obtener comparación (calcular directamente)
      const benchmarks = await db
        .select()
        .from(sectorBenchmarks)
        .where(eq(sectorBenchmarks.sectorId, input.sectorId));

      const benchmarkMap: Record<string, number> = {};
      benchmarks.forEach((b: any) => {
        benchmarkMap[b.metricName] = parseFloat(b.metricValue);
      });

      const totalEmployees = await db.select({ count: sql<number>`COUNT(*)` }).from(users);
      const employeeCount = totalEmployees[0]?.count || 1;
      const totalCases = await db.select({ count: sql<number>`COUNT(*)` }).from(workplaceViolenceCases);
      const caseCount = totalCases[0]?.count || 0;
      const casesPerHundred = (caseCount / employeeCount) * 100;

      const comparison: any = {
        comparisons: [
          {
            metric: "Casos por 100 empleados",
            orgValue: parseFloat(casesPerHundred.toFixed(2)),
            sectorValue: benchmarkMap["avg_cases_per_100_employees"] || 0,
            unit: "casos",
            gap: parseFloat((casesPerHundred - (benchmarkMap["avg_cases_per_100_employees"] || 0)).toFixed(2)),
            status: casesPerHundred <= (benchmarkMap["avg_cases_per_100_employees"] || 0) ? "better" : "worse",
          },
        ],
      };

      // Calcular resumen
      const betterCount: number = comparison.comparisons.filter((c: any) => c.status === "better").length;
      const worseCount: number = comparison.comparisons.filter((c: any) => c.status === "worse").length;
      const totalMetrics: number = comparison.comparisons.length;

      return {
        sectorId: input.sectorId,
        sectorName,
        totalMetrics,
        betterCount,
        worseCount,
        performanceScore: parseFloat(((betterCount / totalMetrics) * 100).toFixed(2)),
        comparisons: comparison.comparisons,
      };
    }),
});
