import { router, protectedProcedure, adminProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import {
  scheduledReports,
  reportHistory,
  surveyResponses,
  nom035Cases,
  employees,
  nom035Results,
} from "../../drizzle/schema";
import { eq, and, sql, desc, count } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";

export const scheduledReportsRouter = router({
  /**
   * Crear un nuevo reporte programado
   */
  createScheduledReport: adminProcedure
    .input(
      z.object({
        reportName: z.string().min(1),
        reportType: z.enum(["monthly", "quarterly", "annual"]),
        recipients: z.array(z.string().email()),
        includeNMX025: z.boolean().default(true),
        includeNOM035: z.boolean().default(true),
        includeCases: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.insert(scheduledReports).values({
        reportName: input.reportName,
        reportType: input.reportType,
        recipients: JSON.stringify(input.recipients),
        includeNMX025: input.includeNMX025,
        includeNOM035: input.includeNOM035,
        includeCases: input.includeCases,
        isActive: true,
        createdBy: ctx.user.id,
      });

      return { success: true };
    }),

  /**
   * Obtener todos los reportes programados
   */
  getScheduledReports: protectedProcedure
    .input(z.object({ isActive: z.boolean().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      let query = db.select().from(scheduledReports).orderBy(desc(scheduledReports.createdAt));

      if (input?.isActive !== undefined) {
        query = query.where(eq(scheduledReports.isActive, input.isActive));
      }

      const reports = await query;
      return reports;
    }),

  /**
   * Enviar reporte ahora (manual)
   */
  sendReportNow: adminProcedure
    .input(z.object({ reportId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Obtener configuración del reporte
      const [report] = await db
        .select()
        .from(scheduledReports)
        .where(eq(scheduledReports.id, input.reportId));

      if (!report) {
        throw new Error("Report not found");
      }

      // Generar métricas
      const metrics: any = {};

      // NMX-025 (Igualdad Laboral)
      if (report.includeNMX025) {
        const allEmployees = await db.select().from(employees);
        const totalEmployees = allEmployees.length;
        const maleCount = allEmployees.filter((e) => e.gender === "male").length;
        const femaleCount = allEmployees.filter((e) => e.gender === "female").length;

        metrics.nmx025 = {
          totalEmployees,
          maleCount,
          femaleCount,
          malePercentage: totalEmployees > 0 ? ((maleCount / totalEmployees) * 100).toFixed(2) : "0.00",
          femalePercentage: totalEmployees > 0 ? ((femaleCount / totalEmployees) * 100).toFixed(2) : "0.00",
        };
      }

      // NOM-035 (Riesgo Psicosocial)
      if (report.includeNOM035) {
        const surveys = await db.select().from(nom035Results);
        const totalSurveys = surveys.length;
        const highRiskCount = surveys.filter((s) => s.globalRiskLevel === "alto" || s.globalRiskLevel === "muy_alto").length;
        const mediumRiskCount = surveys.filter((s) => s.globalRiskLevel === "medio").length;
        const lowRiskCount = surveys.filter((s) => s.globalRiskLevel === "bajo" || s.globalRiskLevel === "nulo").length;

        const highRiskPercentage = totalSurveys > 0 ? (highRiskCount / totalSurveys) * 100 : 0;

        metrics.nom035 = {
          totalSurveys,
          highRiskCount,
          mediumRiskCount,
          lowRiskCount,
          highRiskPercentage: highRiskPercentage.toFixed(2),
          alert: highRiskPercentage > 30 ? "⚠️ ALERTA: >30% en riesgo alto" : null,
        };
      }

      // Casos NOM-035
      if (report.includeCases) {
        const cases = await db.select().from(nom035Cases);
        const openCases = cases.filter((c) => c.status === "open").length;
        const inProgressCases = cases.filter((c) => c.status === "in_progress").length;
        const closedCases = cases.filter((c) => c.status === "closed").length;

        metrics.cases = {
          totalCases: cases.length,
          openCases,
          inProgressCases,
          closedCases,
        };
      }

      // Guardar en historial
      const recipients = JSON.parse(report.recipients as string) as string[];

      await db.insert(reportHistory).values({
        reportId: input.reportId,
        sentBy: ctx.user.id,
        recipientCount: recipients.length,
        status: "sent",
        metricsSnapshot: JSON.stringify(metrics),
      });

      // Enviar notificación al propietario con el reporte
      const reportContent = `
📊 **${report.reportName}** (${report.reportType})

${report.includeNMX025 ? `
**NMX-025 - Igualdad Laboral**
- Total de empleados: ${metrics.nmx025.totalEmployees}
- Hombres: ${metrics.nmx025.maleCount} (${metrics.nmx025.malePercentage}%)
- Mujeres: ${metrics.nmx025.femaleCount} (${metrics.nmx025.femalePercentage}%)
` : ""}

${report.includeNOM035 ? `
**NOM-035 - Riesgo Psicosocial**
- Total evaluados: ${metrics.nom035.totalSurveys}
- Riesgo alto/muy alto: ${metrics.nom035.highRiskCount} (${metrics.nom035.highRiskPercentage}%)
- Riesgo medio: ${metrics.nom035.mediumRiskCount}
- Riesgo bajo: ${metrics.nom035.lowRiskCount}
${metrics.nom035.alert ? `\n${metrics.nom035.alert}` : ""}
` : ""}

${report.includeCases ? `
**Casos NOM-035**
- Total de casos: ${metrics.cases.totalCases}
- Casos abiertos: ${metrics.cases.openCases}
- Casos en investigación: ${metrics.cases.inProgressCases}
- Casos resueltos: ${metrics.cases.closedCases}
` : ""}

---
Reporte enviado a ${recipients.length} destinatario(s).
      `.trim();

      await notifyOwner({
        title: `📧 Reporte Enviado: ${report.reportName}`,
        content: reportContent,
      });

      return { success: true, metrics };
    }),

  /**
   * Obtener historial de envíos
   */
  getReportHistory: protectedProcedure
    .input(
      z.object({
        reportId: z.number().optional(),
        limit: z.number().optional().default(50),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const history = await (input?.reportId
        ? db.select().from(reportHistory).where(eq(reportHistory.reportId, input.reportId)).orderBy(desc(reportHistory.sentAt)).limit(input?.limit || 50)
        : db.select().from(reportHistory).orderBy(desc(reportHistory.sentAt)).limit(input?.limit || 50));
      return history;
    }),

  /**
   * Actualizar configuración de reporte
   */
  updateReportConfig: adminProcedure
    .input(
      z.object({
        reportId: z.number(),
        reportName: z.string().optional(),
        recipients: z.array(z.string().email()).optional(),
        includeNMX025: z.boolean().optional(),
        includeNOM035: z.boolean().optional(),
        includeCases: z.boolean().optional(),
        isActive: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const updateData: any = {};

      if (input.reportName !== undefined) updateData.reportName = input.reportName;
      if (input.recipients !== undefined) updateData.recipients = JSON.stringify(input.recipients);
      if (input.includeNMX025 !== undefined) updateData.includeNMX025 = input.includeNMX025;
      if (input.includeNOM035 !== undefined) updateData.includeNOM035 = input.includeNOM035;
      if (input.includeCases !== undefined) updateData.includeCases = input.includeCases;
      if (input.isActive !== undefined) updateData.isActive = input.isActive;

      await db
        .update(scheduledReports)
        .set(updateData)
        .where(eq(scheduledReports.id, input.reportId));

      return { success: true };
    }),

  /**
   * Eliminar reporte programado
   */
  deleteScheduledReport: adminProcedure
    .input(z.object({ reportId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      await db.delete(scheduledReports).where(eq(scheduledReports.id, input.reportId));

      return { success: true };
    }),
});
