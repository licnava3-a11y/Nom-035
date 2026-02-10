import cron from "node-cron";
import { getDb } from "../db";
import { systemSettings } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { sendAlertSummary } from "./alertSummaryJob";

/**
 * Job de cron para enviar resumen de alertas según configuración
 * - Weekly: Cada lunes a las 9:00 AM
 * - Monthly: Día 1 de cada mes a las 9:00 AM
 */

let weeklyJob: ReturnType<typeof cron.schedule> | null = null;
let monthlyJob: ReturnType<typeof cron.schedule> | null = null;

async function getAlertSummaryFrequency(): Promise<"weekly" | "monthly" | "disabled"> {
  try {
    const db = await getDb();
    if (!db) return "disabled";

    const [setting] = await db
      .select()
      .from(systemSettings)
      .where(eq(systemSettings.settingKey, "alert_summary_frequency"))
      .limit(1);

    if (!setting || !setting.settingValue) return "disabled";
    
    const frequency = setting.settingValue as "weekly" | "monthly" | "disabled";
    return frequency;
  } catch (error) {
    console.error("[Alert Summary Cron] Error al obtener frecuencia:", error);
    return "disabled";
  }
}

export async function startAlertSummaryCronJob() {
  console.log("[Alert Summary Cron] Iniciando job de resumen de alertas...");

  // Obtener frecuencia configurada
  const frequency = await getAlertSummaryFrequency();
  console.log(`[Alert Summary Cron] Frecuencia configurada: ${frequency}`);

  if (frequency === "disabled") {
    console.log("[Alert Summary Cron] Resumen de alertas deshabilitado");
    return;
  }

  // Job semanal: Cada lunes a las 9:00 AM
  if (frequency === "weekly") {
    if (weeklyJob) {
      weeklyJob.stop();
    }
    
    weeklyJob = cron.schedule("0 9 * * 1", async () => {
      console.log("[Alert Summary Cron] Ejecutando envío semanal...");
      await sendAlertSummary("weekly");
    }, {
      timezone: "America/Mexico_City"
    });

    console.log("[Alert Summary Cron] Job semanal programado: Lunes 9:00 AM");
  }

  // Job mensual: Día 1 de cada mes a las 9:00 AM
  if (frequency === "monthly") {
    if (monthlyJob) {
      monthlyJob.stop();
    }
    
    monthlyJob = cron.schedule("0 9 1 * *", async () => {
      console.log("[Alert Summary Cron] Ejecutando envío mensual...");
      await sendAlertSummary("monthly");
    }, {
      timezone: "America/Mexico_City"
    });

    console.log("[Alert Summary Cron] Job mensual programado: Día 1 de cada mes 9:00 AM");
  }
}

/**
 * Reiniciar job cuando cambia la configuración
 */
export async function restartAlertSummaryCronJob() {
  console.log("[Alert Summary Cron] Reiniciando job...");
  
  // Detener jobs existentes
  if (weeklyJob) {
    weeklyJob.stop();
    weeklyJob = null;
  }
  if (monthlyJob) {
    monthlyJob.stop();
    monthlyJob = null;
  }

  // Reiniciar con nueva configuración
  await startAlertSummaryCronJob();
}
