/**
 * Router de Reportes Ejecutivos
 * Genera reportes consolidados en PDF con KPIs y métricas del sistema
 */

import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { executiveReportsHistory, nom035Cases, surveyResponses, surveyResults, employees, users } from "../../drizzle/schema";
import { eq, and, gte, lte, sql, desc, count } from "drizzle-orm";
import PDFDocument from "pdfkit";
import { storagePut } from "../storage";

/**
 * Consolidar datos para el reporte ejecutivo
 */
async function consolidateReportData(startDate: Date, endDate: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database connection failed");

  // 1. Casos NOM-035
  const casesData = await db
    .select({
      total: count(),
      status: nom035Cases.status,
      priority: nom035Cases.priority,
    })
    .from(nom035Cases)
    .where(
      and(
        gte(nom035Cases.createdAt, startDate),
        lte(nom035Cases.createdAt, endDate)
      )
    )
    .groupBy(nom035Cases.status, nom035Cases.priority);

  const totalCases = casesData.reduce((sum, c) => sum + c.total, 0);
  const openCases = casesData.filter(c => c.status === "open").reduce((sum, c) => sum + c.total, 0);
  const closedCases = casesData.filter(c => c.status === "closed").reduce((sum, c) => sum + c.total, 0);
  const criticalCases = casesData.filter(c => c.priority === "critical").reduce((sum, c) => sum + c.total, 0);

  // 2. Encuestas NOM-035
  const surveysData = await db
    .select({
      total: count(),
      completed: sql<number>`SUM(CASE WHEN ${surveyResponses.completedAt} IS NOT NULL THEN 1 ELSE 0 END)`,
    })
    .from(surveyResponses)
    .where(
      and(
        gte(surveyResponses.createdAt, startDate),
        lte(surveyResponses.createdAt, endDate)
      )
    );

  const totalSurveys = surveysData[0]?.total || 0;
  const completedSurveys = Number(surveysData[0]?.completed) || 0;
  const completionRate = totalSurveys > 0 ? (completedSurveys / totalSurveys) * 100 : 0;

  // 3. Niveles de riesgo
  const riskData = await db
    .select({
      riskLevel: surveyResults.riskLevel,
      count: count(),
    })
    .from(surveyResults)
    .where(
      and(
        gte(surveyResults.calculatedAt, startDate),
        lte(surveyResults.calculatedAt, endDate)
      )
    )
    .groupBy(surveyResults.riskLevel);

  const highRiskCount = riskData.filter(r => r.riskLevel === "high" || r.riskLevel === "very_high").reduce((sum, r) => sum + r.count, 0);
  const mediumRiskCount = riskData.find(r => r.riskLevel === "medium")?.count || 0;
  const lowRiskCount = riskData.find(r => r.riskLevel === "low")?.count || 0;

  // 4. Empleados activos
  const employeesCount = await db
    .select({ count: count() })
    .from(employees)
    .where(eq(employees.activo, true));

  const totalEmployees = employeesCount[0]?.count || 0;

  // 5. Distribución por departamento
  const departmentData = await db
    .select({
      department: users.departamento,
      count: count(),
    })
    .from(users)
    .groupBy(users.departamento);

  return {
    period: {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
    },
    cases: {
      total: totalCases,
      open: openCases,
      closed: closedCases,
      critical: criticalCases,
      resolutionRate: totalCases > 0 ? (closedCases / totalCases) * 100 : 0,
    },
    surveys: {
      total: totalSurveys,
      completed: completedSurveys,
      completionRate,
    },
    risk: {
      high: highRiskCount,
      medium: mediumRiskCount,
      low: lowRiskCount,
      total: riskData.reduce((sum, r) => sum + r.count, 0),
    },
    employees: {
      total: totalEmployees,
      byDepartment: departmentData,
    },
  };
}

/**
 * Generar PDF del reporte ejecutivo
 */
