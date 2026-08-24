/**
 * Job de Alertas Departamentales Críticas
 * Detecta departamentos con riesgo alto y envía notificaciones automáticas
 */

import cron from "node-cron";
import { getDb } from "../db";
import { cases } from "../../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import { notifyOwner } from "../_core/notification";

/**
 * Detectar alertas departamentales críticas y enviar notificaciones
 */
async function checkDepartmentalAlerts() {
  try {
    const db = await getDb();
    if (!db) {
      console.error("[Departmental Alerts Job] Database not available");
      return { alertsSent: 0 };
    }

    let alertsSent = 0;

    // Obtener casos críticos abiertos
    const [criticalCases] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(cases)
      .where(
        and(sql`${cases.status} = 'open'`, sql`${cases.priority} = 'critical'`)
      );

    const criticalCount = criticalCases?.count || 0;

    // Alerta si hay 3 o más casos críticos abiertos
    if (criticalCount >= 3) {
      const success = await notifyOwner({
        title: "🚨 Alerta: Casos Críticos Acumulados",
        content:
          `Se han detectado ${criticalCount} casos críticos abiertos en el sistema NOM-035.\\n\\n` +
          `**Acción requerida:**\\n` +
          `- Revisar y priorizar casos críticos\\n` +
          `- Asignar responsables inmediatamente\\n` +
          `- Implementar medidas correctivas urgentes\\n\\n` +
          `Accede al dashboard para más detalles: /cases/assignment`,
      });

      if (success) {
        alertsSent++;
        console.log(
          `[Departmental Alerts Job] Critical cases alert sent (${criticalCount} cases)`
        );
      }
    }

    // Obtener casos sin asignar
    const [unassignedCases] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(cases)
      .where(
        and(sql`${cases.status} = 'open'`, sql`${cases.assignedTo} IS NULL`)
      );

    const unassignedCount = unassignedCases?.count || 0;

    // Alerta si hay 5 o más casos sin asignar
    if (unassignedCount >= 5) {
      const success = await notifyOwner({
        title: "⚠️ Alerta: Casos Sin Asignar",
        content:
          `Se han detectado ${unassignedCount} casos abiertos sin responsable asignado.\\n\\n` +
          `**Acción requerida:**\\n` +
          `- Asignar responsables a los casos pendientes\\n` +
          `- Revisar capacidad del equipo de atención\\n` +
          `- Priorizar casos por severidad\\n\\n` +
          `Accede al dashboard para más detalles: /cases/assignment`,
      });

      if (success) {
        alertsSent++;
        console.log(
          `[Departmental Alerts Job] Unassigned cases alert sent (${unassignedCount} cases)`
        );
      }
    }

    console.log(
      `[Departmental Alerts Job] Completed: ${alertsSent} alerts sent`
    );
    return { alertsSent };
  } catch (error) {
    console.error("[Departmental Alerts Job] Error:", error);
    return { alertsSent: 0 };
  }
}

/**
 * Configurar cron job para ejecutar diariamente a las 9:00 AM
 */
export function scheduleDepartmentalAlertsJob() {
  // Ejecutar diariamente a las 9:00 AM
  cron.schedule("0 9 * * *", async () => {
    console.log(
      "[Departmental Alerts Job] Cron triggered at",
      new Date().toISOString()
    );
    await checkDepartmentalAlerts();
  });

  console.log("[Departmental Alerts Job] Scheduled to run daily at 9:00 AM");
}

/**
 * Ejecutar job manualmente (para testing)
 */
export async function runDepartmentalAlertsJob() {
  console.log("[Departmental Alerts Job] Manual execution started");
  return await checkDepartmentalAlerts();
}
