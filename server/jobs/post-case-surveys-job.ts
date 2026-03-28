/**
 * Job Automático de Encuestas Post-Caso
 * Ejecuta diariamente: createPendingSurveys, sendPendingSurveys, expireSurveys
 * Incluye reintentos con backoff exponencial para errores de red (ECONNRESET, ETIMEDOUT)
 * Envía correos HTML a los reportantes de cada caso con enlace único de encuesta
 */

import cron from 'node-cron';
import crypto from 'crypto';
import { getDb } from '../db';
import { cases, postCaseSurveys } from '../../drizzle/schema';
import { eq, and, sql, lte } from 'drizzle-orm';
import { sendEmail } from '../lib/email-sender';

// ─── URL base de la plataforma ────────────────────────────────────────────────

function getBaseUrl(): string {
  return process.env.VITE_APP_URL
    || process.env.APP_URL
    || 'https://nom035mood-32dy4ksx.manus.space';
}

// ─── Utilidad: Reintentos con Backoff Exponencial ────────────────────────────

const RETRYABLE_ERRORS = ['ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'EPIPE', 'ENOTFOUND'];

function isRetryableError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = (error as NodeJS.ErrnoException).code ?? '';
  const message = (error as Error).message ?? '';
  return RETRYABLE_ERRORS.some((e) => code.includes(e) || message.includes(e));
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

  throw new Error(`[Post-Case Surveys Job] ${label} exhausted all ${maxAttempts} attempts`);
}

// ─── Plantilla HTML del correo ────────────────────────────────────────────────