async function generatePDF(reportData: any, reportType: string, periodLabel: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Portada
    doc.fontSize(24).font('Helvetica-Bold').text('Reporte Ejecutivo NOM-035', { align: 'center' });
    doc.moveDown();
    doc.fontSize(16).font('Helvetica').text(periodLabel, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Periodo: ${reportData.period.startDate} a ${reportData.period.endDate}`, { align: 'center' });
    doc.moveDown(3);

    // Sección: Resumen Ejecutivo
    doc.fontSize(18).font('Helvetica-Bold').text('Resumen Ejecutivo', { underline: true });
    doc.moveDown();

    doc.fontSize(12).font('Helvetica');
    doc.text(`Total de Empleados: ${reportData.employees.total}`);
    doc.text(`Encuestas Completadas: ${reportData.surveys.completed} de ${reportData.surveys.total} (${reportData.surveys.completionRate.toFixed(1)}%)`);
    doc.text(`Casos Registrados: ${reportData.cases.total}`);
    doc.text(`Casos Críticos: ${reportData.cases.critical}`);
    doc.text(`Tasa de Resolución: ${reportData.cases.resolutionRate.toFixed(1)}%`);
    doc.moveDown(2);

    // Sección: Casos NOM-035
    doc.fontSize(16).font('Helvetica-Bold').text('Casos NOM-035', { underline: true });
    doc.moveDown();

    doc.fontSize(12).font('Helvetica');
    doc.text(`Total de Casos: ${reportData.cases.total}`);
    doc.text(`Casos Abiertos: ${reportData.cases.open}`);
    doc.text(`Casos Cerrados: ${reportData.cases.closed}`);
    doc.text(`Casos Críticos: ${reportData.cases.critical}`);
    doc.moveDown(2);

    // Sección: Evaluación de Riesgo Psicosocial
    doc.fontSize(16).font('Helvetica-Bold').text('Evaluación de Riesgo Psicosocial', { underline: true });
    doc.moveDown();

    doc.fontSize(12).font('Helvetica');
    doc.text(`Total Evaluado: ${reportData.risk.total} empleados`);
    doc.text(`Riesgo Alto/Muy Alto: ${reportData.risk.high} (${reportData.risk.total > 0 ? ((reportData.risk.high / reportData.risk.total) * 100).toFixed(1) : 0}%)`);
    doc.text(`Riesgo Medio: ${reportData.risk.medium} (${reportData.risk.total > 0 ? ((reportData.risk.medium / reportData.risk.total) * 100).toFixed(1) : 0}%)`);
    doc.text(`Riesgo Bajo: ${reportData.risk.low} (${reportData.risk.total > 0 ? ((reportData.risk.low / reportData.risk.total) * 100).toFixed(1) : 0}%)`);
    doc.moveDown(2);

    // Sección: Distribución por Departamento
    doc.fontSize(16).font('Helvetica-Bold').text('Distribución por Departamento', { underline: true });
    doc.moveDown();

    doc.fontSize(12).font('Helvetica');
    reportData.employees.byDepartment.forEach((dept: any) => {
      doc.text(`${dept.department || 'Sin departamento'}: ${dept.count} empleados`);
    });
    doc.moveDown(2);

    // Sección: Recomendaciones
    doc.fontSize(16).font('Helvetica-Bold').text('Recomendaciones', { underline: true });
    doc.moveDown();

    doc.fontSize(12).font('Helvetica');
    
    if (reportData.cases.critical > 0) {
      doc.text(`• Atención inmediata a ${reportData.cases.critical} casos críticos pendientes`);
    }
    
    if (reportData.risk.high > 0) {
      doc.text(`• Implementar intervenciones para ${reportData.risk.high} empleados en riesgo alto`);
    }
    
    if (reportData.surveys.completionRate < 80) {
      doc.text(`• Incrementar tasa de respuesta de encuestas (actual: ${reportData.surveys.completionRate.toFixed(1)}%)`);
    }
    
    if (reportData.cases.resolutionRate < 70) {
      doc.text(`• Mejorar tasa de resolución de casos (actual: ${reportData.cases.resolutionRate.toFixed(1)}%)`);
    }

    doc.moveDown(3);

    // Pie de página
    doc.fontSize(10).font('Helvetica').text(
      `Generado el ${new Date().toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}`,
      { align: 'center' }
    );

    doc.end();
  });
}

export const executiveReportsRouter = router({
  /**
   * Generar reporte ejecutivo
   */
  generateReport: protectedProcedure
    .input(
      z.object({
        reportType: z.enum(["weekly", "monthly", "quarterly", "custom"]),
        startDate: z.string(), // ISO date string
        endDate: z.string(),
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

        const startDate = new Date(input.startDate);
        const endDate = new Date(input.endDate);

        // Generar etiqueta del periodo
        let periodLabel = "";
        if (input.reportType === "weekly") {
          periodLabel = `Reporte Semanal - ${startDate.toLocaleDateString('es-MX')}`;
        } else if (input.reportType === "monthly") {
          periodLabel = `Reporte Mensual - ${startDate.toLocaleDateString('es-MX', { month: 'long', year: 'numeric' })}`;
        } else if (input.reportType === "quarterly") {
          periodLabel = `Reporte Trimestral - ${startDate.toLocaleDateString('es-MX')}`;
        } else {
          periodLabel = `Reporte Personalizado - ${startDate.toLocaleDateString('es-MX')} a ${endDate.toLocaleDateString('es-MX')}`;
        }

        // Consolidar datos
        const reportData = await consolidateReportData(startDate, endDate);

        // Generar PDF
        const pdfBuffer = await generatePDF(reportData, input.reportType, periodLabel);

        // Subir a S3
        const timestamp = Date.now();
        const fileKey = `executive-reports/report-${input.reportType}-${timestamp}.pdf`;
        const { url: fileUrl } = await storagePut(fileKey, pdfBuffer, "application/pdf");

        // Guardar en historial
        const [report] = await db.insert(executiveReportsHistory).values({
          reportType: input.reportType,
          periodLabel,
          startDate: startDate.toISOString().split('T')[0] as any,
          endDate: endDate.toISOString().split('T')[0] as any,
          fileUrl,
          fileKey,
          fileSize: pdfBuffer.length,
          generatedBy: ctx.user.id,
          reportData: JSON.stringify(reportData),
        });

        return {
          success: true,
          reportId: report.insertId,
          fileUrl,
          periodLabel,
        };
      } catch (error) {
        console.error("[ExecutiveReports] Error generating report:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Error al generar reporte",
        });
      }
    }),

  /**
   * Obtener historial de reportes generados
   */
  getHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(20),
      })
    )
    .query(async ({ input }) => {
      try {
        const db = await getDb();
        if (!db) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Database connection failed",
          });
        }

        const history = await db
          .select({
            id: executiveReportsHistory.id,
            reportType: executiveReportsHistory.reportType,
            periodLabel: executiveReportsHistory.periodLabel,
            startDate: executiveReportsHistory.startDate,
            endDate: executiveReportsHistory.endDate,
            fileUrl: executiveReportsHistory.fileUrl,
            fileSize: executiveReportsHistory.fileSize,
            generatedBy: executiveReportsHistory.generatedBy,
            generatedAt: executiveReportsHistory.generatedAt,
            generatorName: users.name,
          })
          .from(executiveReportsHistory)
          .leftJoin(users, eq(executiveReportsHistory.generatedBy, users.id))
          .orderBy(desc(executiveReportsHistory.generatedAt))
          .limit(input.limit);

        return history;
      } catch (error) {
        console.error("[ExecutiveReports] Error getting history:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Error al obtener historial",
        });
      }
    }),
});
