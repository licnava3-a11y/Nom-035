/**
 * Job: Performance LCP Alerts
 * 
 * Se ejecuta diariamente a las 06:00 AM.
 * Detecta cuando el P75 de LCP supera 4000ms (calificación "poor")
 * durante 3 días consecutivos y genera una alerta en alert_history
 * con prioridad "warning".
 * 
 * Lógica:
 *  1. Consulta el P75 de LCP de los últimos 3 días (agrupado por día).
 *  2. Si los 3 días tienen P75 > 4000ms, verifica que no exista ya
 *     una alerta activa del mismo tipo creada hoy.
 *  3. Si no existe, inserta la alerta con:
 *       alertType: "performance_lcp"
 *       priority: "warning"
 *       threshold: 4000 (ms)
 *       currentValue: P75 del día más reciente (redondeado a entero)
 *       description: mensaje descriptivo
 */

import { getDb } from "../db";
import { alertHistory, webVitalsMetrics } from "../../drizzle/schema";
import { and, gte, lte, eq, sql } from "drizzle-orm";

const LCP_THRESHOLD_MS = 4000;
const CONSECUTIVE_DAYS = 3;

/** Calcula el P75 de LCP para un día específico (UTC). */
async function getLcpP75ForDay(
  db: Awaited<ReturnType<typeof getDb>>,
  dayStart: Date,
  dayEnd: Date
): Promise<number | null> {
  if (!db) return null;
  const rows = await db
    .select({ value: webVitalsMetrics.value })
    .from(webVitalsMetrics)
    .where(
      and(
        eq(webVitalsMetrics.metricName, "LCP"),
        gte(webVitalsMetrics.createdAt, dayStart),
        lte(webVitalsMetrics.createdAt, dayEnd)
      )
    )
    .orderBy(webVitalsMetrics.value);

  if (rows.length === 0) return null;

  // Calcular P75
  const values = rows.map((r) => Number(r.value));
  const p75Index = Math.floor(values.length * 0.75);
  return values[Math.min(p75Index, values.length - 1)];
}

/** Verifica si ya existe una alerta performance_lcp activa creada hoy. */
async function existsAlertToday(
  db: Awaited<ReturnType<typeof getDb>>
): Promise<boolean> {
  if (!db) return false;
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const existing = await db
    .select({ id: alertHistory.id })
    .from(alertHistory)
    .where(
      and(
        sql`${alertHistory.alertType} = 'performance_lcp'`,
        gte(alertHistory.triggeredAt, todayStart)
      )
    )
    .limit(1);

  return existing.length > 0;
}

export async function runPerformanceLcpAlertsJob(): Promise<{
  success: boolean;
  alertCreated: boolean;
  reason?: string;
  p75Values?: number[];
}> {
  console.log("[Performance LCP Alerts Job] Starting check...");

  const db = await getDb();
  if (!db) {
    console.error("[Performance LCP Alerts Job] DB no disponible.");
    return { success: false, alertCreated: false, reason: "db_unavailable" };
  }

  try {
    // Obtener P75 de LCP para los últimos CONSECUTIVE_DAYS días
    const p75Values: number[] = [];
    const now = new Date();

    for (let i = CONSECUTIVE_DAYS - 1; i >= 0; i--) {
      const dayStart = new Date(now);
      dayStart.setDate(now.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);

      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const p75 = await getLcpP75ForDay(db, dayStart, dayEnd);
      if (p75 === null) {
        console.log(
          `[Performance LCP Alerts Job] No hay datos de LCP para ${dayStart.toISOString().split("T")[0]}. Saltando.`
        );
        return { success: true, alertCreated: false, reason: "insufficient_data", p75Values };
      }
      p75Values.push(p75);
    }

    console.log(
      `[Performance LCP Alerts Job] P75 LCP últimos ${CONSECUTIVE_DAYS} días: ${p75Values.map((v) => `${v.toFixed(0)}ms`).join(", ")}`
    );

    // Verificar si todos los días superan el umbral
    const allPoor = p75Values.every((v) => v > LCP_THRESHOLD_MS);
    if (!allPoor) {
      console.log(
        `[Performance LCP Alerts Job] No todos los días superan ${LCP_THRESHOLD_MS}ms. No se crea alerta.`
      );
      return { success: true, alertCreated: false, reason: "threshold_not_exceeded", p75Values };
    }

    // Verificar si ya existe alerta hoy
    const alreadyAlerted = await existsAlertToday(db);
    if (alreadyAlerted) {
      console.log("[Performance LCP Alerts Job] Ya existe una alerta activa de hoy. Saltando.");
      return { success: true, alertCreated: false, reason: "already_alerted_today", p75Values };
    }

    // Crear la alerta
    const currentP75 = Math.round(p75Values[p75Values.length - 1]);
    const description =
      `LCP P75 ha superado ${LCP_THRESHOLD_MS}ms durante ${CONSECUTIVE_DAYS} días consecutivos. ` +
      `Valores: ${p75Values.map((v, i) => {
        const d = new Date(now);
        d.setDate(now.getDate() - (CONSECUTIVE_DAYS - 1 - i));
        return `${d.toLocaleDateString("es-MX", { day: "2-digit", month: "short" })}: ${Math.round(v)}ms`;
      }).join(", ")}. ` +
      `Esto indica un problema de rendimiento que afecta la experiencia del usuario (umbral "poor" de Core Web Vitals).`;

    await (db.insert(alertHistory) as any).values({
      alertType: "performance_lcp",
      priority: "warning",
      threshold: LCP_THRESHOLD_MS,
      currentValue: currentP75,
      description,
      status: "active",
    });

    console.log(
      `[Performance LCP Alerts Job] Alerta creada: LCP P75 = ${currentP75}ms (umbral: ${LCP_THRESHOLD_MS}ms, ${CONSECUTIVE_DAYS} días consecutivos).`
    );

    return { success: true, alertCreated: true, p75Values };
  } catch (err) {
    console.error("[Performance LCP Alerts Job] Error:", err instanceof Error ? err.message : err);
    return { success: false, alertCreated: false, reason: "error" };
  }
}

export function startPerformanceLcpAlertsJob(): void {
  // Ejecutar diariamente a las 06:00 AM
  setInterval(() => {
    const now = new Date();
    if (now.getHours() === 6 && now.getMinutes() === 0) {
      console.log("[Performance LCP Alerts Job] Triggering daily LCP performance check");
      runPerformanceLcpAlertsJob().catch(console.error);
    }
  }, 60_000); // Check every minute
  console.log("[Performance LCP Alerts Job] Scheduled to run daily at 06:00 AM");
}
