import { z } from "zod";
import { router, protectedProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { rootCauseAnalysis, recommendationsTracking, committeeTrainings, trainingAssignments, trainingCertificates, users, departments } from "../../drizzle/schema";
import { eq, and, desc, sql, gte, lte } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";
import { storagePut } from "../storage";

export const reportsExportRouter = router({
  /**
   * Generar reporte PDF de Análisis de Causas Raíz
   */
  generateRootCauseAnalysisPDF: protectedProcedure
    .input(
      z.object({
        analysisId: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Obtener análisis
      const [analysis] = await db
        .select()
        .from(rootCauseAnalysis)
        .where(eq(rootCauseAnalysis.id, input.analysisId));

      if (!analysis) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Análisis no encontrado" });
      }

      // Obtener recomendaciones asociadas
      const recommendations = await db
        .select({
          recommendation: recommendationsTracking,
          assignee: users,
        })
        .from(recommendationsTracking)
        .leftJoin(users, eq(recommendationsTracking.assignedTo, users.id))
        .where(eq(recommendationsTracking.analysisId, input.analysisId))
        .orderBy(desc(recommendationsTracking.priority));

      // Crear PDF
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));

      // Header
      doc.fontSize(20).font("Helvetica-Bold").text("Reporte de Análisis de Causas Raíz", { align: "center" });
      doc.moveDown();
      doc.fontSize(12).font("Helvetica").text(`Fecha de Análisis: ${new Date(analysis.analysisDate).toLocaleDateString()}`, { align: "center" });
      doc.text(`Período: ${new Date(analysis.periodStart).toLocaleDateString()} - ${new Date(analysis.periodEnd).toLocaleDateString()}`, { align: "center" });
      doc.moveDown(2);

      // Resumen Ejecutivo
      doc.fontSize(16).font("Helvetica-Bold").text("Resumen Ejecutivo");
      doc.moveDown();
      doc.fontSize(12).font("Helvetica");
      
      doc.text(`Total de Casos Analizados: ${analysis.totalCasesAnalyzed || 0}`);
      doc.text(`Causas Raíz Identificadas: ${analysis.rootCauses?.length || 0}`);
      doc.text(`Patrones Detectados: ${analysis.patterns?.length || 0}`);
      doc.text(`Recomendaciones Generadas: ${analysis.recommendations?.length || 0}`);
      doc.moveDown(2);

      // Causas Raíz
      doc.fontSize(16).font("Helvetica-Bold").text("Causas Raíz Identificadas");
      doc.moveDown();
      
      const rootCauses = typeof analysis.rootCauses === "string" ? JSON.parse(analysis.rootCauses) : analysis.rootCauses;
      if (Array.isArray(rootCauses)) {
        rootCauses.forEach((cause: any, index: number) => {
          doc.fontSize(12).font("Helvetica-Bold").text(`${index + 1}. ${cause.cause || cause}`);
          if (cause.frequency) {
            doc.font("Helvetica").text(`   Frecuencia: ${cause.frequency} casos`);
          }
          if (cause.severity) {
            doc.text(`   Severidad: ${cause.severity}`);
          }
          doc.moveDown(0.5);
        });
      }
      doc.moveDown(2);

      // Recomendaciones
      doc.fontSize(16).font("Helvetica-Bold").text("Recomendaciones Preventivas");
      doc.moveDown();
      
      const recs = typeof analysis.recommendations === "string" ? JSON.parse(analysis.recommendations) : analysis.recommendations;
      if (Array.isArray(recs)) {
        recs.forEach((rec: any, index: number) => {
          doc.fontSize(12).font("Helvetica-Bold").text(`${index + 1}. ${rec.recommendation || rec}`);
          if (rec.priority) {
            doc.font("Helvetica").text(`   Prioridad: ${rec.priority}`);
          }
          if (rec.expectedImpact) {
            doc.text(`   Impacto Esperado: ${rec.expectedImpact}`);
          }
          doc.moveDown(0.5);
        });
      }
      doc.moveDown(2);

      // Seguimiento de Recomendaciones
      if (recommendations.length > 0) {
        doc.addPage();
        doc.fontSize(16).font("Helvetica-Bold").text("Seguimiento de Implementación");
        doc.moveDown();

        recommendations.forEach((item, index) => {
          doc.fontSize(12).font("Helvetica-Bold").text(`${index + 1}. ${item.recommendation.recommendation.substring(0, 100)}...`);
          doc.font("Helvetica");
          doc.text(`   Estado: ${item.recommendation.status}`);
          doc.text(`   Prioridad: ${item.recommendation.priority}`);
          if (item.assignee) {
            doc.text(`   Responsable: ${item.assignee.name}`);
          }
          if (item.recommendation.reductionPercentage) {
            doc.text(`   Efectividad: ${item.recommendation.reductionPercentage}% de reducción`);
          }
          doc.moveDown(0.5);
        });
      }

      doc.end();

      const pdfBuffer = await new Promise<Buffer>((resolve) => {
        doc.on("end", () => resolve(Buffer.concat(chunks)));
      });

      // Subir a S3
      const fileName = `root-cause-analysis-${input.analysisId}-${Date.now()}.pdf`;
      const { url } = await storagePut(fileName, pdfBuffer, "application/pdf");

      return { url, fileName, message: "Reporte PDF generado exitosamente" };
    }),

  /**
   * Generar reporte Excel de Capacitaciones del Comité
   */
  generateTrainingsExcel: protectedProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      // Obtener asignaciones con filtros
      const conditions = [];
      if (input.startDate) {
        conditions.push(gte(trainingAssignments.assignedDate, new Date(input.startDate)));
      }
      if (input.endDate) {
        conditions.push(lte(trainingAssignments.assignedDate, new Date(input.endDate)));
      }

      const assignments = await db
        .select({
          assignment: trainingAssignments,
          training: committeeTrainings,
          member: users,
          certificate: trainingCertificates,
        })
        .from(trainingAssignments)
        .leftJoin(committeeTrainings, eq(trainingAssignments.trainingId, committeeTrainings.id))
        .leftJoin(users, eq(trainingAssignments.committeeMemberId, users.id))
        .leftJoin(trainingCertificates, eq(trainingCertificates.assignmentId, trainingAssignments.id))
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(desc(trainingAssignments.assignedDate));

      // Crear Excel
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Capacitaciones del Comité");

      // Encabezados
      worksheet.columns = [
        { header: "ID", key: "id", width: 10 },
        { header: "Capacitación", key: "training", width: 30 },
        { header: "Tipo", key: "type", width: 20 },
        { header: "Miembro", key: "member", width: 25 },
        { header: "Estado", key: "status", width: 15 },
        { header: "Fecha Asignación", key: "assignedDate", width: 18 },
        { header: "Fecha Inicio", key: "startDate", width: 18 },
        { header: "Fecha Completación", key: "completionDate", width: 20 },
        { header: "Calificación", key: "score", width: 12 },
        { header: "Certificado", key: "certificate", width: 25 },
        { header: "Vigencia", key: "expiryDate", width: 18 },
      ];

      // Estilo de encabezados
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4472C4" },
      };
      worksheet.getRow(1).font = { color: { argb: "FFFFFFFF" }, bold: true };

      // Datos
      assignments.forEach((item) => {
        worksheet.addRow({
          id: item.assignment.id,
          training: item.training?.title || "N/A",
          type: item.training?.type || "N/A",
          member: item.member?.name || "N/A",
          status: item.assignment.status,
          assignedDate: item.assignment.assignedDate ? new Date(item.assignment.assignedDate).toLocaleDateString() : "",
          startDate: item.assignment.startDate ? new Date(item.assignment.startDate).toLocaleDateString() : "",
          completionDate: item.assignment.completionDate ? new Date(item.assignment.completionDate).toLocaleDateString() : "",
          score: item.assignment.score || "",
          certificate: item.certificate?.certificateNumber || "Sin certificado",
          expiryDate: item.certificate?.expiryDate ? new Date(item.certificate.expiryDate).toLocaleDateString() : "",
        });
      });

      // Estadísticas
      const statsSheet = workbook.addWorksheet("Estadísticas");
      statsSheet.columns = [
        { header: "Métrica", key: "metric", width: 30 },
        { header: "Valor", key: "value", width: 15 },
      ];

      statsSheet.getRow(1).font = { bold: true };
      statsSheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF4472C4" },
      };
      statsSheet.getRow(1).font = { color: { argb: "FFFFFFFF" }, bold: true };

      const totalAssignments = assignments.length;
      const completed = assignments.filter((a) => a.assignment.status === "completed").length;
      const inProgress = assignments.filter((a) => a.assignment.status === "in_progress").length;
      const pending = assignments.filter((a) => a.assignment.status === "pending").length;
      const avgScore = assignments
        .filter((a) => a.assignment.score)
        .reduce((sum, a) => sum + (a.assignment.score || 0), 0) / (assignments.filter((a) => a.assignment.score).length || 1);

      statsSheet.addRow({ metric: "Total de Asignaciones", value: totalAssignments });
      statsSheet.addRow({ metric: "Completadas", value: completed });
      statsSheet.addRow({ metric: "En Progreso", value: inProgress });
      statsSheet.addRow({ metric: "Pendientes", value: pending });
      statsSheet.addRow({ metric: "Calificación Promedio", value: avgScore.toFixed(2) });
      statsSheet.addRow({ metric: "Tasa de Completitud", value: `${((completed / totalAssignments) * 100).toFixed(1)}%` });

      // Generar buffer
      const excelBuffer = await workbook.xlsx.writeBuffer();

      // Subir a S3
      const fileName = `trainings-report-${Date.now()}.xlsx`;
      const { url } = await storagePut(fileName, Buffer.from(excelBuffer), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");

      return { url, fileName, message: "Reporte Excel generado exitosamente" };
    }),
});
