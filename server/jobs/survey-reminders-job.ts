/**
 * Job de Recordatorios de Encuestas Pendientes
 * Envía recordatorios para encuestas próximas a expirar
 */

import cron from 'node-cron';
import { getDb } from '../db';
import { postCaseSurveys, cases } from '../../drizzle/schema';
import { eq, and, sql, lte } from 'drizzle-orm';
import { notifyOwner } from '../_core/notification';

/**
 * Detectar encuestas pendientes y enviar recordatorios
 */
async function sendSurveyReminders() {
  try {
    const db = await getDb();
    if (!db) {
      console.error('[Survey Reminders Job] Database not available');
      return { remindersSent: 0 };
    }

    let remindersSent = 0;

    // Detectar encuestas que expiran en 2 días o menos
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

    const expiringSurveys = await db
      .select({
        surveyId: postCaseSurveys.id,
        caseId: postCaseSurveys.caseId,
        daysSinceClosure: postCaseSurveys.daysSinceClosure,
        expiresAt: postCaseSurveys.expiresAt,
        caseNumber: cases.caseNumber,
      })
      .from(postCaseSurveys)
      .leftJoin(cases, eq(postCaseSurveys.caseId, cases.id))
      .where(
        and(
          eq(postCaseSurveys.status, 'sent'),
          sql`${postCaseSurveys.expiresAt} IS NOT NULL`,
          lte(postCaseSurveys.expiresAt, twoDaysFromNow)
        )
      );

    if (expiringSurveys.length > 0) {
      const surveysList = expiringSurveys
        .map(s => `- Caso ${s.caseNumber || s.caseId} (${s.daysSinceClosure} días)`)
        .join('\\n');

      const success = await notifyOwner({
        title: '📋 Recordatorio: Encuestas Post-Caso Pendientes',
        content: `${expiringSurveys.length} encuestas post-caso están próximas a expirar (2 días o menos).\\n\\n` +
          `**Encuestas pendientes:**\\n${surveysList}\\n\\n` +
          `**Acción requerida:**\\n` +
          `- Contactar a los responsables de los casos\\n` +
          `- Solicitar completar las encuestas antes de la fecha de expiración\\n` +
          `- Revisar efectividad de las intervenciones\\n\\n` +
          `Accede al dashboard para más detalles: /post-case-surveys`,
      });

      if (success) {
        remindersSent++;
        console.log(`[Survey Reminders Job] Reminder sent for ${expiringSurveys.length} expiring surveys`);
      }
    }

    // Detectar baja tasa de completitud (solo si hay más de 10 encuestas)
    const [totalSurveys] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(postCaseSurveys);

    const [completedSurveys] = await db
      .select({ count: sql<number>`COUNT(*)` })
      .from(postCaseSurveys)
      .where(eq(postCaseSurveys.status, 'completed'));

    const totalCount = totalSurveys?.count || 0;
    const completedCount = completedSurveys?.count || 0;
    const completionRate = totalCount > 0 ? (completedCount / totalCount * 100) : 0;

    if (totalCount > 10 && completionRate < 50) {
      const success = await notifyOwner({
        title: '📊 Alerta: Baja Tasa de Completitud de Encuestas',
        content: `La tasa de completitud de encuestas post-caso es del ${completionRate.toFixed(1)}% (${completedCount}/${totalCount}).\\n\\n` +
          `**Acción requerida:**\\n` +
          `- Revisar estrategia de seguimiento\\n` +
          `- Implementar recordatorios más frecuentes\\n` +
          `- Simplificar proceso de respuesta\\n` +
          `- Capacitar al personal sobre importancia de las encuestas\\n\\n` +
          `Accede al dashboard para más detalles: /post-case-surveys`,
      });

      if (success) {
        remindersSent++;
        console.log(`[Survey Reminders Job] Low completion rate alert sent (${completionRate.toFixed(1)}%)`);
      }
    }

    console.log(`[Survey Reminders Job] Completed: ${remindersSent} reminders sent`);
    return { remindersSent };
  } catch (error) {
    console.error('[Survey Reminders Job] Error:', error);
    return { remindersSent: 0 };
  }
}

/**
 * Configurar cron job para ejecutar cada 2 días a las 10:00 AM
 */
export function scheduleSurveyRemindersJob() {
  // Ejecutar cada 2 días a las 10:00 AM
  cron.schedule('0 10 */2 * *', async () => {
    console.log('[Survey Reminders Job] Cron triggered at', new Date().toISOString());
    await sendSurveyReminders();
  });

  console.log('[Survey Reminders Job] Scheduled to run every 2 days at 10:00 AM');
}

/**
 * Ejecutar job manualmente (para testing)
 */
export async function runSurveyRemindersJob() {
  console.log('[Survey Reminders Job] Manual execution started');
  return await sendSurveyReminders();
}
