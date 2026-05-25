/**
 * Job programado para detectar actividad sospechosa automáticamente.
 * Se ejecuta cada 15 minutos para analizar el log de auditoría y detectar:
 *   - Múltiples descargas en corto tiempo (>5 en 10 minutos)
 *   - Accesos desde IPs desconocidas
 *   - Accesos fuera de horario laboral (antes de 7am o después de 8pm)
 *
 * Incluye reintentos con backoff exponencial para manejar errores ECONNRESET
 * y otras fallas transitorias de conexión a la base de datos.
 */

import { getDb } from "../db";
import { documentAuditLog, users } from "../../drizzle/schema";
import { securityAlertsRouter } from "../routers/securityAlerts";
import { gte, eq, and } from "drizzle-orm";
import { logJobExecution } from "../jobLogger";

// ─── Backoff exponencial ─────────────────────────────────────────────────────

const RETRYABLE_CODES = ["ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND", "EPIPE", "EHOSTUNREACH"];

function isRetryableError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;
  const code = (err as NodeJS.ErrnoException).code ?? "";
  if (RETRYABLE_CODES.includes(code)) return true;
  const cause = (err as any).cause;
  if (cause instanceof Error) {
    const causeCode = (cause as NodeJS.ErrnoException).code ?? "";
    if (RETRYABLE_CODES.includes(causeCode)) return true;
  }
  for (const c of RETRYABLE_CODES) {
    if (err.message.includes(c)) return true;
  }
  return false;
}

