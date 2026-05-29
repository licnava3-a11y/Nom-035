/**
 * dispatch-unread-alerts-job.ts
 *
 * Job automático que se ejecuta cada 24 horas para detectar despachos de minutas
 * que llevan más de 7 días en estado "sent" sin que el destinatario confirme lectura,
 * y envía:
 *   1. Un correo de recordatorio al destinatario con un nuevo enlace de confirmación.
 *   2. Una notificación interna al administrador del sistema.
 */

import { getDb, createNotification } from "../db";
import { minuteDispatches, minuteRecipients, meetingMinutes } from "../../drizzle/schema";
import { eq, and, lte, isNull } from "drizzle-orm";
import { sendDispatchEmail, SingleDispatchEmailData } from "../dispatchEmail";
import { notifyOwner } from "../_core/notification";
import crypto from "crypto";

const JOB_NAME = "Dispatch Unread Alerts Job";
const UNREAD_THRESHOLD_DAYS = 7;
const JOB_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 horas

export async function runDispatchUnreadAlertsJob(): Promise<{
  checked: number;
  remindersSent: number;
  errors: string[];
}> {
  console.log(`[${JOB_NAME}] Iniciando verificación de despachos sin leer...`);

  const result = { checked: 0, remindersSent: 0, errors: [] as string[] };

  try {
    const db = await getDb();
    if (!db) {
      console.error(`[${JOB_NAME}] Base de datos no disponible`);
      return result;
    }

    // Calcular la fecha límite: hace UNREAD_THRESHOLD_DAYS días
    const thresholdDate = new Date();
    thresholdDate.setDate(thresholdDate.getDate() - UNREAD_THRESHOLD_DAYS);

    // Buscar despachos en estado "sent" enviados hace más de 7 días sin confirmar lectura
    const overdueDispatches = await db
      .select({
        id: minuteDispatches.id,
        minuteId: minuteDispatches.minuteId,
        recipientId: minuteDispatches.recipientId,
        sentAt: minuteDispatches.sentAt,
        readToken: minuteDispatches.readToken,
        recipientName: minuteRecipients.name,
        recipientEmail: minuteRecipients.email,
        minuteTitle: meetingMinutes.title,
        minuteFolio: meetingMinutes.folio,
        minuteDate: meetingMinutes.meetingDate,
      })
      .from(minuteDispatches)
      .leftJoin(minuteRecipients, eq(minuteDispatches.recipientId, minuteRecipients.id))
      .leftJoin(meetingMinutes, eq(minuteDispatches.minuteId, meetingMinutes.id))
      .where(
        and(
          eq(minuteDispatches.status, "sent"),
          isNull(minuteDispatches.readAt),
          lte(minuteDispatches.sentAt, thresholdDate)
        )
      );

    result.checked = overdueDispatches.length;
    console.log(`[${JOB_NAME}] Despachos sin leer (>7 días): ${overdueDispatches.length}`);

    if (overdueDispatches.length === 0) {
      console.log(`[${JOB_NAME}] Sin despachos pendientes. Finalizando.`);
      return result;
    }

    // Procesar cada despacho
    for (const dispatch of overdueDispatches) {
      try {
        if (!dispatch.recipientEmail) {
          result.errors.push(`Despacho #${dispatch.id}: destinatario sin correo`);
          continue;
        }

        // Calcular días de retraso
        const daysSinceSent = Math.floor(
          (Date.now() - new Date(dispatch.sentAt).getTime()) / (1000 * 60 * 60 * 24)
        );

        // Generar nuevo token de confirmación
        const newToken = crypto.randomBytes(32).toString("hex");

        // Actualizar el token en la BD
        await db
          .update(minuteDispatches)
          .set({ readToken: newToken, emailSentAt: new Date() })
          .where(eq(minuteDispatches.id, dispatch.id));

        // Enviar correo de recordatorio al destinatario
        const emailData: SingleDispatchEmailData = {
          to: dispatch.recipientEmail,
          recipientName: dispatch.recipientName ?? "Destinatario",
          minuteTitle: dispatch.minuteTitle ?? "Minuta de reunión",
          minuteFolio: dispatch.minuteFolio ?? "",
          minuteDate: dispatch.minuteDate ?? new Date(),
          dispatchId: dispatch.id,
          token: newToken,
          isReminder: true,
          daysSinceSent,
        };
        await sendDispatchEmail(emailData);

        result.remindersSent++;
        console.log(
          `[${JOB_NAME}] Recordatorio enviado a ${dispatch.recipientEmail} (despacho #${dispatch.id}, ${daysSinceSent} días sin leer)`
        );
      } catch (e: any) {
        const errMsg = `Despacho #${dispatch.id}: ${e.message}`;
        result.errors.push(errMsg);
        console.error(`[${JOB_NAME}] Error en ${errMsg}`);
      }
    }

    // Notificar al administrador si hay despachos sin leer
    if (result.remindersSent > 0 || result.errors.length > 0) {
      try {
        const summary = [
          `Despachos verificados: ${result.checked}`,
          `Recordatorios enviados: ${result.remindersSent}`,
          result.errors.length > 0 ? `Errores: ${result.errors.length}` : null,
        ]
          .filter(Boolean)
          .join(" | ");

        await notifyOwner({
          title: `[NOM-035] Alerta: ${result.checked} despacho${result.checked !== 1 ? "s" : ""} sin confirmar lectura`,
          content: `El sistema detectó ${result.checked} despacho${result.checked !== 1 ? "s" : ""} de minutas que llevan más de ${UNREAD_THRESHOLD_DAYS} días sin confirmación de lectura.\n\n${summary}\n\nRevise el Panel de Despachos para más detalles.`,
        });
      } catch (notifyErr: any) {
        console.error(`[${JOB_NAME}] Error al notificar al administrador: ${notifyErr.message}`);
      }
    }

    console.log(
      `[${JOB_NAME}] Completado: ${result.checked} verificados, ${result.remindersSent} recordatorios enviados, ${result.errors.length} errores`
    );
    return result;
  } catch (error: any) {
    console.error(`[${JOB_NAME}] Error fatal:`, error);
    result.errors.push(error.message);
    return result;
  }
}

export function startDispatchUnreadAlertsJob(): void {
  // Ejecutar inmediatamente al arrancar (con un pequeño delay para no saturar)
  setTimeout(() => {
    runDispatchUnreadAlertsJob().catch((e) =>
      console.error(`[${JOB_NAME}] Error en ejecución inicial:`, e)
    );
  }, 5_000);

  // Luego ejecutar cada 24 horas
  setInterval(() => {
    runDispatchUnreadAlertsJob().catch((e) =>
      console.error(`[${JOB_NAME}] Error en ejecución periódica:`, e)
    );
  }, JOB_INTERVAL_MS);

  console.log(`[${JOB_NAME}] Job registrado. Se ejecutará cada 24 horas.`);
}
