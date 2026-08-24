/**
 * Job programado para detectar casos abiertos sin seguimiento
 * Se ejecuta cada 24 horas para detectar:
 * - Casos abiertos por más de 7 días sin cambio de estado
 * - Casos críticos abiertos por más de 3 días
 *
 * DEDUPLICACIÓN: Antes de crear una notificación, verifica si ya se envió
 * una notificación del mismo tipo para el mismo caso al mismo usuario
 * en las últimas 24 horas. Si existe, la omite para evitar spam masivo.
 */

import { getDb, createNotification, getAllCommitteeMembers } from "../db";
import { logJobExecution } from "../jobLogger";
import { cases, notifications } from "../../drizzle/schema";
import { and, eq, lt, gt, sql } from "drizzle-orm";

const DEDUP_WINDOW_MS = 24 * 60 * 60 * 1000; // 24 horas

/**
 * Verifica si ya existe una notificación para el mismo caso+usuario en las últimas 24h.
 * Evita enviar 655 notificaciones repetidas en cada ejecución del job.
 */
async function wasAlreadyNotified(
  db: Awaited<ReturnType<typeof getDb>>,
  userId: number,
  caseId: number,
  type: string
): Promise<boolean> {
  if (!db) return false;
  const since = new Date(Date.now() - DEDUP_WINDOW_MS);
  const existing = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.relatedEntityId, caseId),
        sql`${notifications.type} = ${type}`,
        gt(notifications.createdAt, since)
      )
    )
    .limit(1);
  return existing.length > 0;
}

/**
 * Ejecutar verificación de casos estancados
 */
export async function runStaleCasesCheck() {
  console.log("[Stale Cases Job] Starting automated stale cases check...");

  try {
    const db = await getDb();
    if (!db) {
      console.error("[Stale Cases Job] Database not available");
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
        and(sql`${cases.status} = 'open'`, lt(cases.createdAt, sevenDaysAgo))
      );

    console.log(
      `[Stale Cases Job] Found ${staleCases.length} cases open for more than 7 days`
    );

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

    console.log(
      `[Stale Cases Job] Found ${criticalStaleCases.length} critical cases open for more than 3 days`
    );

    // Obtener miembros del comité
    const members = await getAllCommitteeMembers();

    if (members.length === 0) {
      console.warn("[Stale Cases Job] No committee members found");
      return {
        success: true,
        staleCasesFound: staleCases.length,
        criticalStaleCasesFound: criticalStaleCases.length,
        notificationsSent: 0,
        notificationsSkipped: 0,
      };
    }

    let notificationsSent = 0;
    let notificationsSkipped = 0;

    // Notificar casos estancados regulares (>7 días) — con deduplicación 24h
    for (const caseData of staleCases) {
      const daysOpen = Math.floor(
        (now.getTime() - new Date(caseData.createdAt).getTime()) /
          (24 * 60 * 60 * 1000)
      );

      for (const member of members) {
        try {
          // DEDUPLICACIÓN: omitir si ya se notificó en las últimas 24h
          const alreadyNotified = await wasAlreadyNotified(
            db,
            member.id,
            caseData.id,
            "deadline_approaching"
          );
          if (alreadyNotified) {
            notificationsSkipped++;
            continue;
          }

          await createNotification({
            userId: member.id,
            type: "deadline_approaching",
            title: "Caso sin seguimiento",
            message: `El caso ${caseData.caseNumber} lleva ${daysOpen} días abierto sin cambio de estado. Requiere atención.`,
            relatedEntityType: "case",
            relatedEntityId: caseData.id,
          });
          notificationsSent++;
        } catch (error) {
          console.error(
            `[Stale Cases Job] Error creating notification for case ${caseData.caseNumber}:`,
            error
          );
        }
      }
    }

    // Notificar casos críticos estancados (>3 días) — con deduplicación 24h
    for (const caseData of criticalStaleCases) {
      const daysOpen = Math.floor(
        (now.getTime() - new Date(caseData.createdAt).getTime()) /
          (24 * 60 * 60 * 1000)
      );

      for (const member of members) {
        try {
          // DEDUPLICACIÓN: omitir si ya se notificó en las últimas 24h
          const alreadyNotified = await wasAlreadyNotified(
            db,
            member.id,
            caseData.id,
            "deadline_approaching"
          );
          if (alreadyNotified) {
            notificationsSkipped++;
            continue;
          }

          await createNotification({
            userId: member.id,
            type: "deadline_approaching",
            title: "¡URGENTE! Caso Crítico sin atención",
            message: `El caso CRÍTICO ${caseData.caseNumber} lleva ${daysOpen} días abierto. Requiere atención INMEDIATA.`,
            relatedEntityType: "case",
            relatedEntityId: caseData.id,
          });
          notificationsSent++;
        } catch (error) {
          console.error(
            `[Stale Cases Job] Error creating notification for critical case ${caseData.caseNumber}:`,
            error
          );
        }
      }
    }

    console.log(
      `[Stale Cases Job] Check completed. Sent ${notificationsSent} notifications (${notificationsSkipped} skipped — already notified in last 24h)`
    );

    return {
      success: true,
      staleCasesFound: staleCases.length,
      criticalStaleCasesFound: criticalStaleCases.length,
      notificationsSent,
      notificationsSkipped,
    };
  } catch (error) {
    console.error("[Stale Cases Job] Error during stale cases check:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Iniciar job programado
 * Se ejecuta cada 24 horas
 */
export function startStaleCasesJob() {
  console.log(
    "[Stale Cases Job] Initializing automated stale cases check job (every 24 hours)..."
  );

  // Ejecutar inmediatamente al iniciar (dentro del setTimeout de 30s en index.ts)
  logJobExecution("stale-cases", runStaleCasesCheck);

  // Programar ejecución cada 24 horas (24 * 60 * 60 * 1000 ms)
  const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;
  setInterval(() => {
    logJobExecution("stale-cases", runStaleCasesCheck);
  }, TWENTY_FOUR_HOURS);

  console.log(
    "[Stale Cases Job] Automated stale cases check job started successfully"
  );
}
