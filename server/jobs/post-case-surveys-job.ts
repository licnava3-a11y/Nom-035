/**
 * Job Automático de Encuestas Post-Caso
 * Ejecuta diariamente: createPendingSurveys, sendPendingSurveys, expireSurveys
 * Incluye reintentos con backoff exponencial para errores de red (ECONNRESET, ETIMEDOUT)
 */

import cron from 'node-cron';
import { getDb } from '../db';
import { cases, postCaseSurveys } from '../../drizzle/schema';
import { eq, and, sql, lte } from 'drizzle-orm';

// ─── Utilidad: Reintentos con Backoff Exponencial ────────────────────────────

const RETRYABLE_ERRORS = ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'EPIPE', 'ENOTFOUND'];

function isRetryableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = (error as NodeJS.ErrnoException).code ?? '';
  const message = (error as Error).message ?? '';
  return (
    RETRYABLE_ERRORS.some((e) => code.includes(e) || message.includes(e))
  );
}

async function withRetry<T>(
  fn: () => Promise<T>,
  options: { maxAttempts?: number; baseDelayMs?: number; label?: string } = {}
): Promise<T> {
  const { maxAttempts = 3, baseDelayMs = 500, label = 'operation' } = options;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isLast = attempt === maxAttempts;
      const retryable = isRetryableError(error);

      if (isLast || !retryable) {
        console.error(
          `[Post-Case Surveys Job] ${label} failed (attempt ${attempt}/${maxAttempts}):`,
          error
        );
        throw error;
      }

      const delay = baseDelayMs * Math.pow(2, attempt - 1); // 500ms, 1000ms, 2000ms
      console.warn(
        `[Post-Case Surveys Job] ${label} attempt ${attempt} failed (${(error as Error).message}). Retrying in ${delay}ms...`
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // TypeScript: never reached but satisfies return type
  throw new Error(`[Post-Case Surveys Job] ${label} exhausted all ${maxAttempts} attempts`);
}

// ─── Crear encuestas pendientes ───────────────────────────────────────────────

async function createPendingSurveys() {
  return withRetry(
    async () => {
      const db = await getDb();
      if (!db) {
        console.error('[Post-Case Surveys Job] Database not available');
        return { surveysCreated: 0 };
      }

      const now = new Date();
      let surveysCreated = 0;

      // Obtener casos cerrados/resueltos
      const closedCases = await db
        .select({
          id: cases.id,
          caseNumber: cases.caseNumber,
          closedAt: cases.closedAt,
        })
        .from(cases)
        .where(
          and(
            sql`${cases.status} IN ('resolved', 'closed')`,
            sql`${cases.closedAt} IS NOT NULL`
          )
        );

      for (const caso of closedCases) {
        if (!caso.closedAt) continue;

        const daysSinceClosure = Math.floor(
          (now.getTime() - new Date(caso.closedAt).getTime()) / (1000 * 60 * 60 * 24)
        );

        const periods: Array<30 | 60 | 90> = [30, 60, 90];

        for (const period of periods) {
          // Tolerancia de ±1 día para no perder encuestas
          if (Math.abs(daysSinceClosure - period) <= 1) {
            const [existing] = await db
              .select({ id: postCaseSurveys.id })
              .from(postCaseSurveys)
              .where(
                and(
                  eq(postCaseSurveys.caseId, caso.id),
                  eq(postCaseSurveys.daysSinceClosure, period)
                )
              )
              .limit(1);

            if (!existing) {
              await (db.insert(postCaseSurveys) as any).values({
                caseId: caso.id,
                daysSinceClosure: period,
                status: 'pending',
              });
              surveysCreated++;
              console.log(
                `[Post-Case Surveys Job] Created survey for case ${caso.caseNumber} (${period} days)`
              );
            }
          }
        }
      }

      console.log(`[Post-Case Surveys Job] Created ${surveysCreated} pending surveys`);
      return { surveysCreated };
    },
    { label: 'createPendingSurveys', maxAttempts: 3, baseDelayMs: 500 }
  ).catch((error) => {
    console.error('[Post-Case Surveys Job] createPendingSurveys failed after retries:', error);
    return { surveysCreated: 0 };
  });
}

// ─── Enviar encuestas pendientes ──────────────────────────────────────────────

async function sendPendingSurveys() {
  return withRetry(
    async () => {
      const db = await getDb();
      if (!db) {
        console.error('[Post-Case Surveys Job] Database not available');
        return { surveysSent: 0 };
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 días

      const pendingSurveys = await db
        .select({ id: postCaseSurveys.id })
        .from(postCaseSurveys)
        .where(eq(postCaseSurveys.status, 'pending'));

      let surveysSent = 0;

      for (const survey of pendingSurveys) {
        await db
          .update(postCaseSurveys)
          .set({ status: 'sent', sentAt: now, expiresAt } as any)
          .where(eq(postCaseSurveys.id, survey.id));
        surveysSent++;
      }

      console.log(`[Post-Case Surveys Job] Sent ${surveysSent} surveys`);
      return { surveysSent };
    },
    { label: 'sendPendingSurveys', maxAttempts: 3, baseDelayMs: 500 }
  ).catch((error) => {
    console.error('[Post-Case Surveys Job] sendPendingSurveys failed after retries:', error);
    return { surveysSent: 0 };
  });
}

// ─── Expirar encuestas vencidas ───────────────────────────────────────────────

async function expireSurveys() {
  return withRetry(
    async () => {
      const db = await getDb();
      if (!db) {
        console.error('[Post-Case Surveys Job] Database not available');
        return { surveysExpired: 0 };
      }

      const now = new Date();

      const expiredSurveys = await db
        .select({ id: postCaseSurveys.id })
        .from(postCaseSurveys)
        .where(
          and(
            eq(postCaseSurveys.status, 'sent'),
            sql`${postCaseSurveys.expiresAt} IS NOT NULL`,
            lte(postCaseSurveys.expiresAt, now)
          )
        );

      let surveysExpired = 0;

      for (const survey of expiredSurveys) {
        await db
          .update(postCaseSurveys)
          .set({ status: 'expired' } as any)
          .where(eq(postCaseSurveys.id, survey.id));
        surveysExpired++;
      }

      console.log(`[Post-Case Surveys Job] Expired ${surveysExpired} surveys`);
      return { surveysExpired };
    },
    { label: 'expireSurveys', maxAttempts: 3, baseDelayMs: 500 }
  ).catch((error) => {
    console.error('[Post-Case Surveys Job] expireSurveys failed after retries:', error);
    return { surveysExpired: 0 };
  });
}

// ─── Orquestador principal ────────────────────────────────────────────────────

export async function runPostCaseSurveysJobs() {
  console.log('[Post-Case Surveys Job] Starting automated jobs at', new Date().toISOString());

  const [createResult, sendResult, expireResult] = await Promise.all([
    createPendingSurveys(),
    sendPendingSurveys(),
    expireSurveys(),
  ]);

  const summary = {
    created: createResult.surveysCreated,
    sent: sendResult.surveysSent,
    expired: expireResult.surveysExpired,
  };

  console.log('[Post-Case Surveys Job] Completed:', summary);
  return summary;
}

// ─── Programar cron diario a las 2:00 AM ─────────────────────────────────────

export function schedulePostCaseSurveysJob() {
  cron.schedule('0 2 * * *', async () => {
    console.log('[Post-Case Surveys Job] Cron triggered at', new Date().toISOString());
    await runPostCaseSurveysJobs();
  });

  console.log('[Post-Case Surveys Job] Scheduled to run daily at 2:00 AM');
}
