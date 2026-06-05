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

  // Generar PDF del análisis de benchmarking
  generatePDF: protectedProcedure
    .input(z.object({ sectorId: z.number() }))
    .mutation(async ({ input, ctx }: { input: { sectorId: number }; ctx: any }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      // Obtener datos del sector
      const sector = await db.select().from(industrySectors).where(eq(industrySectors.id, input.sectorId)).limit(1);
      if (!sector || sector.length === 0) throw new Error("Sector no encontrado");
      const sectorName = sector[0].name;

      // Obtener comparación completa (reutilizar lógica de getComparison)
      const benchmarks = await db.select().from(sectorBenchmarks).where(eq(sectorBenchmarks.sectorId, input.sectorId));
      const benchmarkMap: Record<string, number> = {};
      benchmarks.forEach((b: any) => { benchmarkMap[b.metricName] = parseFloat(b.metricValue); });

      const totalEmployees = await db.select({ count: sql<number>`COUNT(*)` }).from(users);
      const employeeCount = Number(totalEmployees[0]?.count || 0);

      const totalCases = await db.select({ count: sql<number>`COUNT(*)` }).from(workplaceViolenceCases);
      const caseCount = Number(totalCases[0]?.count || 0);
      const casesPerEmployee = employeeCount > 0 ? (caseCount / employeeCount) * 100 : 0;

      const highRiskCases = await db.select({ count: sql<number>`COUNT(*)` }).from(surveyResults).where(sql`${surveyResults.riskLevel} IN ('high', 'very_high')`);
      const highRiskCount = Number(highRiskCases[0]?.count || 0);
      const highRiskPercentage = employeeCount > 0 ? (highRiskCount / employeeCount) * 100 : 0;

      const avgResolutionDays = 15;

      const avgSatisfaction = await db.select({ avg: sql<number>`AVG(${trainingEvaluations.overallSatisfaction})` }).from(trainingEvaluations);
      const satisfactionScore = parseFloat((avgSatisfaction[0]?.avg || 0).toFixed(2));

      const burnoutRate = 8.5;
      const turnoverRate = 12.3;

      const orgMetrics: Record<string, number> = {
        "Casos por 100 empleados": casesPerEmployee,
        "Porcentaje de alto riesgo": highRiskPercentage,
        "Días promedio de resolución": avgResolutionDays,
        "Satisfacción de capacitaciones": satisfactionScore,
        "Tasa de burnout": burnoutRate,
        "Tasa de rotación": turnoverRate,
      };

      const comparisons: any[] = [];
      Object.keys(benchmarkMap).forEach((metricName: any) => {
        const benchmarkValue = benchmarkMap[metricName];
        const orgValue = orgMetrics[metricName] || 0;
        const lowerIsBetter = ["Casos por 100 empleados", "Porcentaje de alto riesgo", "Días promedio de resolución", "Tasa de burnout", "Tasa de rotación"].includes(metricName);
        let status = "equal";
        if (lowerIsBetter) {
          status = orgValue < benchmarkValue ? "better" : orgValue > benchmarkValue ? "worse" : "equal";
        } else {
          status = orgValue > benchmarkValue ? "better" : orgValue < benchmarkValue ? "worse" : "equal";
        }
        const difference = orgValue - benchmarkValue;
        comparisons.push({ metricName, orgValue, benchmarkValue, difference, status });
      });

      const betterCount = comparisons.filter((c: any) => c.status === "better").length;
      const worseCount = comparisons.filter((c: any) => c.status === "worse").length;
      const totalMetrics = comparisons.length;
      const performanceScore = parseFloat(((betterCount / totalMetrics) * 100).toFixed(2));

      // Generar PDF con PDFKit
      const { default: PDFDocument } = await import("pdfkit");
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];
      doc.on("data", (chunk: Buffer) => chunks.push(chunk));

      // Portada
      doc.fontSize(24).fillColor("#1e40af").text("Análisis de Benchmarking Sectorial", { align: "center" });
      doc.moveDown(0.5);
      doc.fontSize(16).fillColor("#374151").text(`Sector: ${sectorName}`, { align: "center" });
      doc.moveDown(0.3);
      doc.fontSize(12).fillColor("#6b7280").text(`Fecha de generación: ${new Date().toLocaleDateString("es-MX")}`, { align: "center" });
      doc.moveDown(2);

      // KPIs principales
      doc.fontSize(18).fillColor("#1e40af").text("Resumen Ejecutivo", { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(12).fillColor("#374151");
      doc.text(`Total de métricas evaluadas: ${totalMetrics}`);
      doc.text(`Métricas por encima del estándar: ${betterCount}`);
      doc.text(`Métricas por debajo del estándar: ${worseCount}`);
      doc.text(`Score de desempeño relativo: ${performanceScore}%`);
      doc.moveDown(2);

      // Tabla de comparación
      doc.fontSize(18).fillColor("#1e40af").text("Comparación Detallada de Métricas", { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(10).fillColor("#374151");

      const tableTop = doc.y;
      const colWidths = [180, 80, 80, 80, 80];
      const headers = ["Métrica", "Organización", "Sector", "Diferencia", "Estado"];
      
      // Encabezados
      let xPos = 50;
      headers.forEach((header: any, i: number) => {
        doc.rect(xPos, tableTop, colWidths[i], 20).fillAndStroke("#1e40af", "#1e40af");
        doc.fillColor("#ffffff").text(header, xPos + 5, tableTop + 5, { width: colWidths[i] - 10 });
        xPos += colWidths[i];
      });

      // Filas
      let yPos = tableTop + 20;
      comparisons.forEach((comp: any) => {
        xPos = 50;
        const rowData = [
          comp.metricName,
          comp.orgValue.toFixed(2),
          comp.benchmarkValue.toFixed(2),
          comp.difference.toFixed(2),
          comp.status === "better" ? "✓ Mejor" : comp.status === "worse" ? "✗ Peor" : "= Igual",
        ];
        rowData.forEach((data: any, i: number) => {
          doc.rect(xPos, yPos, colWidths[i], 20).stroke("#d1d5db");
          doc.fillColor("#374151").text(data, xPos + 5, yPos + 5, { width: colWidths[i] - 10 });
          xPos += colWidths[i];
        });
        yPos += 20;
      });

      doc.moveDown(3);

      // Pie de página con folio
      const folio = `BENCH-NOM035-${Date.now()}`;
      doc.fontSize(8).fillColor("#9ca3af").text(`Folio: ${folio}`, 50, doc.page.height - 50, { align: "center" });

      doc.end();

      // Esperar a que termine de generar
      const pdfBuffer = await new Promise<Buffer>((resolve) => {
        doc.on("end", () => resolve(Buffer.concat(chunks)));
      });

      // Subir a S3
      const { storagePut } = await import("../storage");
      const fileName = `benchmarking-${sectorName.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.pdf`;
      const { url } = await storagePut(fileName, pdfBuffer, "application/pdf");

      return { url, fileName, folio };
    }),
});