/**
 * Ejecuta `fn` con hasta `maxAttempts` reintentos usando backoff exponencial.
 * Delays: 500 ms → 1 s → 2 s (base 500 ms, factor 2).
 * Solo reintenta ante errores de red transitorios.
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  opts: { maxAttempts?: number; baseDelayMs?: number; label?: string } = {}
): Promise<T> {
  const { maxAttempts = 3, baseDelayMs = 500, label = "operation" } = opts;
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (!isRetryableError(err) || attempt === maxAttempts) throw err;
      const delay = baseDelayMs * Math.pow(2, attempt - 1);
      console.warn(
        `[Security Alerts Job] ${label} failed (attempt ${attempt}/${maxAttempts}), retrying in ${delay}ms...`,
        err instanceof Error ? err.message : err
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw lastError;
}

// ─── Lógica principal ────────────────────────────────────────────────────────

export async function runSecurityAlertsCheck() {
  console.log("[Security Alerts Job] Starting automated security check...");

  try {
    const db = await withRetry(() => getDb(), { label: "getDb" });
    if (!db) {
      console.error("[Security Alerts Job] Database not available");
      return { success: false, error: "Database not available" };
    }

    const caller = securityAlertsRouter.createCaller({
      user: null as any,
      req: {} as any,
      res: {} as any,
    });

    // Accesos de los últimos 15 minutos
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const recentAccesses = await withRetry(
      () => db.select().from(documentAuditLog).where(gte(documentAuditLog.timestamp, fifteenMinutesAgo)),
      { label: "fetch recent accesses" }
    );

    console.log(`[Security Alerts Job] Found ${recentAccesses.length} recent accesses to analyze`);

    // Agrupar por usuario
    const accessesByUser = recentAccesses.reduce<Record<number, typeof recentAccesses>>((acc, access) => {
      if (!access.userId) return acc;
      if (!acc[access.userId]) acc[access.userId] = [];
      acc[access.userId].push(access);
      return acc;
    }, {});

    let alertsCreated = 0;

    for (const [userIdStr, userAccesses] of Object.entries(accessesByUser)) {
      const userId = parseInt(userIdStr, 10);

      // Obtener usuario con reintento
      let user: (typeof users.$inferSelect) | undefined;
      try {
        const rows = await withRetry(
          () => db.select().from(users).where(eq(users.id, userId)).limit(1),
          { label: `fetch user ${userId}` }
        );
        user = rows[0];
      } catch (err) {
        console.error(`[Security Alerts Job] Could not fetch user ${userId}:`, err);
        continue;
      }
      if (!user) continue;

      // 1. Múltiples descargas (>5 en 15 min)
      const downloads = userAccesses.filter((a) => a.action === "download");
      if (downloads.length > 5) {
        console.log(`[Security Alerts Job] ${downloads.length} downloads from user ${user.name}`);
        try {
          await withRetry(
            () => caller.detectSuspiciousActivity({ userId, ipAddress: downloads[0].ipAddress ?? undefined }),
            { label: "detectSuspiciousActivity (downloads)", maxAttempts: 2 }
          );
          alertsCreated++;
        } catch (err) {
          console.error(`[Security Alerts Job] Error on suspicious downloads for user ${userId}:`, err);
        }
      }

      // 2. IPs desconocidas
      const uniqueIPs = Array.from(new Set(userAccesses.map((a) => a.ipAddress).filter(Boolean)));
      for (const ip of uniqueIPs) {
        try {
          const historical = await withRetry(
            () =>
              db
                .select()
                .from(documentAuditLog)
                .where(
                  and(
                    eq(documentAuditLog.userId, userId),
                    gte(documentAuditLog.timestamp, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
                  )
                ),
            { label: `historical accesses user ${userId}` }
          );
          const knownIPs = new Set(historical.map((a) => a.ipAddress).filter(Boolean));
          if (knownIPs.size > 5 && !knownIPs.has(ip)) {
            console.log(`[Security Alerts Job] Unknown IP ${ip} for user ${user.name}`);
            try {
              await withRetry(
                () => caller.detectSuspiciousActivity({ userId, ipAddress: ip as string }),
                { label: "detectSuspiciousActivity (unknown IP)", maxAttempts: 2 }
              );
              alertsCreated++;
            } catch (err) {
              console.error(`[Security Alerts Job] Error on unknown IP for user ${userId}:`, err);
            }
          }
        } catch (err) {
          console.error(`[Security Alerts Job] Could not fetch historical accesses for user ${userId}:`, err);
        }
      }

      // 3. Accesos fuera de horario (antes 7am / después 8pm)
      const offHours = userAccesses.filter((a) => {
        const h = new Date(a.timestamp).getHours();
        return h < 7 || h >= 20;
      });
      if (offHours.length > 0) {
        console.log(`[Security Alerts Job] ${offHours.length} off-hours accesses from user ${user.name}`);
        try {
          await withRetry(
            () =>
              caller.detectSuspiciousActivity({
                userId,
                ipAddress: offHours[0].ipAddress ?? undefined,
              }),
            { label: "detectSuspiciousActivity (off-hours)", maxAttempts: 2 }
          );
          alertsCreated++;
        } catch (err) {
          console.error(`[Security Alerts Job] Error on off-hours access for user ${userId}:`, err);
        }
      }
    }

    console.log(`[Security Alerts Job] Completed. Alerts created: ${alertsCreated}`);
    return {
      success: true,
      accessesAnalyzed: recentAccesses.length,
      usersAnalyzed: Object.keys(accessesByUser).length,
      alertsCreated,
    };
  } catch (error) {
    console.error("[Security Alerts Job] Fatal error:", error);
    return { success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

// ─── Scheduler ───────────────────────────────────────────────────────────────

export function startSecurityAlertsJob() {
  console.log("[Security Alerts Job] Initializing (every 15 min, with exponential backoff)...");
  const securityWrapper = async () => {
    const r = await runSecurityAlertsCheck();
    return { itemsProcessed: r?.alertsCreated ?? 0 };
  };
  logJobExecution('security-alerts', securityWrapper);
  setInterval(() => logJobExecution('security-alerts', securityWrapper), 15 * 60 * 1000);
  console.log("[Security Alerts Job] Started successfully");
}
