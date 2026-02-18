/**
 * Router de Reportes de Compensación
 * Genera reportes ejecutivos en PDF con análisis de brecha salarial
 */

import { router, protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { compensationReportsHistory } from "../../drizzle/schema";
import PDFDocument from "pdfkit";
import { storagePut } from "../storage";

export const compensationReportsRouter = router({
  generateCompensationPDF: protectedProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();

    try {
      // Obtener datos de nómina
      const payrollData = await db.query.payrollData.findMany();
      
      // Obtener empleados con brecha crítica
      const criticalGaps = payrollData.filter((p) => p.requiresReview === true);
      
      // Calcular estadísticas
      const totalEmployees = payrollData.length;
      const criticalCount = criticalGaps.length;
      const highRiskCount = payrollData.filter(
        (p) => p.compensationRiskLevel === "high" || p.compensationRiskLevel === "critical"
      ).length;
      
      // Calcular costo total de ajustes recomendados
      let totalAdjustmentCost = 0;
      criticalGaps.forEach((emp) => {
        if (emp.marketRate && emp.salary) {
          const marketRate = parseFloat(emp.marketRate);
          const currentSalary = parseFloat(emp.salary);
          if (marketRate > currentSalary) {
            totalAdjustmentCost += (marketRate - currentSalary) * 12; // Costo anual
          }
        }
      });

      // Crear PDF
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const chunks: Buffer[] = [];

      doc.on("data", (chunk) => chunks.push(chunk));

      // Portada
      doc.fontSize(28).font("Helvetica-Bold").text("Reporte Ejecutivo", { align: "center" });
      doc.moveDown(0.5);
      doc.fontSize(22).text("Análisis de Compensación y Retención", { align: "center" });
      doc.moveDown(2);
      doc.fontSize(12).font("Helvetica").text(`Fecha: ${new Date().toLocaleDateString("es-MX")}`, { align: "center" });
      doc.moveDown(0.5);
      doc.text(`Generado por: ${ctx.user?.name || "Sistema"}`, { align: "center" });
      
      doc.addPage();

      // Resumen Ejecutivo
      doc.fontSize(18).font("Helvetica-Bold").text("Resumen Ejecutivo", { underline: true });
      doc.moveDown(1);
      doc.fontSize(12).font("Helvetica");
      
      doc.text(`Total de Empleados Analizados: ${totalEmployees}`, { continued: false });
      doc.moveDown(0.5);
      doc.text(`Empleados con Brecha Salarial Crítica: ${criticalCount} (${((criticalCount / totalEmployees) * 100).toFixed(1)}%)`, { continued: false });
      doc.moveDown(0.5);
      doc.text(`Empleados en Riesgo Alto/Crítico: ${highRiskCount} (${((highRiskCount / totalEmployees) * 100).toFixed(1)}%)`, { continued: false });
      doc.moveDown(0.5);
      doc.text(`Costo Total de Ajustes Recomendados: $${totalAdjustmentCost.toLocaleString("es-MX", { minimumFractionDigits: 2 })} MXN anuales`, { continued: false });
      
      doc.moveDown(2);
      doc.fontSize(14).font("Helvetica-Bold").text("Análisis de Impacto");
      doc.moveDown(0.5);
      doc.fontSize(12).font("Helvetica");
      
      const avgTurnoverCost = 50000; // Costo promedio de rotación
      const potentialSavings = criticalCount * avgTurnoverCost;
      const roi = totalAdjustmentCost > 0 ? ((potentialSavings - totalAdjustmentCost) / totalAdjustmentCost) * 100 : 0;
      
      doc.text(`Costo Estimado de Rotación (si no se actúa): $${potentialSavings.toLocaleString("es-MX")} MXN`, { continued: false });
      doc.moveDown(0.5);
      doc.text(`ROI Estimado de Ajustes Salariales: ${roi.toFixed(0)}%`, { continued: false });
      doc.moveDown(0.5);
      doc.text(`Ahorro Neto Proyectado: $${(potentialSavings - totalAdjustmentCost).toLocaleString("es-MX")} MXN`, { continued: false });

      doc.addPage();

      // Tabla de Empleados con Brecha Crítica
      doc.fontSize(18).font("Helvetica-Bold").text("Empleados con Brecha Salarial Crítica", { underline: true });
      doc.moveDown(1);
      doc.fontSize(10).font("Helvetica");

      if (criticalGaps.length > 0) {
        // Encabezados de tabla
        const tableTop = doc.y;
        const colWidths = [150, 100, 100, 80, 80];
        const colPositions = [50, 200, 300, 400, 480];

        doc.font("Helvetica-Bold");
        doc.text("Nombre", colPositions[0], tableTop);
        doc.text("Departamento", colPositions[1], tableTop);
        doc.text("Salario Actual", colPositions[2], tableTop);
        doc.text("Tasa Mercado", colPositions[3], tableTop);
        doc.text("Brecha", colPositions[4], tableTop);

        doc.moveTo(50, tableTop + 15).lineTo(560, tableTop + 15).stroke();

        let yPosition = tableTop + 20;
        doc.font("Helvetica");

        criticalGaps.slice(0, 20).forEach((emp) => {
          if (yPosition > 750) {
            doc.addPage();
            yPosition = 50;
          }

          doc.text(emp.employeeName.substring(0, 20), colPositions[0], yPosition);
          doc.text((emp.department || "N/A").substring(0, 15), colPositions[1], yPosition);
          doc.text(`$${parseFloat(emp.salary).toLocaleString()}`, colPositions[2], yPosition);
          doc.text(emp.marketRate ? `$${parseFloat(emp.marketRate).toLocaleString()}` : "N/A", colPositions[3], yPosition);
          doc.text(`${emp.salaryGapPercentage || "0"}%`, colPositions[4], yPosition);

          yPosition += 20;
        });

        if (criticalGaps.length > 20) {
          doc.moveDown(2);
          doc.fontSize(10).font("Helvetica-Oblique").text(`... y ${criticalGaps.length - 20} empleados más`);
        }
      } else {
        doc.text("No hay empleados con brecha salarial crítica en este momento.", { align: "center" });
      }

      doc.addPage();

      // Recomendaciones
      doc.fontSize(18).font("Helvetica-Bold").text("Recomendaciones Estratégicas", { underline: true });
      doc.moveDown(1);
      doc.fontSize(12).font("Helvetica");

      doc.text("1. Priorizar Ajustes Salariales", { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).text(`   • Revisar inmediatamente los ${criticalCount} casos con brecha crítica (>20% por debajo del mercado)`);
      doc.text("   • Implementar ajustes escalonados para optimizar el presupuesto");
      doc.text("   • Considerar ajustes a tasa de mercado para empleados de alto valor estratégico");
      doc.moveDown(1);

      doc.fontSize(12).text("2. Implementar Revisiones Periódicas", { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).text("   • Establecer revisiones salariales trimestrales basadas en benchmarks de mercado");
      doc.text("   • Monitorear continuamente el riesgo de rotación de empleados clave");
      doc.text("   • Actualizar tasas de mercado cada 6 meses");
      doc.moveDown(1);

      doc.fontSize(12).text("3. Combinar con Otras Intervenciones", { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).text("   • Complementar ajustes salariales con capacitación y desarrollo");
      doc.text("   • Ofrecer beneficios flexibles para maximizar la percepción de valor");
      doc.text("   • Implementar programas de reconocimiento para reforzar la retención");
      doc.moveDown(1);

      doc.fontSize(12).text("4. Monitoreo de ROI", { underline: true });
      doc.moveDown(0.5);
      doc.fontSize(11).text(`   • El ROI estimado de ${roi.toFixed(0)}% justifica la inversión en ajustes salariales`);
      doc.text("   • Rastrear la tasa de retención post-ajuste para validar la efectividad");
      doc.text("   • Documentar casos de éxito para optimizar futuras estrategias");

      // Finalizar PDF
      doc.end();

      // Esperar a que el PDF se complete
      const pdfBuffer = await new Promise<Buffer>((resolve) => {
        doc.on("end", () => {
          resolve(Buffer.concat(chunks));
        });
      });

      // Subir a S3
      const timestamp = Date.now();
      const fileKey = `compensation-reports/report-${timestamp}.pdf`;
      const { url: pdfUrl } = await storagePut(fileKey, pdfBuffer, "application/pdf");

      // Guardar en historial
      const [reportRecord] = await db.insert(compensationReportsHistory).values({
        reportDate: new Date(),
        generatedBy: ctx.user?.id || 0,
        totalEmployees,
        criticalGaps: criticalCount,
        highRiskCount,
        totalAdjustmentCost: totalAdjustmentCost.toString(),
        pdfUrl,
        pdfKey: fileKey,
      });

      return {
        success: true,
        pdfUrl,
        reportId: reportRecord.insertId,
        stats: {
          totalEmployees,
          criticalGaps: criticalCount,
          highRiskCount,
          totalAdjustmentCost,
        },
      };
    } catch (error: any) {
      console.error("[Compensation Reports] Error generating PDF:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error.message || "Error al generar reporte PDF",
      });
    }
  }),

  getReportHistory: protectedProcedure.query(async () => {
    const db = await getDb();
    const reports = await db.query.compensationReportsHistory.findMany({
      orderBy: (reports, { desc }) => [desc(reports.reportDate)],
      limit: 20,
    });
    return reports;
  }),
});