function buildSurveyEmailHtml(params: {
  reporterName: string;
  caseNumber: string;
  daysSinceClosure: number;
  surveyUrl: string;
  expiresAt: Date;
}): string {
  const { reporterName, caseNumber, daysSinceClosure, surveyUrl, expiresAt } = params;
  const expiresFormatted = expiresAt.toLocaleDateString('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Encuesta de Seguimiento - NOM-035</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background-color:#1e3a5f;padding:28px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:0.5px;">
                Sistema NOM-035 STPS
              </h1>
              <p style="margin:6px 0 0;color:#a8c4e0;font-size:13px;">
                Encuesta de Seguimiento Post-Caso
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">
                Estimado/a <strong>${reporterName}</strong>,
              </p>
              <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">
                Han transcurrido <strong>${daysSinceClosure} días</strong> desde el cierre del caso
                <strong>${caseNumber}</strong>. Con el fin de evaluar la efectividad de las
                intervenciones realizadas, le invitamos a responder una breve encuesta de seguimiento.
              </p>
              <p style="margin:0 0 24px;color:#374151;font-size:15px;line-height:1.6;">
                Su opinión es fundamental para mejorar continuamente nuestros procesos de atención
                y cumplimiento con la NOM-035 STPS 2018.
              </p>

              <!-- CTA Button -->
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
                <tr>
                  <td style="background-color:#1e3a5f;border-radius:6px;padding:14px 32px;text-align:center;">
                    <a href="${surveyUrl}"
                       style="color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;display:block;">
                      Responder Encuesta
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Info boxes -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background-color:#f0f4f8;border-left:4px solid #1e3a5f;border-radius:4px;padding:12px 16px;margin-bottom:12px;">
                    <p style="margin:0;color:#374151;font-size:13px;line-height:1.5;">
                      <strong>Caso:</strong> ${caseNumber}<br>
                      <strong>Período de seguimiento:</strong> ${daysSinceClosure} días post-cierre<br>
                      <strong>Encuesta válida hasta:</strong> ${expiresFormatted}
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:20px 0 0;color:#6b7280;font-size:13px;line-height:1.5;">
                Si el botón no funciona, copie y pegue el siguiente enlace en su navegador:<br>
                <a href="${surveyUrl}" style="color:#1e3a5f;word-break:break-all;">${surveyUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
              <p style="margin:0;color:#9ca3af;font-size:12px;line-height:1.5;">
                Este correo fue enviado automáticamente por el Sistema de Gestión NOM-035 STPS 2018.<br>
                Si no reconoce este caso, por favor ignore este mensaje.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
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

      // Obtener casos cerrados/resueltos con email del reportante
      const closedCases = await db
        .select({
          id: cases.id,
          caseNumber: cases.caseNumber,
          closedAt: cases.closedAt,
          reporterEmail: cases.reporterEmail,
          reporterName: cases.reporterName,
          isAnonymous: cases.isAnonymous,
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
              // Generar token único para acceso sin login
              const token = crypto.randomBytes(32).toString('hex');

              await (db.insert(postCaseSurveys) as any).values({
                caseId: caso.id,
                daysSinceClosure: period,
                status: 'pending',
                surveyToken: token,
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
        return { surveysSent: 0, emailsSent: 0, emailsFailed: 0 };
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 días

      // Obtener encuestas pendientes con JOIN a casos para obtener datos del reportante
      const pendingSurveys = await db
        .select({
          surveyId: postCaseSurveys.id,
          surveyToken: postCaseSurveys.surveyToken,
          daysSinceClosure: postCaseSurveys.daysSinceClosure,
          caseNumber: cases.caseNumber,
          reporterEmail: cases.reporterEmail,
          reporterName: cases.reporterName,
          isAnonymous: cases.isAnonymous,
        })
        .from(postCaseSurveys)
        .innerJoin(cases, eq(postCaseSurveys.caseId, cases.id))
        .where(eq(postCaseSurveys.status, 'pending'));

      let surveysSent = 0;
      let emailsSent = 0;
      let emailsFailed = 0;

      for (const survey of pendingSurveys) {
        // Generar token si no existe (para encuestas creadas antes de esta versión)
        let token = survey.surveyToken;
        if (!token) {
          token = crypto.randomBytes(32).toString('hex');
          await db
            .update(postCaseSurveys)
            .set({ surveyToken: token } as any)
            .where(eq(postCaseSurveys.id, survey.surveyId));
        }

        // Actualizar estado a 'sent'
        await db
          .update(postCaseSurveys)
          .set({ status: 'sent', sentAt: now, expiresAt } as any)
          .where(eq(postCaseSurveys.id, survey.surveyId));

        surveysSent++;

        // Enviar correo solo si hay email disponible y el caso no es anónimo
        const recipientEmail = survey.reporterEmail;
        if (recipientEmail && !survey.isAnonymous) {
          const surveyUrl = `${getBaseUrl()}/survey/${token}`;
          const reporterName = survey.reporterName || 'Colaborador/a';

          const html = buildSurveyEmailHtml({
            reporterName,
            caseNumber: survey.caseNumber,
            daysSinceClosure: survey.daysSinceClosure,
            surveyUrl,
            expiresAt,
          });

          const sent = await sendEmail({
            to: recipientEmail,
            subject: `Encuesta de Seguimiento - Caso ${survey.caseNumber} (${survey.daysSinceClosure} días)`,
            html,
            text: `Estimado/a ${reporterName}, han transcurrido ${survey.daysSinceClosure} días desde el cierre del caso ${survey.caseNumber}. Por favor responda la encuesta en: ${surveyUrl} (válida hasta ${expiresAt.toLocaleDateString('es-MX')})`,
          });

          if (sent) {
            emailsSent++;
            console.log(
              `[Post-Case Surveys Job] Email sent to ${recipientEmail} for case ${survey.caseNumber} (${survey.daysSinceClosure} days)`
            );
          } else {
            emailsFailed++;
            console.warn(
              `[Post-Case Surveys Job] Failed to send email to ${recipientEmail} for case ${survey.caseNumber}`
            );
          }
        } else if (survey.isAnonymous) {
          console.log(
            `[Post-Case Surveys Job] Skipping email for anonymous case ${survey.caseNumber}`
          );
        } else {
          console.log(
            `[Post-Case Surveys Job] No email available for case ${survey.caseNumber}`
          );
        }
      }

      console.log(
        `[Post-Case Surveys Job] Sent ${surveysSent} surveys | Emails: ${emailsSent} sent, ${emailsFailed} failed`
      );
      return { surveysSent, emailsSent, emailsFailed };
    },
    { label: 'sendPendingSurveys', maxAttempts: 3, baseDelayMs: 500 }
  ).catch((error) => {
    console.error('[Post-Case Surveys Job] sendPendingSurveys failed after retries:', error);
    return { surveysSent: 0, emailsSent: 0, emailsFailed: 0 };
  });
}

// ─── Plantilla HTML del recordatorio ─────────────────────────────────────────

function buildReminderEmailHtml(params: {
  reporterName: string;
  caseNumber: string;
  daysSinceClosure: number;
  surveyUrl: string;
  expiresAt: Date;
}): string {
  const { reporterName, caseNumber, daysSinceClosure, surveyUrl, expiresAt } = params;
  const expiresFormatted = expiresAt.toLocaleDateString('es-MX', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Recordatorio - Encuesta NOM-035</title></head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6f9;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
        <tr><td style="background-color:#b45309;padding:28px 40px;text-align:center;">
          <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">Recordatorio - Sistema NOM-035 STPS</h1>
          <p style="margin:6px 0 0;color:#fde68a;font-size:13px;">Encuesta de Seguimiento Pendiente</p>
        </td></tr>
        <tr><td style="padding:36px 40px;">
          <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">Estimado/a <strong>${reporterName}</strong>,</p>
          <p style="margin:0 0 16px;color:#374151;font-size:15px;line-height:1.6;">
            Le recordamos que tiene pendiente de responder la encuesta de seguimiento del caso
            <strong>${caseNumber}</strong> (${daysSinceClosure} d\u00edas post-cierre).
          </p>
          <p style="margin:0 0 24px;color:#dc2626;font-size:14px;font-weight:600;">
            \u26a0\ufe0f Esta encuesta expira el ${expiresFormatted}.
          </p>
          <table cellpadding="0" cellspacing="0" style="margin:0 auto 28px;">
            <tr><td style="background-color:#b45309;border-radius:6px;padding:14px 32px;text-align:center;">
              <a href="${surveyUrl}" style="color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;display:block;">Responder Ahora</a>
            </td></tr>
          </table>
          <p style="margin:20px 0 0;color:#6b7280;font-size:13px;">
            Enlace directo: <a href="${surveyUrl}" style="color:#b45309;word-break:break-all;">${surveyUrl}</a>
          </p>
        </td></tr>
        <tr><td style="background-color:#f9fafb;border-top:1px solid #e5e7eb;padding:20px 40px;text-align:center;">
          <p style="margin:0;color:#9ca3af;font-size:12px;">Recordatorio autom\u00e1tico del Sistema de Gesti\u00f3n NOM-035 STPS 2018.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// ─── Enviar recordatorios (3 días después sin respuesta) ──────────────────────

async function sendSurveyReminders() {
  return withRetry(
    async () => {
      const db = await getDb();
      if (!db) {
        console.error('[Post-Case Surveys Job] Database not available');
        return { remindersSent: 0, emailsSent: 0, emailsFailed: 0 };
      }

      const now = new Date();
      const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

      const surveysToRemind = await db
        .select({
          surveyId: postCaseSurveys.id,
          surveyToken: postCaseSurveys.surveyToken,
          daysSinceClosure: postCaseSurveys.daysSinceClosure,
          caseNumber: cases.caseNumber,
          reporterEmail: cases.reporterEmail,
          reporterName: cases.reporterName,
          isAnonymous: cases.isAnonymous,
          expiresAt: postCaseSurveys.expiresAt,
          reminderSentAt: postCaseSurveys.reminderSentAt,
        })
        .from(postCaseSurveys)
        .innerJoin(cases, eq(postCaseSurveys.caseId, cases.id))
        .where(
          and(
            eq(postCaseSurveys.status, 'sent'),
            sql`${postCaseSurveys.sentAt} IS NOT NULL`,
            lte(postCaseSurveys.sentAt, threeDaysAgo),
            sql`${postCaseSurveys.reminderSentAt} IS NULL`,
            sql`${postCaseSurveys.expiresAt} IS NOT NULL`,
            sql`${postCaseSurveys.expiresAt} > ${now}`
          )
        );

      let remindersSent = 0;
      let emailsSent = 0;
      let emailsFailed = 0;

      for (const survey of surveysToRemind) {
        await db
          .update(postCaseSurveys)
          .set({ reminderSentAt: now.getTime() } as any)
          .where(eq(postCaseSurveys.id, survey.surveyId));
        remindersSent++;

        const recipientEmail = survey.reporterEmail;
        if (recipientEmail && !survey.isAnonymous && survey.surveyToken) {
          const surveyUrl = `${getBaseUrl()}/survey/${survey.surveyToken}`;
          const reporterName = survey.reporterName || 'Colaborador/a';
          const expiresAt = survey.expiresAt
            ? new Date(survey.expiresAt)
            : new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);

          const html = buildReminderEmailHtml({
            reporterName,
            caseNumber: survey.caseNumber,
            daysSinceClosure: survey.daysSinceClosure,
            surveyUrl,
            expiresAt,
          });

          const sent = await sendEmail({
            to: recipientEmail,
            subject: `Recordatorio: Encuesta Pendiente - Caso ${survey.caseNumber}`,
            html,
            text: `Estimado/a ${reporterName}, le recordamos que tiene una encuesta pendiente para el caso ${survey.caseNumber}. Responda en: ${surveyUrl}`,
          });

          if (sent) {
            emailsSent++;
            console.log(`[Post-Case Surveys Job] Reminder sent to ${recipientEmail} for case ${survey.caseNumber}`);
          } else {
            emailsFailed++;
            console.warn(`[Post-Case Surveys Job] Failed to send reminder to ${recipientEmail} for case ${survey.caseNumber}`);
          }
        }
      }

      console.log(`[Post-Case Surveys Job] Reminders: ${remindersSent} processed | Emails: ${emailsSent} sent, ${emailsFailed} failed`);
      return { remindersSent, emailsSent, emailsFailed };
    },
    { label: 'sendSurveyReminders', maxAttempts: 3, baseDelayMs: 500 }
  ).catch((error) => {
    console.error('[Post-Case Surveys Job] sendSurveyReminders failed after retries:', error);
    return { remindersSent: 0, emailsSent: 0, emailsFailed: 0 };
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

  // Crear primero, luego enviar (secuencial para evitar enviar encuestas recién creadas)
  const createResult = await createPendingSurveys();
  const [sendResult, reminderResult, expireResult] = await Promise.all([
    sendPendingSurveys(),
    sendSurveyReminders(),
    expireSurveys(),
  ]);

  const summary = {
    created: createResult.surveysCreated,
    sent: sendResult.surveysSent,
    emailsSent: sendResult.emailsSent,
    emailsFailed: sendResult.emailsFailed,
    reminders: reminderResult.remindersSent,
    reminderEmailsSent: reminderResult.emailsSent,
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
