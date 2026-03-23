import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { companyLogo, departments, interventionImpactAnalysis, reportCache, sharedReportsLog, trainingEvaluations, workplaceViolenceCases } from "../../drizzle/schema";
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

      const [result] = await (db.insert(interventionImpactAnalysis) as any).values({
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
        } as any)
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
        } as any)
        .where(eq(interventionImpactAnalysis.id, input.id));

      return { success: true, insights };
    }),

  // Exportar a PDF
  exportPDF: protectedProcedure
    .input(
      z.object({
        status: z.enum(["active", "completed", "archived"]).optional(),
        interventionType: z.enum(["training", "policy_change", "organizational_change", "corrective_action", "awareness_campaign", "other"]).optional(),
        chartImages: z.object({
          effectivenessChart: z.string().optional(),
          casesChart: z.string().optional(),
          typeDistributionChart: z.string().optional(),
        }).optional(),
        companyLogo: z.string().optional(), // Base64 del logo de la empresa
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database connection failed");

      // Generar hash MD5 de los parámetros para caché
      const crypto = await import("crypto");
      const paramsString = JSON.stringify({
        status: input.status,
        interventionType: input.interventionType,
        hasCharts: !!input.chartImages,
        hasLogo: !!input.companyLogo,
      });
      const paramsHash = crypto.createHash("md5").update(paramsString).digest("hex");

      // Buscar en caché (reportes generados en las últimas 24 horas)
      const { reportCache } = await import("../../drizzle/schema");
      const { gt } = await import("drizzle-orm");
      
      const cachedReport = await db
        .select()
        .from(reportCache)
        .where(
          and(
            eq(reportCache.paramsHash, paramsHash),
            eq(reportCache.reportType, "intervention_impact_pdf"),
            gt(reportCache.expiresAt, new Date())
          )
        )
        .limit(1);

      if (cachedReport.length > 0) {
        // Actualizar contador de hits y último acceso
        await db
          .update(reportCache)
          .set({
            hitCount: (cachedReport[0].hitCount || 0) + 1,
            lastAccessedAt: new Date(),
          } as any)
          .where(eq(reportCache.id, cachedReport[0].id));

        return {
          success: true,
          url: cachedReport[0].reportUrl,
          fileName: cachedReport[0].fileName,
          cached: true,
          cacheHits: (cachedReport[0].hitCount || 0) + 1,
        };
      }

      // No hay caché, generar nuevo reporte
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
      const avgEffectiveness = interventions.reduce((sum: any, i: any) => sum + Number(i.effectivenessScore || 0), 0) / totalInterventions || 0;
      const totalCasesAvoided = interventions.reduce((sum: any, i: any) => sum + (Number(i.casesBeforeCount) - Number(i.casesAfterCount)), 0);

      // Generar PDF con PDFKit (con compresión habilitada)
      const PDFDocument = (await import("pdfkit")).default;
      const doc = new PDFDocument({ 
        margin: 50,
        compress: true, // Habilitar compresión de PDF
        autoFirstPage: true
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(chunk));

      // Portada
      // Agregar logo si está disponible
      if (input.companyLogo) {
        try {
          const logoBuffer = Buffer.from(input.companyLogo.split(",")[1], "base64");
          doc.image(logoBuffer, { fit: [150, 150], align: "center" });
          doc.moveDown();
        } catch (error) {
          console.error("Error al agregar logo:", error);
        }
      }

      doc.fontSize(24).font("Helvetica-Bold").text("Reporte de Análisis de Impacto de Intervenciones", { align: "center" });
      doc.moveDown();
      doc.fontSize(12).font("Helvetica").text(`Fecha de generación: ${new Date().toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })}`, { align: "center" });
      doc.text(`Generado por: ${ctx.user.name}`, { align: "center" });
      doc.moveDown(2);

      // Resumen ejecutivo
      doc.addPage();
      doc.fontSize(16).font("Helvetica-Bold").text("Resumen Ejecutivo", { underline: true });
      doc.moveDown();
      doc.fontSize(12).font("Helvetica");
      doc.text(`Total de intervenciones analizadas: ${totalInterventions}`);
      doc.text(`Efectividad promedio: ${avgEffectiveness.toFixed(1)}/100`);
      doc.text(`Total de casos evitados: ${totalCasesAvoided}`);
      doc.moveDown(2);

      // Agregar gráficos si están disponibles
      if (input.chartImages) {
        if (input.chartImages.effectivenessChart) {
          try {
            const chartBuffer = Buffer.from(input.chartImages.effectivenessChart.split(",")[1], "base64");
            doc.fontSize(14).font("Helvetica-Bold").text("Gráfico de Efectividad");
            doc.moveDown(0.5);
            doc.image(chartBuffer, { fit: [450, 250] });
            doc.moveDown();
          } catch (error) {
            console.error("Error al agregar gráfico de efectividad:", error);
          }
        }

        if (input.chartImages.casesChart) {
          try {
            const chartBuffer = Buffer.from(input.chartImages.casesChart.split(",")[1], "base64");
            doc.fontSize(14).font("Helvetica-Bold").text("Gráfico de Reducción de Casos");
            doc.moveDown(0.5);
            doc.image(chartBuffer, { fit: [450, 250] });
            doc.moveDown();
          } catch (error) {
            console.error("Error al agregar gráfico de casos:", error);
          }
        }

        if (input.chartImages.typeDistributionChart) {
          try {
            const chartBuffer = Buffer.from(input.chartImages.typeDistributionChart.split(",")[1], "base64");
            doc.addPage();
            doc.fontSize(14).font("Helvetica-Bold").text("Distribución por Tipo de Intervención");
            doc.moveDown(0.5);
            doc.image(chartBuffer, { fit: [450, 250] });
            doc.moveDown();
          } catch (error) {
            console.error("Error al agregar gráfico de distribución:", error);
          }
        }
      }

      // Tabla de intervenciones
      doc.fontSize(16).font("Helvetica-Bold").text("Detalle de Intervenciones", { underline: true });
      doc.moveDown();

      interventions.forEach((intervention: any, idx: number) => {
        if (idx > 0 && idx % 3 === 0) doc.addPage();

        doc.fontSize(14).font("Helvetica-Bold").text(`${idx + 1}. ${intervention.interventionName}`);
        doc.fontSize(10).font("Helvetica");
        doc.text(`Tipo: ${intervention.interventionType}`);
        doc.text(`Fecha de implementación: ${new Date(intervention.implementationDate).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })}`);
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

      // Guardar en caché (expira en 24 horas)
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);

      await (db.insert(reportCache) as any).values({
        reportType: "intervention_impact_pdf",
        paramsHash,
        params: {
          status: input.status,
          interventionType: input.interventionType,
          hasCharts: !!input.chartImages,
          hasLogo: !!input.companyLogo,
        },
        reportUrl: url,
        fileName,
        fileSize: pdfBuffer.length,
        generatedBy: ctx.user.id,
        generatedByName: ctx.user.name,
        expiresAt,
      });

      return { success: true, url, fileName, cached: false };
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
      const avgEffectiveness = interventions.reduce((sum: any, i: any) => sum + Number(i.effectivenessScore || 0), 0) / totalInterventions || 0;
      const totalCasesAvoided = interventions.reduce((sum: any, i: any) => sum + (Number(i.casesBeforeCount) - Number(i.casesAfterCount)), 0);

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

      interventions.forEach((intervention: any) => {
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

      interventions.forEach((intervention: any) => {
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

  // Compartir reporte por email
  shareReportByEmail: protectedProcedure
    .input(
      z.object({
        reportUrl: z.string().url(),
        reportType: z.enum(["pdf", "excel"]),
        recipients: z.array(z.string().email()).min(1).max(10),
        subject: z.string().min(1).max(200),
        message: z.string().optional(),
        appliedFilters: z.record(z.string(), z.any()).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { reportUrl, reportType, recipients, subject, message } = input;

      // Importar nodemailer dinámicamente
      const nodemailer = await import("nodemailer");

      // Configurar transporter SMTP (usando variables de entorno)
      const transporter = nodemailer.default.createTransport({
        host: process.env.SMTP_HOST || "smtp.gmail.com",
        port: Number(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      // Verificar configuración SMTP
      if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
        throw new Error("Configuración SMTP incompleta. Verifica las variables de entorno SMTP_*");
      }

      const fileExtension = reportType === "pdf" ? "pdf" : "xlsx";
      const fileName = `reporte-impacto-intervenciones-${Date.now()}.${fileExtension}`;

      // Descargar archivo desde S3 para adjuntar
      const response = await fetch(reportUrl);
      const fileBuffer = await response.arrayBuffer();

      // Preparar email
      const mailOptions = {
        from: `"Plataforma NOM-035" <${process.env.SMTP_USER}>`,
        to: recipients.join(", "),
        subject: subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Reporte de Análisis de Impacto de Intervenciones</h2>
            <p>Hola,</p>
            <p>${message || "Te compartimos el reporte de análisis de impacto de intervenciones de prevención de riesgos psicosociales."}</p>
            <p>El reporte adjunto contiene:</p>
            <ul>
              <li>Resumen ejecutivo con métricas clave</li>
              <li>Detalle de intervenciones implementadas</li>
              <li>Análisis de efectividad antes/después</li>
              <li>Insights generados con IA</li>
              <li>Recomendaciones priorizadas</li>
            </ul>
            <p style="margin-top: 20px;">Enviado por: <strong>${ctx.user.name}</strong></p>
            <p style="color: #666; font-size: 12px; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 10px;">
              Este correo fue generado automáticamente desde la Plataforma de Capacitación NOM-035 STPS 2018.
            </p>
          </div>
        `,
        attachments: [
          {
            filename: fileName,
            content: Buffer.from(fileBuffer),
            contentType: reportType === "pdf" ? "application/pdf" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          },
        ],
      };

      // Enviar email
      try {
        await transporter.sendMail(mailOptions);
        
        // Registrar en log de reportes compartidos
        const db = await getDb();
      if (!db) throw new Error('Database not initialized');
        if (db) {
          await (db.insert(sharedReportsLog) as any).values({
            reportUrl: input.reportUrl,
            reportType: input.reportType,
            reportCategory: "intervention_impact",
            shareChannel: "email",
            recipients: input.recipients,
            recipientCount: input.recipients.length,
            emailSubject: input.subject,
            emailMessage: input.message || null,
            sharedBy: ctx.user.id,
            sharedByName: ctx.user.name || null,
            sharedByEmail: ctx.user.email || null,
            appliedFilters: input.appliedFilters || null,
          });
        }
        
        return { success: true, recipientCount: recipients.length };
      } catch (error: any) {
        console.error("Error al enviar correo:", error);
        throw new Error(`Error al enviar correo: ${error.message}`);
      }
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
