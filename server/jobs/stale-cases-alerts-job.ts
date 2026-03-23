/**
 * Job programado para detectar casos abiertos sin seguimiento
 * Se ejecuta cada 24 horas para detectar:
 * - Casos abiertos por más de 7 días sin cambio de estado
 * - Casos críticos abiertos por más de 3 días
 */

import { getDb, createNotification, getAllCommitteeMembers } from "../db";
import { cases, committeeMembers, notifications } from "../../drizzle/schema";
import { and, eq, lt, sql } from "drizzle-orm";

/**
 * Ejecutar verificación de casos estancados
 */
export async function runStaleCasesCheck() {
  console.log('[Stale Cases Job] Starting automated stale cases check...');
  
  try {
    const db = await getDb();
    if (!db) {
      console.error('[Stale Cases Job] Database not available');
      return;
    }

    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

    // 1. Detectar casos abiertos >7 días
    const staleCases = await db
      .select()
      .from(cases)
      .where(
        and(
          sql`${cases.status} = 'open'`,
          lt(cases.createdAt, sevenDaysAgo)
        )
      );

    console.log(`[Stale Cases Job] Found ${staleCases.length} cases open for more than 7 days`);

    // 2. Detectar casos críticos >3 días
    const criticalStaleCases = await db
      .select()
      .from(cases)
      .where(
        and(
          sql`${cases.status} = 'open'`,
          sql`${cases.priority} = 'critical'`,
          lt(cases.createdAt, threeDaysAgo)
        )
      );

    console.log(`[Stale Cases Job] Found ${criticalStaleCases.length} critical cases open for more than 3 days`);

    // Obtener miembros del comité
    const committeeMembers = await getAllCommitteeMembers();
    
    if (committeeMembers.length === 0) {
      console.warn('[Stale Cases Job] No committee members found');
      return {
        success: true,
        staleCasesFound: staleCases.length,
        criticalStaleCasesFound: criticalStaleCases.length,
        notificationsSent: 0,
      };
    }

    let notificationsSent = 0;

    // Notificar casos estancados regulares (>7 días)
    for (const caseData of staleCases) {
      const daysOpen = Math.floor((now.getTime() - new Date(caseData.createdAt).getTime()) / (24 * 60 * 60 * 1000));
      
      for (const member of committeeMembers) {
        try {
          await createNotification({
            userId: member.id,
            type: 'deadline_approaching',
            title: 'Caso sin seguimiento',
            message: `El caso ${caseData.caseNumber} lleva ${daysOpen} días abierto sin cambio de estado. Requiere atención.`,
            relatedEntityType: 'case',
            relatedEntityId: caseData.id,
          });
          notificationsSent++;
        } catch (error) {
          console.error(`[Stale Cases Job] Error creating notification for case ${caseData.caseNumber}:`, error);
        }
      }
    }

    // Notificar casos críticos estancados (>3 días) - prioridad alta
    for (const caseData of criticalStaleCases) {
      const daysOpen = Math.floor((now.getTime() - new Date(caseData.createdAt).getTime()) / (24 * 60 * 60 * 1000));
      
      for (const member of committeeMembers) {
        try {
          await createNotification({
            userId: member.id,
            type: 'deadline_approaching',
            title: '¡URGENTE! Caso Crítico sin atención',
            message: `El caso CRÍTICO ${caseData.caseNumber} lleva ${daysOpen} días abierto. Requiere atención INMEDIATA.`,
            relatedEntityType: 'case',
            relatedEntityId: caseData.id,
          });
          notificationsSent++;
        } catch (error) {
          console.error(`[Stale Cases Job] Error creating notification for critical case ${caseData.caseNumber}:`, error);
        }
      }
    }

    console.log(`[Stale Cases Job] Check completed. Sent ${notificationsSent} notifications`);
    
    return {
      success: true,
      staleCasesFound: staleCases.length,
      criticalStaleCasesFound: criticalStaleCases.length,
      notificationsSent,
    };
  } catch (error) {
    console.error('[Stale Cases Job] Error during stale cases check:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Iniciar job programado
 * Se ejecuta cada 24 horas
 */
export function startStaleCasesJob() {
  console.log('[Stale Cases Job] Initializing automated stale cases check job (every 24 hours)...');
  
  // Ejecutar inmediatamente al iniciar
  runStaleCasesCheck();
  
  // Programar ejecución cada 24 horas (24 * 60 * 60 * 1000 ms)
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  setInterval(() => {
    runStaleCasesCheck();
  }, TWENTY_FOUR_HOURS);
  
  console.log('[Stale Cases Job] Automated stale cases check job started successfully');
}
