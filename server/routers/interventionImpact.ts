import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { interventionImpactAnalysis, workplaceViolenceCases, departments, trainingEvaluations } from "../../drizzle/schema";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

export const interventionImpactRouter = router({
  // Listar análisis de impacto con filtros
  list: protectedProcedure
    .input(
      z.object({
        status: z.enum(["active", "completed", "archived"]).optional(),
        interventionType: z.enum(["training", "policy_change", "organizational_change", "corrective_action", "awareness_campaign", "other"]).optional(),
      })
    )
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      const conditions = [];
      if (input.status) conditions.push(eq(interventionImpactAnalysis.status, input.status));
      if (input.interventionType) conditions.push(eq(interventionImpactAnalysis.interventionType, input.interventionType));

      const analyses = await db
        .select()
        .from(interventionImpactAnalysis)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(interventionImpactAnalysis.createdAt));

      return analyses;
    }),

  // Obtener análisis por ID
  getById: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      const analysis = await db
        .select()
        .from(interventionImpactAnalysis)
        .where(eq(interventionImpactAnalysis.id, input.id))
        .limit(1);

      return analysis[0] || null;
    }),

  // Crear nuevo análisis de impacto
  create: protectedProcedure
    .input(
      z.object({
        interventionType: z.enum(["training", "policy_change", "organizational_change", "corrective_action", "awareness_campaign", "other"]),
        interventionName: z.string(),
        description: z.string().optional(),
        implementationDate: z.string(),
        targetDepartmentId: z.number().optional(),
        targetArea: z.string().optional(),
        measurementPeriodMonths: z.number().default(3),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      const [result] = await db.insert(interventionImpactAnalysis).values({
        ...input,
        implementationDate: new Date(input.implementationDate),
        createdBy: ctx.user.id,
      });

      return { id: result.insertId, success: true };
    }),

  // Calcular métricas de efectividad
  calculateMetrics: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      const analysis = await db
        .select()
        .from(interventionImpactAnalysis)
        .where(eq(interventionImpactAnalysis.id, input.id))
        .limit(1);

      if (!analysis[0]) throw new Error("Analysis not found");

      const intervention = analysis[0];
      const implementationDate = new Date(intervention.implementationDate);
      const measurementEndDate = new Date(implementationDate);
      measurementEndDate.setMonth(measurementEndDate.getMonth() + (intervention.measurementPeriodMonths || 3));

      // Calcular métricas ANTES de la intervención
      const beforeStartDate = new Date(implementationDate);
      beforeStartDate.setMonth(beforeStartDate.getMonth() - (intervention.measurementPeriodMonths || 3));

      const casesBeforeResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(workplaceViolenceCases)
        .where(
          and(
            gte(workplaceViolenceCases.createdAt, beforeStartDate),
            lte(workplaceViolenceCases.createdAt, implementationDate),
            intervention.targetDepartmentId
              ? eq(workplaceViolenceCases.complainantId, intervention.targetDepartmentId)
              : undefined
          )
        );

      const casesBeforeCount = casesBeforeResult[0]?.count || 0;

      // Calcular métricas DESPUÉS de la intervención
      const casesAfterResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(workplaceViolenceCases)
        .where(
          and(
            gte(workplaceViolenceCases.createdAt, implementationDate),
            lte(workplaceViolenceCases.createdAt, measurementEndDate),
            intervention.targetDepartmentId
              ? eq(workplaceViolenceCases.complainantId, intervention.targetDepartmentId)
              : undefined
          )
        );

      const casesAfterCount = casesAfterResult[0]?.count || 0;

      // Calcular satisfacción de capacitaciones (si aplica)
      let satisfactionBefore = null;
      let satisfactionAfter = null;

      if (intervention.interventionType === "training") {
        const evalsBefore = await db
          .select({ avg: sql<number>`AVG(${trainingEvaluations.overallSatisfaction})` })
          .from(trainingEvaluations)
          .where(
            and(
              gte(trainingEvaluations.createdAt, beforeStartDate),
              lte(trainingEvaluations.createdAt, implementationDate)
            )
          );

        const evalsAfter = await db
          .select({ avg: sql<number>`AVG(${trainingEvaluations.overallSatisfaction})` })
          .from(trainingEvaluations)
          .where(
            and(
              gte(trainingEvaluations.createdAt, implementationDate),
              lte(trainingEvaluations.createdAt, measurementEndDate)
            )
          );

        satisfactionBefore = evalsBefore[0]?.avg || null;
        satisfactionAfter = evalsAfter[0]?.avg || null;
      }

      // Calcular porcentajes de mejora
      const caseReductionPercentage =
        casesBeforeCount > 0
          ? ((casesBeforeCount - casesAfterCount) / casesBeforeCount) * 100
          : 0;

      const satisfactionImprovement =
        satisfactionBefore && satisfactionAfter
          ? satisfactionAfter - satisfactionBefore
          : 0;

      // Calcular score de efectividad (0-100)
      const effectivenessScore = Math.max(
        0,
        Math.min(
          100,
          (caseReductionPercentage * 0.6) + (satisfactionImprovement * 20 * 0.4)
        )
      );

      // Actualizar análisis con métricas calculadas
      await db
        .update(interventionImpactAnalysis)
        .set({
          casesBeforeCount,
          casesAfterCount,
          satisfactionScoreBefore: satisfactionBefore ? String(satisfactionBefore) : null,
          satisfactionScoreAfter: satisfactionAfter ? String(satisfactionAfter) : null,
          caseReductionPercentage: String(caseReductionPercentage.toFixed(2)),
          satisfactionScoreImprovement: String(satisfactionImprovement.toFixed(2)),
          effectivenessScore: String(effectivenessScore.toFixed(2)),
        })
        .where(eq(interventionImpactAnalysis.id, input.id));

      return {
        success: true,
        metrics: {
          casesBeforeCount,
          casesAfterCount,
          caseReductionPercentage: Number(caseReductionPercentage.toFixed(2)),
          satisfactionBefore,
          satisfactionAfter,
          satisfactionImprovement: Number(satisfactionImprovement.toFixed(2)),
          effectivenessScore: Number(effectivenessScore.toFixed(2)),
        },
      };
    }),

  // Generar insights con IA
  generateInsights: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      const analysis = await db
        .select()
        .from(interventionImpactAnalysis)
        .where(eq(interventionImpactAnalysis.id, input.id))
        .limit(1);

      if (!analysis[0]) throw new Error("Analysis not found");

      const intervention = analysis[0];

      // Generar insights con LLM
      const prompt = `Analiza el impacto de la siguiente intervención de prevención de riesgos psicosociales:

Tipo: ${intervention.interventionType}
Nombre: ${intervention.interventionName}
Descripción: ${intervention.description || "N/A"}

Métricas:
- Casos antes: ${intervention.casesBeforeCount}
- Casos después: ${intervention.casesAfterCount}
- Reducción: ${intervention.caseReductionPercentage}%
- Satisfacción antes: ${intervention.satisfactionScoreBefore || "N/A"}
- Satisfacción después: ${intervention.satisfactionScoreAfter || "N/A"}
- Score de efectividad: ${intervention.effectivenessScore}/100

Genera un análisis completo con factores de éxito, desafíos, recomendaciones y predicción de impacto futuro.`;

      const response = await invokeLLM({
        messages: [
          {
            role: "system",
            content:
              "Eres un experto en análisis de intervenciones de prevención de riesgos psicosociales. Genera insights accionables y basados en datos.",
          },
          { role: "user", content: prompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "intervention_insights",
            strict: true,
            schema: {
              type: "object",
              properties: {
                successFactors: {
                  type: "array",
                  items: { type: "string" },
                  description: "Factores que contribuyeron al éxito (máximo 5)",
                },
                challenges: {
                  type: "array",
                  items: { type: "string" },
                  description: "Desafíos encontrados durante la implementación (máximo 5)",
                },
                recommendations: {
                  type: "array",
                  items: { type: "string" },
                  description: "Recomendaciones para futuras intervenciones (máximo 5)",
                },
                predictedImpact: {
                  type: "string",
                  description: "Predicción del impacto a largo plazo (1-2 párrafos)",
                },
              },
              required: ["successFactors", "challenges", "recommendations", "predictedImpact"],
              additionalProperties: false,
            },
          },
        },
      });

      const content = response.choices[0].message.content;
      const insights = JSON.parse(typeof content === "string" ? content : "{}");

      // Actualizar análisis con insights
      await db
        .update(interventionImpactAnalysis)
        .set({
          aiInsights: insights,
        })
        .where(eq(interventionImpactAnalysis.id, input.id));

      return { success: true, insights };
    }),

  // Exportar a PDF
  exportPDF: protectedProcedure
    .input(
      z.object({
        status: z.enum(["active", "completed", "archived"]).optional(),
        interventionType: z.enum(["training", "policy_change", "organizational_change", "corrective_action", "awareness_campaign", "other"]).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      // Obtener datos filtrados
      const conditions = [];
      if (input.status) conditions.push(eq(interventionImpactAnalysis.status, input.status));
      if (input.interventionType) conditions.push(eq(interventionImpactAnalysis.interventionType, input.interventionType));

      const interventions = await db
        .select()
        .from(interventionImpactAnalysis)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(interventionImpactAnalysis.effectivenessScore));

      // Calcular métricas globales
      const totalInterventions = interventions.length;
      const avgEffectiveness = interventions.reduce((sum, i) => sum + Number(i.effectivenessScore || 0), 0) / totalInterventions || 0;
      const totalCasesAvoided = interventions.reduce((sum, i) => sum + (Number(i.casesBeforeCount) - Number(i.casesAfterCount)), 0);

      // Generar PDF con PDFKit
      const PDFDocument = (await import("pdfkit")).default;
      const doc = new PDFDocument({ margin: 50 });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(chunk));

      // Portada
      doc.fontSize(24).font("Helvetica-Bold").text("Reporte de Análisis de Impacto de Intervenciones", { align: "center" });
      doc.moveDown();
      doc.fontSize(12).font("Helvetica").text(`Fecha de generación: ${new Date().toLocaleDateString("es-MX")}`, { align: "center" });
      doc.text(`Generado por: ${ctx.user.name}`, { align: "center" });
      doc.moveDown(2);

      // Resumen ejecutivo
      doc.fontSize(16).font("Helvetica-Bold").text("Resumen Ejecutivo", { underline: true });
      doc.moveDown();
      doc.fontSize(12).font("Helvetica");
      doc.text(`Total de intervenciones analizadas: ${totalInterventions}`);
      doc.text(`Efectividad promedio: ${avgEffectiveness.toFixed(1)}/100`);
      doc.text(`Total de casos evitados: ${totalCasesAvoided}`);
      doc.moveDown(2);

      // Tabla de intervenciones
      doc.fontSize(16).font("Helvetica-Bold").text("Detalle de Intervenciones", { underline: true });
      doc.moveDown();

      interventions.forEach((intervention, idx) => {
        if (idx > 0 && idx % 3 === 0) doc.addPage();

        doc.fontSize(14).font("Helvetica-Bold").text(`${idx + 1}. ${intervention.interventionName}`);
        doc.fontSize(10).font("Helvetica");
        doc.text(`Tipo: ${intervention.interventionType}`);
        doc.text(`Fecha de implementación: ${new Date(intervention.implementationDate).toLocaleDateString("es-MX")}`);
        doc.text(`Casos antes: ${intervention.casesBeforeCount} | Casos después: ${intervention.casesAfterCount}`);
        doc.text(`Reducción: ${Number(intervention.caseReductionPercentage || 0).toFixed(1)}%`);
        doc.text(`Efectividad: ${Number(intervention.effectivenessScore || 0).toFixed(1)}/100`);
        doc.text(`Estado: ${intervention.status}`);

        if (intervention.aiInsights) {
          const insights = intervention.aiInsights as any;
          doc.moveDown(0.5);
          doc.fontSize(11).font("Helvetica-Bold").text("Insights de IA:");
          doc.fontSize(9).font("Helvetica");
          if (insights.successFactors?.length > 0) {
            doc.text(`Factores de éxito: ${insights.successFactors.slice(0, 2).join(", ")}`);
          }
          if (insights.recommendations?.length > 0) {
            doc.text(`Recomendaciones: ${insights.recommendations.slice(0, 2).join(", ")}`);
          }
        }

        doc.moveDown();
      });

      // Pie de página
      doc.fontSize(8).text(`Folio: IMPACT-${Date.now()}`, 50, doc.page.height - 50, { align: "center" });

      doc.end();

      // Esperar a que termine de generar
      await new Promise<void>((resolve) => doc.on("end", () => resolve()));

      const pdfBuffer = Buffer.concat(chunks);

      // Subir a S3
      const { storagePut } = await import("../storage");
      const fileName = `intervention-impact-report-${Date.now()}.pdf`;
      const { url } = await storagePut(`reports/${fileName}`, pdfBuffer, "application/pdf");

      return { success: true, url, fileName };
    }),

  // Exportar a Excel
  exportExcel: protectedProcedure
    .input(
      z.object({
        status: z.enum(["active", "completed", "archived"]).optional(),
        interventionType: z.enum(["training", "policy_change", "organizational_change", "corrective_action", "awareness_campaign", "other"]).optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      // Obtener datos filtrados
      const conditions = [];
      if (input.status) conditions.push(eq(interventionImpactAnalysis.status, input.status));
      if (input.interventionType) conditions.push(eq(interventionImpactAnalysis.interventionType, input.interventionType));

      const interventions = await db
        .select()
        .from(interventionImpactAnalysis)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(interventionImpactAnalysis.effectivenessScore));

      // Generar Excel con ExcelJS
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();

      // Hoja 1: Resumen
      const summarySheet = workbook.addWorksheet("Resumen");
      summarySheet.columns = [
        { header: "Métrica", key: "metric", width: 40 },
        { header: "Valor", key: "value", width: 20 },
      ];

      const totalInterventions = interventions.length;
      const avgEffectiveness = interventions.reduce((sum, i) => sum + Number(i.effectivenessScore || 0), 0) / totalInterventions || 0;
      const totalCasesAvoided = interventions.reduce((sum, i) => sum + (Number(i.casesBeforeCount) - Number(i.casesAfterCount)), 0);

      summarySheet.addRows([
        { metric: "Total de intervenciones analizadas", value: totalInterventions },
        { metric: "Efectividad promedio", value: `${avgEffectiveness.toFixed(1)}/100` },
        { metric: "Total de casos evitados", value: totalCasesAvoided },
        { metric: "Fecha de generación", value: new Date().toLocaleDateString("es-MX") },
      ]);

      summarySheet.getRow(1).font = { bold: true };

      // Hoja 2: Detalle de Intervenciones
      const detailSheet = workbook.addWorksheet("Detalle de Intervenciones");
      detailSheet.columns = [
        { header: "ID", key: "id", width: 10 },
        { header: "Nombre", key: "name", width: 30 },
        { header: "Tipo", key: "type", width: 20 },
        { header: "Fecha Implementación", key: "date", width: 20 },
        { header: "Casos Antes", key: "casesBefore", width: 15 },
        { header: "Casos Después", key: "casesAfter", width: 15 },
        { header: "Reducción (%)", key: "reduction", width: 15 },
        { header: "Efectividad", key: "effectiveness", width: 15 },
        { header: "Estado", key: "status", width: 15 },
      ];

      interventions.forEach((intervention) => {
        detailSheet.addRow({
          id: intervention.id,
          name: intervention.interventionName,
          type: intervention.interventionType,
          date: new Date(intervention.implementationDate).toLocaleDateString("es-MX"),
          casesBefore: intervention.casesBeforeCount,
          casesAfter: intervention.casesAfterCount,
          reduction: Number(intervention.caseReductionPercentage || 0).toFixed(1),
          effectiveness: `${Number(intervention.effectivenessScore || 0).toFixed(1)}/100`,
          status: intervention.status,
        });
      });

      detailSheet.getRow(1).font = { bold: true };

      // Hoja 3: Insights de IA
      const insightsSheet = workbook.addWorksheet("Insights de IA");
      insightsSheet.columns = [
        { header: "Intervención", key: "intervention", width: 30 },
        { header: "Tipo de Insight", key: "type", width: 20 },
        { header: "Detalle", key: "detail", width: 60 },
      ];

      interventions.forEach((intervention) => {
        if (intervention.aiInsights) {
          const insights = intervention.aiInsights as any;

          if (insights.successFactors?.length > 0) {
            insights.successFactors.forEach((factor: string) => {
              insightsSheet.addRow({
                intervention: intervention.interventionName,
                type: "Factor de éxito",
                detail: factor,
              });
            });
          }

          if (insights.challenges?.length > 0) {
            insights.challenges.forEach((challenge: string) => {
              insightsSheet.addRow({
                intervention: intervention.interventionName,
                type: "Desafío",
                detail: challenge,
              });
            });
          }

          if (insights.recommendations?.length > 0) {
            insights.recommendations.forEach((rec: string) => {
              insightsSheet.addRow({
                intervention: intervention.interventionName,
                type: "Recomendación",
                detail: rec,
              });
            });
          }

          if (insights.predictedImpact) {
            insightsSheet.addRow({
              intervention: intervention.interventionName,
              type: "Predicción de Impacto",
              detail: insights.predictedImpact,
            });
          }
        }
      });

      insightsSheet.getRow(1).font = { bold: true };

      // Generar buffer
      const buffer = await workbook.xlsx.writeBuffer();

      // Subir a S3
      const { storagePut } = await import("../storage");
      const fileName = `intervention-impact-report-${Date.now()}.xlsx`;
      const { url } = await storagePut(`reports/${fileName}`, Buffer.from(buffer), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

      return { success: true, url, fileName };
    }),

  // Dashboard de impacto
  getDashboard: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database connection failed");

    const totalInterventions = await db
      .select({ count: sql<number>`count(*)` })
      .from(interventionImpactAnalysis);

    const avgEffectiveness = await db
      .select({ avg: sql<number>`AVG(${interventionImpactAnalysis.effectivenessScore})` })
      .from(interventionImpactAnalysis)
      .where(eq(interventionImpactAnalysis.status, "active"));

    const totalCasesAvoided = await db
      .select({ sum: sql<number>`SUM(${interventionImpactAnalysis.casesBeforeCount} - ${interventionImpactAnalysis.casesAfterCount})` })
      .from(interventionImpactAnalysis);

    const topInterventions = await db
      .select()
      .from(interventionImpactAnalysis)
      .orderBy(desc(interventionImpactAnalysis.effectivenessScore))
      .limit(5);

    return {
      totalInterventions: totalInterventions[0]?.count || 0,
      avgEffectiveness: avgEffectiveness[0]?.avg || 0,
      totalCasesAvoided: totalCasesAvoided[0]?.sum || 0,
      topInterventions,
    };
  }),
});
