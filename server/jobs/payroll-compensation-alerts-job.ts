/**
 * Job: Alertas de Compensación
 * Ejecuta mensualmente para detectar empleados con compensación por debajo del mercado
 */

import cron from "node-cron";
import { getDb } from "../db";
import { payrollData } from "../../drizzle/schema";
import { sql } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";

export function startPayrollCompensationAlertsJob() {
  // Ejecutar el primer día de cada mes a las 09:00 AM
  cron.schedule("0 9 1 * *", async () => {
    console.log("[Payroll Compensation Alerts Job] Starting monthly compensation review...");

    try {
      const db = await getDb();
      if (!db) {
        console.error("[Payroll Compensation Alerts Job] Database connection failed");
        return;
      }

      // Obtener empleados con brecha salarial crítica (< -10%)
      const criticalGaps = await db
        .select()
        .from(payrollData)
        .where(sql`${payrollData.requiresReview} = true`);

      if (criticalGaps.length === 0) {
        console.log("[Payroll Compensation Alerts Job] No critical salary gaps found");
        return;
      }

      // Agrupar por nivel de riesgo
      const critical = criticalGaps.filter((e) => e.compensationRiskLevel === "critical");
      const high = criticalGaps.filter((e) => e.compensationRiskLevel === "high");

      // Generar reporte de alertas
      let alertMessage = `🚨 **Alerta de Compensación Mensual**\n\n`;
      alertMessage += `Se detectaron **${criticalGaps.length} empleados** con compensación por debajo del mercado:\n\n`;

      if (critical.length > 0) {
        alertMessage += `**Nivel Crítico (< -20%):** ${critical.length} empleados\n`;
        critical.slice(0, 5).forEach((e) => {
          alertMessage += `- ${e.employeeName} (${e.department}): ${e.salaryGapPercentage}% por debajo del mercado\n`;
        });
        if (critical.length > 5) {
          alertMessage += `... y ${critical.length - 5} más\n`;
        }
        alertMessage += `\n`;
      }

      if (high.length > 0) {
        alertMessage += `**Nivel Alto (-10% a -20%):** ${high.length} empleados\n`;
        high.slice(0, 5).forEach((e) => {
          alertMessage += `- ${e.employeeName} (${e.department}): ${e.salaryGapPercentage}% por debajo del mercado\n`;
        });
        if (high.length > 5) {
          alertMessage += `... y ${high.length - 5} más\n`;
        }
      }

      alertMessage += `\n**Acción Recomendada:** Revisar compensación de empleados críticos para prevenir rotación.`;

      // Enviar notificación al owner
      const notificationSent = await notifyOwner({
        title: "Alerta de Compensación Mensual",
        content: alertMessage,
      });

      if (notificationSent) {
        console.log(`[Payroll Compensation Alerts Job] Alert sent: ${criticalGaps.length} employees require review`);
      } else {
        console.error("[Payroll Compensation Alerts Job] Failed to send notification");
      }
    } catch (error) {
      console.error("[Payroll Compensation Alerts Job] Error:", error);
    }
  });

  console.log("[Payroll Compensation Alerts Job] Scheduled to run on 1st of each month at 09:00 AM");
}
