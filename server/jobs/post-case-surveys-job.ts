/**
 * Job Automático de Encuestas Post-Caso
 * Ejecuta diariamente: createPendingSurveys, sendPendingSurveys, expireSurveys
 */

import cron from 'node-cron';
import { getDb } from '../db';
import { cases, postCaseSurveys } from '../../drizzle/schema';
import { eq, and, sql, lte, isNull } from 'drizzle-orm';

/**
 * Crear encuestas pendientes para casos que cumplan 30/60/90 días desde cierre
 */
async function createPendingSurveys() {
  try {
    const db = await getDb();
    if (!db) {
      console.error('[Post-Case Surveys Job] Database not available');
      return { surveysCreated: 0 };
    }

    const now = new Date();
    let surveysCreated = 0;

    // Obtener casos cerrados
    const closedCases = await db
      .select({
        id: cases.id,
        caseNumber: cases.caseNumber,
        closedAt: cases.closedAt,
      })
      .from(cases)
      .where(
        and(
          sql`${cases.status} = 'resolved'`,
          sql`${cases.closedAt} IS NOT NULL`
        )
      );

    for (const caso of closedCases) {
      if (!caso.closedAt) continue;

      const daysSinceClosure = Math.floor(
        (now.getTime() - new Date(caso.closedAt).getTime()) / (1000 * 60 * 60 * 24)
      );

      // Verificar si debe crear encuesta para 30, 60 o 90 días
      const periods: Array<30 | 60 | 90> = [30, 60, 90];
      
      for (const period of periods) {
        // Crear encuesta si han pasado exactamente N días (±1 día de tolerancia)
        if (Math.abs(daysSinceClosure - period) <= 1) {
          // Verificar si ya existe encuesta para este caso y período
          const [existing] = await db
            .select()
            .from(postCaseSurveys)
            .where(
              and(
                eq(postCaseSurveys.caseId, caso.id),
                eq(postCaseSurveys.daysSinceClosure, period)
              )
            )
            .limit(1);

          if (!existing) {
            await db.insert(postCaseSurveys).values({
              caseId: caso.id,
              daysSinceClosure: period,
              status: 'pending',
            });
            surveysCreated++;
            console.log(`[Post-Case Surveys Job] Created survey for case ${caso.caseNumber} (${period} days)`);
          }
        }
      }
    }

    console.log(`[Post-Case Surveys Job] Created ${surveysCreated} pending surveys`);
    return { surveysCreated };
  } catch (error) {
    console.error('[Post-Case Surveys Job] Error creating pending surveys:', error);
    return { surveysCreated: 0 };
  }
}

/**
 * Enviar encuestas pendientes (marcar como "sent" y establecer expiración)
 */
async function sendPendingSurveys() {
  try {
    const db = await getDb();
    if (!db) {
      console.error('[Post-Case Surveys Job] Database not available');
      return { surveysSent: 0 };
    }

    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 días

    // Obtener encuestas pendientes
    const pendingSurveys = await db
      .select()
      .from(postCaseSurveys)
      .where(eq(postCaseSurveys.status, 'pending'));

    let surveysSent = 0;

    for (const survey of pendingSurveys) {
      await db
        .update(postCaseSurveys)
        .set({
          status: 'sent',
          sentAt: now,
          expiresAt,
        })
        .where(eq(postCaseSurveys.id, survey.id));

      surveysSent++;
    }

    console.log(`[Post-Case Surveys Job] Sent ${surveysSent} surveys`);
    return { surveysSent };
  } catch (error) {
    console.error('[Post-Case Surveys Job] Error sending pending surveys:', error);
    return { surveysSent: 0 };
  }
}

/**
 * Expirar encuestas vencidas
 */
async function expireSurveys() {
  try {
    const db = await getDb();
    if (!db) {
      console.error('[Post-Case Surveys Job] Database not available');
      return { surveysExpired: 0 };
    }

    const now = new Date();

    // Obtener encuestas enviadas que ya expiraron
    const expiredSurveys = await db
      .select()
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
        .set({
          status: 'expired',
        })
        .where(eq(postCaseSurveys.id, survey.id));

      surveysExpired++;
    }

    console.log(`[Post-Case Surveys Job] Expired ${surveysExpired} surveys`);
    return { surveysExpired };
  } catch (error) {
    console.error('[Post-Case Surveys Job] Error expiring surveys:', error);
    return { surveysExpired: 0 };
  }
}

/**
 * Ejecutar todos los jobs de encuestas post-caso
 */
export async function runPostCaseSurveysJobs() {
  console.log('[Post-Case Surveys Job] Starting automated jobs...');
  
  const createResult = await createPendingSurveys();
  const sendResult = await sendPendingSurveys();
  const expireResult = await expireSurveys();

  console.log('[Post-Case Surveys Job] Automated jobs completed:', {
    created: createResult.surveysCreated,
    sent: sendResult.surveysSent,
    expired: expireResult.surveysExpired,
  });

  return {
    created: createResult.surveysCreated,
    sent: sendResult.surveysSent,
    expired: expireResult.surveysExpired,
  };
}

/**
 * Configurar cron job para ejecutar diariamente a las 2:00 AM
 */
export function schedulePostCaseSurveysJob() {
  // Ejecutar diariamente a las 2:00 AM
  cron.schedule('0 2 * * *', async () => {
    console.log('[Post-Case Surveys Job] Cron triggered at', new Date().toISOString());
    await runPostCaseSurveysJobs();
  });

  console.log('[Post-Case Surveys Job] Scheduled to run daily at 2:00 AM');
}
