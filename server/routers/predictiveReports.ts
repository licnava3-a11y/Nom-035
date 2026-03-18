/**
 * Router de Reportes Predictivos
 * Genera reportes PDF con análisis predictivo de rotación, matriz de confusión y recomendaciones
 */

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import PDFDocument from "pdfkit";
import { storagePut } from "../storage";
import { invokeLLM } from "../_core/llm";
import { getDb } from "../db";
import { employeeTurnoverHistory, users, sentimentAnalysis, nom035Cases, surveyResponses, modelThresholds } from "../../drizzle/schema";
import { eq, and, gte, desc, count, sql, inArray } from "drizzle-orm";

export const predictiveReportsRouter = router({
  /**
   * Generar reporte PDF de análisis predictivo
   */
  generatePredictivePDF: protectedProcedure
    .input(
      z.object({
        includeConfusionMatrix: z.boolean().default(true),
        includeEvolution: z.boolean().default(true),
        includeRecommendations: z.boolean().default(true),
      })
    )
    .mutation(async ({ input, ctx }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database connection failed",
          });
        }

        // Obtener métricas de correlación (matriz de confusión)
        const turnoverRecords = await db
          .select()
          .from(employeeTurnoverHistory)
          .orderBy(desc(employeeTurnoverHistory.exitDate));

        let truePositives = 0;
        let falsePositives = 0;
        let trueNegatives = 0;
        let falseNegatives = 0;

        for (const record of turnoverRecords) {
          if (record.wasHighRisk && record.riskScoreAtExit && record.riskScoreAtExit >= 70) {
            truePositives++;
          } else if (!record.wasHighRisk && record.riskScoreAtExit && record.riskScoreAtExit < 70) {
            trueNegatives++;
          } else if (!record.wasHighRisk && record.riskScoreAtExit && record.riskScoreAtExit >= 70) {
            falsePositives++;
          } else if (record.wasHighRisk && record.riskScoreAtExit && record.riskScoreAtExit < 70) {
            falseNegatives++;
          }
        }

        const precision = truePositives + falsePositives > 0
          ? (truePositives / (truePositives + falsePositives)) * 100
          : 0;

        const recall = truePositives + falseNegatives > 0
          ? (truePositives / (truePositives + falseNegatives)) * 100
          : 0;

        const f1Score = precision + recall > 0
          ? (2 * (precision * recall) / (precision + recall))
          : 0;

        const accuracy = turnoverRecords.length > 0
          ? ((truePositives + trueNegatives) / turnoverRecords.length) * 100
          : 0;

        // Obtener empleados de alto riesgo actual
        const allUsers = await db.select().from(users);
        const highRiskEmployees = [];

        for (const user of allUsers) {
          const ninetyDaysAgo = new Date();
          ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

          const criticalCommentsCount = await db
            .select({ count: count() })
            .from(sentimentAnalysis)
            .innerJoin(surveyResponses, eq(sentimentAnalysis.responseId, surveyResponses.id))
            .where(
              and(
                eq(surveyResponses.userId, user.id),
                eq(sentimentAnalysis.riskLevel, "critical"),
                gte(sentimentAnalysis.analyzedAt, ninetyDaysAgo)
              )
            );

          const openCasesCount = await db
            .select({ count: count() })
            .from(nom035Cases)
            .where(
              and(
                eq(nom035Cases.reportedBy, user.id),
                sql`${nom035Cases.status} IN ('open', 'in_progress')`
              )
            );

          const criticalComments = criticalCommentsCount[0]?.count || 0;
          const openCases = openCasesCount[0]?.count || 0;

          // Obtener configuración activa de umbrales
          const [activeConfig] = await db
            .select()
            .from(modelThresholds)
            .where(eq(modelThresholds.isActive, true))
            .orderBy(desc(modelThresholds.createdAt))
            .limit(1);

          const criticalCommentsWeight = (activeConfig?.criticalCommentsWeight || 40) / 100;
          const openCasesWeight = (activeConfig?.openCasesWeight || 30) / 100;
          const highRiskSurveysWeight = (activeConfig?.highRiskSurveysWeight || 30) / 100;

          const riskScore = Math.round(
            (criticalComments * 10) * criticalCommentsWeight +
            (openCases * 10) * openCasesWeight +
            (0 * highRiskSurveysWeight) // Simplificado para el reporte
          );

          if (riskScore >= (activeConfig?.highRiskThreshold || 70)) {
            highRiskEmployees.push({
              name: user.name || "Sin nombre",
              department: user.departamento || "Sin departamento",
              riskScore,
              criticalComments,
              openCases,
            });
          }
        }

        // Generar recomendaciones con LLM si está habilitado
        let recommendations = "";
        if (input.includeRecommendations) {
          const llmResponse = await invokeLLM({
            messages: [
              {
                role: "system",
                content: "Eres un experto en recursos humanos y análisis predictivo de rotación de personal. Genera recomendaciones estratégicas basadas en métricas del modelo predictivo.",
              },
              {
                role: "user",
                content: `Genera 5 recomendaciones estratégicas para reducir la rotación de personal basándote en estas métricas del modelo predictivo:

- Precisión: ${precision.toFixed(1)}%
- Recall: ${recall.toFixed(1)}%
- F1-Score: ${f1Score.toFixed(1)}%
- Accuracy: ${accuracy.toFixed(1)}%
- Empleados de alto riesgo: ${highRiskEmployees.length}
- Verdaderos positivos: ${truePositives}
- Falsos negativos: ${falseNegatives}

Formato: Lista numerada con título y descripción breve (máximo 2 líneas por recomendación).`,
              },
            ],
          });

          recommendations = llmResponse.choices[0]?.message?.content || "No se pudieron generar recomendaciones.";
        }

        // Crear PDF
        const doc = new PDFDocument({ margin: 50, size: "A4" });
        const chunks: Buffer[] = [];

        doc.on("data", (chunk) => chunks.push(chunk));

        // Portada
        doc.fontSize(28).font("Helvetica-Bold").text("Reporte de Análisis Predictivo", { align: "center" });
        doc.moveDown(0.5);
        doc.fontSize(16).font("Helvetica").text("Sistema de Predicción de Rotación de Personal", { align: "center" });
        doc.moveDown(2);
        doc.fontSize(12).text(`Generado: ${new Date().toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })}`, { align: "center" });
        doc.fontSize(12).text(`Por: ${ctx.user.name || "Sistema"}`, { align: "center" });
        doc.moveDown(3);

        // Resumen ejecutivo
        doc.addPage();
        doc.fontSize(20).font("Helvetica-Bold").text("Resumen Ejecutivo", { underline: true });
        doc.moveDown();
        doc.fontSize(12).font("Helvetica").text(
          `Este reporte presenta el análisis predictivo de rotación de personal basado en el modelo de machine learning implementado. El modelo utiliza análisis de sentimiento, casos psicosociales y encuestas NOM-035 para identificar empleados en riesgo de rotación.`,
          { align: "justify" }
        );
        doc.moveDown();

        // Métricas del modelo
        doc.fontSize(16).font("Helvetica-Bold").text("Métricas de Precisión del Modelo", { underline: true });
        doc.moveDown();
        doc.fontSize(12).font("Helvetica");
        doc.text(`• Precisión: ${precision.toFixed(1)}%`);
        doc.text(`• Recall (Sensibilidad): ${recall.toFixed(1)}%`);
        doc.text(`• F1-Score: ${f1Score.toFixed(1)}%`);
        doc.text(`• Accuracy (Exactitud): ${accuracy.toFixed(1)}%`);
        doc.moveDown();

        // Matriz de confusión
        if (input.includeConfusionMatrix) {
          doc.fontSize(16).font("Helvetica-Bold").text("Matriz de Confusión", { underline: true });
          doc.moveDown();
          doc.fontSize(11).font("Helvetica");
          doc.text(`Verdaderos Positivos (VP): ${truePositives} - Empleados correctamente identificados como alto riesgo que rotaron`);
          doc.text(`Falsos Positivos (FP): ${falsePositives} - Empleados identificados como alto riesgo que NO rotaron`);
          doc.text(`Verdaderos Negativos (VN): ${trueNegatives} - Empleados correctamente identificados como bajo riesgo que NO rotaron`);
          doc.text(`Falsos Negativos (FN): ${falseNegatives} - Empleados NO identificados como alto riesgo que rotaron`);
          doc.moveDown();
        }

        // Empleados de alto riesgo
        doc.addPage();
        doc.fontSize(16).font("Helvetica-Bold").text("Empleados de Alto Riesgo Actual", { underline: true });
        doc.moveDown();
        doc.fontSize(12).font("Helvetica").text(`Total identificados: ${highRiskEmployees.length} empleados`);
        doc.moveDown();

        if (highRiskEmployees.length > 0) {
          doc.fontSize(11).font("Helvetica");
          highRiskEmployees.slice(0, 10).forEach((emp, idx) => {
            doc.text(`${idx + 1}. ${emp.name} - ${emp.department}`);
            doc.fontSize(10).text(`   Score: ${emp.riskScore} | Comentarios críticos: ${emp.criticalComments} | Casos abiertos: ${emp.openCases}`, { indent: 20 });
            doc.fontSize(11);
            doc.moveDown(0.5);
          });

          if (highRiskEmployees.length > 10) {
            doc.text(`... y ${highRiskEmployees.length - 10} empleados más.`);
          }
        } else {
          doc.text("No se identificaron empleados de alto riesgo en este momento.");
        }

        // Recomendaciones
        if (input.includeRecommendations && recommendations) {
          doc.addPage();
          doc.fontSize(16).font("Helvetica-Bold").text("Recomendaciones Estratégicas", { underline: true });
          doc.moveDown();
          doc.fontSize(11).font("Helvetica").text(recommendations, { align: "justify" });
        }

        // Pie de página
        doc.fontSize(9).font("Helvetica").text(
          "Este reporte es confidencial y de uso exclusivo para la organización.",
          50,
          doc.page.height - 50,
          { align: "center" }
        );

        doc.end();

        // Esperar a que termine el PDF
        await new Promise<void>((resolve) => {
          doc.on("end", () => resolve());
        });

        const pdfBuffer = Buffer.concat(chunks);

        // Subir a S3
        const timestamp = Date.now();
        const fileKey = `predictive-reports/reporte-predictivo-${timestamp}.pdf`;
        const { url } = await storagePut(fileKey, pdfBuffer, "application/pdf");

        return {
          success: true,
          message: "Reporte generado exitosamente",
          pdfUrl: url,
          fileKey,
          fileSize: pdfBuffer.length,
          metrics: {
            precision,
            recall,
            f1Score,
            accuracy,
            highRiskEmployees: highRiskEmployees.length,
          },
        };
      } catch (error: any) {
        console.error("Error al generar reporte predictivo:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Error al generar reporte PDF",
        });
      }
    }),
});
