/**
 * Job programado para enviar alertas semanales de cobertura de encuestas NOM-035
 * Se ejecuta cada lunes a las 8:00 AM para detectar encuestas con cobertura < 80%
 */

import { appRouter } from "../routers";
import { sendCoverageAlertNotification } from "../services/survey-coverage-email-service";

/**
 * Ejecutar verificación de cobertura y enviar correos
 */
export async function runCoverageAlertsCheck() {
  console.log('[Coverage Alerts Job] Starting weekly coverage check...');
  
  try {
    // Crear un caller para ejecutar procedimientos tRPC
    const caller = appRouter.createCaller({
      user: { id: 1, email: "system@nom035.com", name: "Sistema", role: "admin" },
    } as any);

    // Obtener alertas de cobertura insuficiente
    console.log('[Coverage Alerts Job] Fetching coverage alerts...');
    const result = await caller.earlyWarnings.getSurveyCoverageAlerts();
    
    if (!result || !result.alerts || result.alerts.length === 0) {
      console.log('[Coverage Alerts Job] No coverage alerts found. All surveys meet the 80% threshold.');
      return {
        success: true,
        alertsSent: 0,
        message: 'No alerts to send',
      };
    }

    console.log(`[Coverage Alerts Job] Found ${result.totalAlerts} survey(s) with insufficient coverage`);

    // Obtener correo del coordinador (puede ser una variable de entorno o configuración)
    const coordinatorEmail = process.env.COORDINATOR_EMAIL || process.env.OWNER_EMAIL || 'admin@nom035.com';
    
    // Enviar correo con alertas
    console.log(`[Coverage Alerts Job] Sending alert email to ${coordinatorEmail}...`);
    const emailSent = await sendCoverageAlertNotification({
      to: coordinatorEmail,
      alerts: result.alerts,
    });

    if (emailSent) {
      console.log('[Coverage Alerts Job] Alert email sent successfully');
      return {
        success: true,
        alertsSent: 1,
        totalAlerts: result.totalAlerts,
        coordinatorEmail,
      };
    } else {
      console.error('[Coverage Alerts Job] Failed to send alert email');
      return {
        success: false,
        alertsSent: 0,
        error: 'Failed to send email',
      };
    }
    
  } catch (error) {
    console.error('[Coverage Alerts Job] Error running coverage alerts check:', error);
    return {
      success: false,
      alertsSent: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Iniciar job programado
 * Se ejecuta cada lunes a las 8:00 AM
 */
export function startCoverageAlertsJob() {
  console.log('[Coverage Alerts Job] Initializing weekly coverage alerts job (Mondays at 8:00 AM)...');
  
  // Calcular tiempo hasta el próximo lunes a las 8:00 AM
  const now = new Date();
  const nextMonday = new Date(now);
  
  // Calcular días hasta el próximo lunes (0 = domingo, 1 = lunes, etc.)
  const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
  nextMonday.setDate(now.getDate() + daysUntilMonday);
  nextMonday.setHours(8, 0, 0, 0);
  
  // Si ya pasó la hora de hoy y es lunes, programar para el próximo lunes
  if (now.getDay() === 1 && now.getHours() >= 8) {
    nextMonday.setDate(nextMonday.getDate() + 7);
  }
  
  const msUntilNextMonday = nextMonday.getTime() - now.getTime();
  
  console.log(`[Coverage Alerts Job] Next execution scheduled for: ${nextMonday.toLocaleString('es-MX')}`);
  
  // Programar primera ejecución
  setTimeout(() => {
    runCoverageAlertsCheck();
    
    // Programar ejecuciones semanales (cada 7 días)
    const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;
    setInterval(() => {
      runCoverageAlertsCheck();
    }, ONE_WEEK);
  }, msUntilNextMonday);
  
  console.log('[Coverage Alerts Job] Weekly coverage alerts job started successfully');
}
