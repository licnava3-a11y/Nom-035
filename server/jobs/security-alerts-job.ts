/**
 * Job programado para detectar actividad sospechosa automáticamente
 * Se ejecuta cada 15 minutos para analizar el log de auditoría y detectar:
 * - Múltiples descargas en corto tiempo (>5 en 10 minutos)
 * - Accesos desde IPs desconocidas
 * - Accesos fuera de horario laboral (antes de 7am o después de 8pm)
 *
 * Incluye reintentos con backoff exponencial para manejar errores ECONNRESET
 * y otras fallas transitorias de conexión a la base de datos.
 */

import { getDb } from "../db";
import { documentAuditLog, users } from "../../drizzle/schema";
import { securityAlertsRouter } from "../routers/securityAlerts";
import { gte, eq, and } from "drizzle-orm";

// ─── Utilidad: reintento con backoff exponencial ────────────────────────────

const RETRYABLE_CODES = ["ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND", "EPIPE", "EHOSTUNREACH"];

function isRetryableError(err: unknown): boolean {
  if (err instanceof Error) {
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
  }
  return false;
}

/**
 * Ejecuta `fn` con hasta `maxAttempts` reintentos usando backoff exponencial.
 * Solo reintenta si el error es transitorio (ECONNRESET, ETIMEDOUT, etc.).
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  {
    maxAttempts = 3,
    baseDelayMs = 500,
    label = "operation",
  }: { maxAttempts?: number; baseDelayMs?: number; label?: string } = {}
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (!isRetryableError(err) || attempt === maxAttempts) throw err;
      const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
      console.warn(
        `[Security Alerts Job] ${label} failed (attempt ${attempt}/${maxAttempts}), retrying in ${delayMs}ms...`,
        err instanceof Error ? err.message : err
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

// ─── Lógica principal del job ────────────────────────────────────────────────

export async function runSecurityAlertsCheck() {
  console.log("[Security Alerts Job] Starting automated security check...");

  try {
    const db = await withRetry(() => getDb(), { label: "getDb", maxAttempts: 3 });
    if (!db) {
      console.error("[Security Alerts Job] Database not available");
      return;
    }

    const caller = securityAlertsRouter.createCaller({
      user: null as any,
      req: {} as any,
      res: {} as any,
    });

    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const recentAccesses = await withRetry(
      () => db.select().from(documentAuditLog).where(gte(documentAuditLog.timestamp, fifteenMinutesAgo)),
      { label: "fetch recent accesses", maxAttempts: 3 }
    );

    console.log(`[Security Alerts Job] Found ${recentAccesses.length} recent accesses to analyze`);

    const accessesByUser = recentAccesses.reduce((acc: any, access: any) => {
      if (!access.userId) return acc;
      if (!acc[access.userId]) acc[access.userId] = [];
      acc[access.userId].push(access);
      return acc;
    }, {});

    let alertsCreated = 0;

    for (const [userIdStr, accesses] of Object.entries(accessesByUser)) {
      const userId = parseInt(userIdStr);
      const userAccesses = accesses as any[];

      let user: any;
      try {
        const rows = await withRetry(
          () => db.select().from(users).where(eq(users.id, userId)).limit(1),
          { label: `fetch user ${userId}`, maxAttempts: 3 }
        );
        user = rows[0];
      } catch (err) {
        console.error(`[Security Alerts Job] Could not fetch user ${userId}:`, err);
        continue;
      }

      if (!user) continue;

      // 1. Múltiples descargas
      const downloads = userAccesses.filter((a: any) => a.action === "download");
      if (downloads.length > 5) {
        console.log(`[Security Alerts Job] Detected ${downloads.length} downloads from user ${user.name}`);
        try {
          await withRetry(
            () => caller.detectSuspiciousActivity({ userId, ipAddress: downloads[0].ipAddress || undefined }),
            { label: "detectSuspiciousActivity (downloads)", maxAttempts: 2 }
          );
          alertsCreated++;
        } catch (error) {
          console.error(`[Security Alerts Job] Error detecting suspicious activity for user ${userId}:`, error);
        }
      }

      // 2. IPs desconocidas
      const uniqueIPs = new Set(userAccesses.map((a: any) => a.ipAddress).filter(Boolean));
      for (const ip of Array.from(uniqueIPs)) {
        try {
          const historicalAccesses = await withRetry(
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
            { label: `fetch historical accesses for user ${userId}`, maxAttempts: 3 }
          );

          const historicalIPs = new Set(
            historicalAccesses.map((a: any) => a.ipAddress).filter((x: any) => x !== null)
          );

          if (historicalIPs.size > 5 && !historicalIPs.has(ip)) {
            console.log(`[Security Alerts Job] Detected unknown IP ${ip} for user ${user.name}`);
            try {
              await withRetry(
                () => caller.detectSuspiciousActivity({ userId, ipAddress: ip as string }),
                { label: "detectSuspiciousActivity (unknown IP)", maxAttempts: 2 }
              );
              alertsCreated++;
            } catch (error) {
              console.error(`[Security Alerts Job] Error detecting unknown IP for user ${userId}:`, error);
            }
          }
        } catch (err) {
          console.error(`[Security Alerts Job] Could not fetch historical accesses for user ${userId}:`, err);
        }
      }

      // 3. Accesos fuera de horario
      const offHoursAccesses = userAccesses.filter((a: any) => {
        const hour = new Date(a.timestamp).getHours();
        return hour < 7 || hour >= 20;
      });

      if (offHoursAccesses.length > 0) {
        console.log(
          `[Security Alerts Job] Detected ${offHoursAccesses.length} off-hours accesses from user ${user.name}`
        );
        try {
          await withRetry(
            () =>
              caller.detectSuspiciousActivity({
                userId,
                ipAddress: offHoursAccesses[0].ipAddress || undefined,
              }),
            { label: "detectSuspiciousActivity (off-hours)", maxAttempts: 2 }
          );
          alertsCreated++;
        } catch (error) {
          console.error(`[Security Alerts Job] Error detecting off-hours access for user ${userId}:`, error);
        }
      }
    }

    console.log(`[Security Alerts Job] Security check completed. Created ${alertsCreated} alerts`);

    return {
      success: true,
      accessesAnalyzed: recentAccesses.length,
      usersAnalyzed: Object.keys(accessesByUser).length,
      alertsCreated,
    };
  } catch (error) {
    console.error("[Security Alerts Job] Error during security check:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// ─── Scheduler ───────────────────────────────────────────────────────────────

export function startSecurityAlertsJob() {
  console.log(
    "[Security Alerts Job] Initializing automated security check job (every 15 minutes, with retry backoff)..."
  );

  runSecurityAlertsCheck();

  const FIFTEEN_MINUTES = 15 * 60 * 1000;
  setInterval(() => {
    runSecurityAlertsCheck();
  }, FIFTEEN_MINUTES);

  console.log("[Security Alerts Job] Automated security check job started successfully");
}
