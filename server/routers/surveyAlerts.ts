import { router, publicProcedure } from "../_core/trpc";
import { z } from "zod";
import { getDb } from "../db";
import { surveys, surveyResponses, users, alertLogs } from "../../drizzle/schema";
import { eq, and, sql, lt, desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { notifyOwner } from "../_core/notification";

/**
 * Router para alertas automáticas de encuestas NOM-035
 * Detecta y notifica:
 * - Cobertura por debajo del 80%
 * - Trabajadores sin responder por 2+ días
 */

export const surveyAlertsRouter = router({
  /**
   * Verificar y enviar alertas de cobertura baja
   * Se ejecuta periódicamente para detectar encuestas con cobertura < 80%
   */
  checkLowCoverageAlerts: publicProcedure
    .input(z.object({
      surveyId: z.number().optional(), // Si no se especifica, verifica todas las encuestas activas
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const results = {
        checked: 0,
        alertsSent: 0,
        errors: [] as string[],
      };

      try {
        // Obtener encuestas a verificar
        let surveysToCheck;
        if (input.surveyId) {
          surveysToCheck = await db.select().from(surveys).where(eq(surveys.id, input.surveyId));
        } else {
          // Verificar todas las encuestas activas
          surveysToCheck = await db.select().from(surveys);
        }

        for (const survey of surveysToCheck) {
          results.checked++;

          // Calcular cobertura
          const [responsesCount] = await db
            .select({ count: sql<number>`count(*)` })
            .from(surveyResponses)
            .where(eq(surveyResponses.surveyId, survey.id));

          const [totalUsers] = await db
            .select({ count: sql<number>`count(*)` })
            .from(users);

          const coverage = totalUsers.count > 0 
            ? (responsesCount.count / totalUsers.count) * 100 
            : 0;

          // Si la cobertura es < 80%, verificar si ya se envió alerta reciente
          if (coverage < 80) {
            // Buscar alertas enviadas en las últimas 24 horas
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            
            const recentAlerts = await db
              .select()
              .from(alertLogs)
              .where(
                and(
                  eq(alertLogs.surveyId, survey.id),
                  eq(alertLogs.alertType, 'low_coverage'),
                  eq(alertLogs.notificationSent, true),
                  sql`${alertLogs.triggeredAt} > ${oneDayAgo}`
                )
              )
              .limit(1);

            // Si no hay alertas recientes, enviar notificación
            if (recentAlerts.length === 0) {
              const details = {
                surveyTitle: survey.title,
                coverage: coverage.toFixed(2),
                totalUsers: totalUsers.count,
                responses: responsesCount.count,
                pending: totalUsers.count - responsesCount.count,
              };

              try {
                // Enviar notificación al propietario
                const notificationSent = await notifyOwner({
                  title: `⚠️ Alerta: Cobertura Baja en Encuesta NOM-035`,
                  content: `
La encuesta "${survey.title}" tiene una cobertura del ${coverage.toFixed(1)}%, por debajo del umbral del 80%.

**Estadísticas:**
- Total de trabajadores: ${totalUsers.count}
- Respuestas recibidas: ${responsesCount.count}
- Trabajadores pendientes: ${totalUsers.count - responsesCount.count}

Se recomienda enviar recordatorios a los trabajadores pendientes para cumplir con la NOM-035-STPS-2018.

Puedes enviar recordatorios desde: Encuestas NOM-035 → Seguimiento
                  `.trim(),
                });

                // Registrar alerta en la base de datos
                await db.insert(alertLogs).values({
                  alertType: 'low_coverage',
                  surveyId: survey.id,
                  details: JSON.stringify(details),
                  notificationSent,
                  notificationError: notificationSent ? null : 'Failed to send notification',
                });

                if (notificationSent) {
                  results.alertsSent++;
                } else {
                  results.errors.push(`Survey ${survey.id}: Failed to send notification`);
                }
              } catch (error) {
                results.errors.push(`Survey ${survey.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                
                // Registrar error en la base de datos
                await db.insert(alertLogs).values({
                  alertType: 'low_coverage',
                  surveyId: survey.id,
                  details: JSON.stringify(details),
                  notificationSent: false,
                  notificationError: error instanceof Error ? error.message : 'Unknown error',
                });
              }
            }
          }
        }
      } catch (error) {
        console.error('Error checking low coverage alerts:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      return results;
    }),

  /**
   * Verificar y enviar alertas de trabajadores pendientes por 2+ días
   * Se ejecuta periódicamente para detectar trabajadores que no han respondido
   */
  checkPendingWorkersAlerts: publicProcedure
    .input(z.object({
      surveyId: z.number().optional(),
      daysThreshold: z.number().default(2), // Días sin responder
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      const results = {
        checked: 0,
        alertsSent: 0,
        workersFound: 0,
        errors: [] as string[],
      };

      try {
        // Obtener encuestas a verificar
        let surveysToCheck;
        if (input.surveyId) {
          surveysToCheck = await db.select().from(surveys).where(eq(surveys.id, input.surveyId));
        } else {
          surveysToCheck = await db.select().from(surveys);
        }

        const thresholdDate = new Date(Date.now() - input.daysThreshold * 24 * 60 * 60 * 1000);

        for (const survey of surveysToCheck) {
          results.checked++;

          // Obtener respuestas de la encuesta
          const responses = await db
            .select({ userId: surveyResponses.userId })
            .from(surveyResponses)
            .where(eq(surveyResponses.surveyId, survey.id));

          const respondedUserIds = new Set(responses.map(r => r.userId));

          // Obtener todos los usuarios con fecha de ingreso anterior al threshold
          const allUsers = await db
            .select()
            .from(users)
            .where(
              sql`${users.fechaIngreso} IS NOT NULL AND ${users.fechaIngreso} < ${thresholdDate}`
            );

          // Filtrar usuarios pendientes que llevan 2+ días sin responder
          const pendingUsers = allUsers.filter(user => 
            user.id && 
            !respondedUserIds.has(user.id) &&
            user.email &&
            user.email.includes('@')
          );

          results.workersFound += pendingUsers.length;

          // Si hay trabajadores pendientes, verificar si ya se envió alerta reciente
          if (pendingUsers.length > 0) {
            // Buscar alertas enviadas en las últimas 24 horas
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            
            const recentAlerts = await db
              .select()
              .from(alertLogs)
              .where(
                and(
                  eq(alertLogs.surveyId, survey.id),
                  eq(alertLogs.alertType, 'worker_pending'),
                  eq(alertLogs.notificationSent, true),
                  sql`${alertLogs.triggeredAt} > ${oneDayAgo}`
                )
              )
              .limit(1);

            // Si no hay alertas recientes, enviar notificación
            if (recentAlerts.length === 0) {
              const details = {
                surveyTitle: survey.title,
                pendingCount: pendingUsers.length,
                daysThreshold: input.daysThreshold,
                workers: pendingUsers.slice(0, 10).map(u => ({ // Solo los primeros 10
                  name: u.name || 'Sin nombre',
                  email: u.email,
                  department: u.departamento || 'Sin departamento',
                })),
              };

              try {
                // Crear lista de trabajadores para la notificación
                const workersList = pendingUsers.slice(0, 10).map(u => 
                  `- ${u.name || 'Sin nombre'} (${u.departamento || 'Sin departamento'})`
                ).join('\n');

                const moreWorkersText = pendingUsers.length > 10 
                  ? `\n\n... y ${pendingUsers.length - 10} trabajadores más.`
                  : '';

                // Enviar notificación al propietario
                const notificationSent = await notifyOwner({
                  title: `⏰ Alerta: Trabajadores sin Responder Encuesta NOM-035`,
                  content: `
Hay ${pendingUsers.length} trabajador${pendingUsers.length === 1 ? '' : 'es'} que no ha${pendingUsers.length === 1 ? '' : 'n'} respondido la encuesta "${survey.title}" después de ${input.daysThreshold} días.

**Trabajadores pendientes:**
${workersList}${moreWorkersText}

Se recomienda enviar recordatorios personalizados desde: Encuestas NOM-035 → Seguimiento
                  `.trim(),
                });

                // Registrar alerta en la base de datos
                await db.insert(alertLogs).values({
                  alertType: 'worker_pending',
                  surveyId: survey.id,
                  details: JSON.stringify(details),
                  notificationSent,
                  notificationError: notificationSent ? null : 'Failed to send notification',
                });

                if (notificationSent) {
                  results.alertsSent++;
                } else {
                  results.errors.push(`Survey ${survey.id}: Failed to send notification`);
                }
              } catch (error) {
                results.errors.push(`Survey ${survey.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                
                // Registrar error en la base de datos
                await db.insert(alertLogs).values({
                  alertType: 'worker_pending',
                  surveyId: survey.id,
                  details: JSON.stringify(details),
                  notificationSent: false,
                  notificationError: error instanceof Error ? error.message : 'Unknown error',
                });
              }
            }
          }
        }
      } catch (error) {
        console.error('Error checking pending workers alerts:', error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      return results;
    }),

  /**
   * Obtener historial de alertas
   */
  getAlertHistory: publicProcedure
    .input(z.object({
      surveyId: z.number().optional(),
      alertType: z.enum(['low_coverage', 'worker_pending']).optional(),
      limit: z.number().default(50),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database not available" });

      let query = db.select().from(alertLogs);

      const conditions = [];
      if (input.surveyId) {
        conditions.push(eq(alertLogs.surveyId, input.surveyId));
      }
      if (input.alertType) {
        conditions.push(eq(alertLogs.alertType, input.alertType));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions)) as any;
      }

      const alerts = await query
        .orderBy(desc(alertLogs.triggeredAt))
        .limit(input.limit);

      return alerts.map(alert => ({
        ...alert,
        details: alert.details ? JSON.parse(alert.details) : null,
      }));
    }),
});
