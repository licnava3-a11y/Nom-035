import { getDb } from "../../db";
import {
  scheduledReports,
  reportHistory,
  surveyResponses,
  employees,
  nom035Cases,
} from "../../../drizzle/schema";
import { eq } from "drizzle-orm";
import { notifyOwner } from "../notification";

/**
 * Job automático para enviar reportes mensuales programados
 * Se ejecuta el 1er día de cada mes a las 8:00 AM
 */
export async function runMonthlyReportsJob() {
  console.log("[Monthly Reports Job] Starting automated monthly reports");

  try {
    const db = await getDb();
    if (!db) {
      console.error("[Monthly Reports Job] Database not available");
      return;
    }

    // Obtener reportes activos de tipo "monthly"
    const activeReports = await db
      .select()
      .from(scheduledReports)
      .where(eq(scheduledReports.isActive, true));

    const monthlyReports = activeReports.filter((r) => r.reportType === "monthly");

    if (monthlyReports.length === 0) {
      console.log("[Monthly Reports Job] No active monthly reports found");
      return;
    }

    console.log(`[Monthly Reports Job] Found ${monthlyReports.length} active monthly reports`);

    // Procesar cada reporte
    for (const report of monthlyReports) {
      try {
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
          const surveys = await db.select().from(surveyResponses);
          const totalSurveys = surveys.length;
          const highRiskCount = surveys.filter((s) => s.riskLevel === "high" || s.riskLevel === "very_high").length;
          const mediumRiskCount = surveys.filter((s) => s.riskLevel === "medium").length;
          const lowRiskCount = surveys.filter((s) => s.riskLevel === "low").length;

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
          reportId: report.id,
          sentBy: report.createdBy, // Usuario que creó el reporte
          recipientCount: recipients.length,
          status: "sent",
          metricsSnapshot: JSON.stringify(metrics),
        });

        // Enviar notificación al propietario con el reporte
        const reportContent = `
📊 **${report.reportName}** (Reporte Mensual Automático)

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
Reporte enviado automáticamente a ${recipients.length} destinatario(s).
        `.trim();

        await notifyOwner({
          title: `📧 Reporte Mensual Automático: ${report.reportName}`,
          content: reportContent,
        });

        console.log(`[Monthly Reports Job] Report "${report.reportName}" sent successfully`);
      } catch (error) {
        console.error(`[Monthly Reports Job] Error processing report ${report.id}:`, error);
      }
    }

    console.log("[Monthly Reports Job] Completed");
  } catch (error) {
    console.error("[Monthly Reports Job] Fatal error:", error);
  }
}
