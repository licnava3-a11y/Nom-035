/**
 * Job programado para verificar alertas de encuestas NOM-035
 * Se ejecuta cada 6 horas para detectar:
 * - Cobertura por debajo del 80%
 * - Trabajadores sin responder por 2+ días
 */

import { getDb } from "../db";
import { surveys, alertThresholds } from "../../drizzle/schema";
import { surveyAlertsRouter } from "../routers/surveyAlerts";
import { eq } from "drizzle-orm";
import { logJobExecution } from "../jobLogger";

/**
 * Ejecutar verificación de alertas
 */
export async function runSurveyAlertsCheck() {
  console.log('[Survey Alerts Job] Starting automated alerts check...');
  
  try {
    const db = await getDb();
    if (!db) {
      console.error('[Survey Alerts Job] Database not available');
      return;
    }

    // Obtener todas las encuestas activas
    const allSurveys = await db.select().from(surveys);
    console.log(`[Survey Alerts Job] Found ${allSurveys.length} surveys to check`);

    // Crear un caller simulado para ejecutar los procedimientos tRPC
    // Nota: En un entorno de producción, esto debería usar un sistema de jobs más robusto
    const caller = surveyAlertsRouter.createCaller({
      user: null,
      req: {} as any,
      res: {} as any,
    });

    // Obtener umbral de cobertura desde BD
    const [lowCoverageThreshold] = await db
      .select()
      .from(alertThresholds)
      .where(eq(alertThresholds.alertType, 'low_coverage'))
      .limit(1);

    const coverageThreshold = lowCoverageThreshold?.threshold || 80; // Valor por defecto si no existe
    console.log(`[Survey Alerts Job] Using coverage threshold: ${coverageThreshold}%`);

    // Verificar alertas de cobertura baja
    console.log('[Survey Alerts Job] Checking low coverage alerts...');
    const coverageResults = await caller.checkLowCoverageAlerts({ coverageThreshold });
    console.log(`[Survey Alerts Job] Coverage check completed:`, coverageResults);

    // Verificar alertas de trabajadores pendientes por 2+ días
    console.log('[Survey Alerts Job] Checking pending workers alerts...');
    const pendingResults = await caller.checkPendingWorkersAlerts({ daysThreshold: 2 });
    console.log(`[Survey Alerts Job] Pending workers check completed:`, pendingResults);

    console.log('[Survey Alerts Job] Automated alerts check completed successfully');
    
    return {
      success: true,
      coverage: coverageResults,
      pending: pendingResults,
    };
  } catch (error) {
    console.error('[Survey Alerts Job] Error running automated alerts check:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Iniciar job programado
 * Se ejecuta cada 6 horas
 */
export function startSurveyAlertsJob() {
  console.log('[Survey Alerts Job] Initializing automated alerts job (every 6 hours)...');
  
  // Ejecutar inmediatamente al iniciar
  const surveyWrapper = async () => {
    const r = await runSurveyAlertsCheck();
    const sent = (r?.coverage?.alertsSent ?? 0) + (r?.pending?.alertsSent ?? 0);
    return { notificationsSent: sent, itemsProcessed: r?.coverage?.checked ?? 0 };
  };
  logJobExecution('survey-alerts', surveyWrapper);
  
  // Programar ejecución cada 6 horas (6 * 60 * 60 * 1000 ms)
  const SIX_HOURS = 6 * 60 * 60 * 1000;
  setInterval(() => {
    logJobExecution('survey-alerts', surveyWrapper);
  }, SIX_HOURS);
  
  console.log('[Survey Alerts Job] Automated alerts job started successfully');
}
