/**
 * Job programado para detectar actividad sospechosa automáticamente
 * Se ejecuta cada 15 minutos para analizar el log de auditoría y detectar:
 * - Múltiples descargas en corto tiempo (>5 en 10 minutos)
 * - Accesos desde IPs desconocidas
 * - Accesos fuera de horario laboral (antes de 7am o después de 8pm)
 */

import { getDb } from "../db";
import { documentAuditLog, users } from "../../drizzle/schema";
import { securityAlertsRouter } from "../routers/securityAlerts";
import { gte, eq, and } from "drizzle-orm";

/**
 * Ejecutar verificación de alertas de seguridad
 */
export async function runSecurityAlertsCheck() {
  console.log('[Security Alerts Job] Starting automated security check...');
  
  try {
    const db = await getDb();
    if (!db) {
      console.error('[Security Alerts Job] Database not available');
      return;
    }

    // Crear un caller simulado para ejecutar los procedimientos tRPC
    const caller = securityAlertsRouter.createCaller({
      user: null as any,
      req: {} as any,
      res: {} as any,
    });

    // Obtener accesos de los últimos 15 minutos
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const recentAccesses = await db
      .select()
      .from(documentAuditLog)
      .where(gte(documentAuditLog.timestamp, fifteenMinutesAgo));

    console.log(`[Security Alerts Job] Found ${recentAccesses.length} recent accesses to analyze`);

    // Agrupar accesos por usuario
    const accessesByUser = recentAccesses.reduce((acc: any, access: any) => {
      if (!access.userId) return acc;
      if (!acc[access.userId]) {
        acc[access.userId] = [];
      }
      acc[access.userId].push(access);
      return acc;
    }, {});

    let alertsCreated = 0;

    // Analizar cada usuario
    for (const [userIdStr, accesses] of Object.entries(accessesByUser)) {
      const userId = parseInt(userIdStr);
      const userAccesses = accesses as any[];

      // Obtener información del usuario
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) continue;

      // 1. Detectar múltiples descargas en corto tiempo
      const downloads = userAccesses.filter((a: any) => a.action === 'download');
      if (downloads.length > 5) {
        console.log(`[Security Alerts Job] Detected ${downloads.length} downloads from user ${user.name}`);
        
        try {
          await caller.detectSuspiciousActivity({
            userId,
            ipAddress: downloads[0].ipAddress || undefined,
          });
          alertsCreated++;
        } catch (error) {
          console.error(`[Security Alerts Job] Error detecting suspicious activity for user ${userId}:`, error);
        }
      }

      // 2. Detectar accesos desde IPs desconocidas
      const uniqueIPs = new Set(userAccesses.map((a: any) => a.ipAddress).filter(Boolean));
      for (const ip of Array.from(uniqueIPs)) {
        // Obtener IPs históricas del usuario (antes de los últimos 15 minutos)
        const historicalAccesses = await db
          .select()
          .from(documentAuditLog)
          .where(
            and(
              eq(documentAuditLog.userId, userId),
              gte(documentAuditLog.timestamp, new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)) // Últimos 30 días
            )
          );

        const historicalIPs = new Set(
          historicalAccesses
            .map((a: any) => a.ipAddress)
            .filter((ip: any) => ip !== null)
        );

        // Si la IP actual no está en el historial y el usuario tiene más de 5 accesos previos
        if (historicalIPs.size > 5 && !historicalIPs.has(ip)) {
          console.log(`[Security Alerts Job] Detected unknown IP ${ip} for user ${user.name}`);
          
          try {
            await caller.detectSuspiciousActivity({
              userId,
              ipAddress: ip as string,
            });
            alertsCreated++;
          } catch (error) {
            console.error(`[Security Alerts Job] Error detecting unknown IP for user ${userId}:`, error);
          }
        }
      }

      // 3. Detectar accesos fuera de horario laboral
      const offHoursAccesses = userAccesses.filter((a: any) => {
        const hour = new Date(a.timestamp).getHours();
        return hour < 7 || hour >= 20;
      });

      if (offHoursAccesses.length > 0) {
        console.log(`[Security Alerts Job] Detected ${offHoursAccesses.length} off-hours accesses from user ${user.name}`);
        
        try {
          await caller.detectSuspiciousActivity({
            userId,
            ipAddress: offHoursAccesses[0].ipAddress || undefined,
          });
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
    console.error('[Security Alerts Job] Error during security check:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}


/**
 * Iniciar job programado
 * Se ejecuta cada 15 minutos
 */
export function startSecurityAlertsJob() {
  console.log('[Security Alerts Job] Initializing automated security check job (every 15 minutes)...');
  
  // Ejecutar inmediatamente al iniciar
  runSecurityAlertsCheck();
  
  // Programar ejecución cada 15 minutos (15 * 60 * 1000 ms)
  const FIFTEEN_MINUTES = 15 * 60 * 1000;
  setInterval(() => {
    runSecurityAlertsCheck();
  }, FIFTEEN_MINUTES);
  
  console.log('[Security Alerts Job] Automated security check job started successfully');
}
