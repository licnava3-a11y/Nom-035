/**
 * Helper para registrar la ejecución de jobs automáticos en job_execution_log.
 * Uso:
 *   const result = await logJobExecution("stale-cases", async () => {
 *     return { notificationsSent: 5, notificationsSkipped: 10, itemsProcessed: 15 };
 *   });
 */

import { getDb } from "./db";
import { jobExecutionLog } from "../drizzle/schema";
import { notifyOwner } from "./_core/notification";

export interface JobResult {
  notificationsSent?: number;
  notificationsSkipped?: number;
  itemsProcessed?: number;
  metadata?: Record<string, unknown>;
}

/**
 * Envuelve la ejecución de un job, mide su duración y guarda el resultado en BD.
 * Nunca lanza excepciones — si el job falla, registra el error y retorna null.
 */
export async function logJobExecution(
  jobName: string,
  fn: () => Promise<JobResult | undefined | null>
): Promise<JobResult | null> {
  const start = Date.now();
  let status: "success" | "error" | "skipped" = "success";
  let errorMessage: string | undefined;
  let result: JobResult | null = null;

  try {
    const raw = await fn();
    result = raw ?? {};
  } catch (err) {
    status = "error";
    errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`[JobLogger] ${jobName} failed:`, errorMessage);
    // Notificar al owner cuando un job falla — alerta inmediata sin revisar logs
    notifyOwner({
      title: `⚠️ Job fallido: ${jobName}`,
      content: `El job automático **${jobName}** falló a las ${new Date().toLocaleString("es-MX")}\n\nError: ${errorMessage}\n\nRevisa el panel de Estado de Jobs en /admin/jobs para más detalles.`,
    }).catch(() => {
      // No propagar errores de notificación
    });
  }

  const durationMs = Date.now() - start;

  try {
    const db = await getDb();
    if (db) {
      await db.insert(jobExecutionLog).values({
        jobName,
        status,
        notificationsSent: result?.notificationsSent ?? 0,
        notificationsSkipped: result?.notificationsSkipped ?? 0,
        itemsProcessed: result?.itemsProcessed ?? 0,
        durationMs,
        errorMessage: errorMessage ?? null,
        metadata: result?.metadata ?? null,
      });
    }
  } catch (logErr) {
    // No propagar errores de logging — el job ya terminó
    console.warn(
      `[JobLogger] Could not save execution log for ${jobName}:`,
      logErr
    );
  }

  return result;
}
