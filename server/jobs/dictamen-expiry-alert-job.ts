/**
 * Job: Alerta de vencimiento de Dictamen NOM-035
 *
 * Lógica:
 *  - El Dictamen NOM-035 tiene una vigencia de 12 meses desde su fecha de aprobación (fechaAprobacion).
 *  - Este job se ejecuta diariamente a las 08:00 y verifica si algún dictamen aprobado
 *    vence en los próximos 30 días.
 *  - Si encuentra dictámenes próximos a vencer:
 *    1. Envía un correo al responsable técnico registrado en el dictamen (si tiene email).
 *    2. Envía una notificación al owner del sistema mediante notifyOwner().
 *    3. Crea una notificación interna en la tabla `notifications` para que aparezca en el dashboard.
 */

import { getDb } from "../db";
import {
  dictamenDocs,
  notifications,
  users,
  systemSettings,
} from "../../drizzle/schema";
import { eq, and, isNotNull, sql } from "drizzle-orm";
import { sendEmail } from "../_core/email";
import { notifyOwner } from "../_core/notification";

const JOB_TAG = "[Dictamen Expiry Alert Job]";

export async function runDictamenExpiryAlertJob(): Promise<{
  success: boolean;
  checked: number;
  alertsSent: number;
  errors: string[];
}> {
  console.log(
    `${JOB_TAG} Iniciando verificación de dictámenes próximos a vencer...`
  );

  const result = {
    success: false,
    checked: 0,
    alertsSent: 0,
    errors: [] as string[],
  };

  try {
    const db = await getDb();
    if (!db) {
      result.errors.push("Base de datos no disponible");
      return result;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Calcular la ventana: dictámenes cuya vigencia vence entre hoy y 30 días adelante.
    // Vigencia = fechaAprobacion + 12 meses.
    // Equivalente: fechaAprobacion está entre (today - 12 meses + 1 día) y (today - 12 meses + 30 días).
    const twelveMonthsAgo = new Date(today);
    twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);

    const windowStart = new Date(twelveMonthsAgo);
    windowStart.setDate(windowStart.getDate() + 1); // vence en 30 días o menos

    const windowEnd = new Date(twelveMonthsAgo);
    windowEnd.setDate(windowEnd.getDate() + 30); // vence en exactamente 30 días

    // Buscar dictámenes aprobados con fechaAprobacion en la ventana
    const expiringDictamenes = await db
      .select({
        id: dictamenDocs.id,
        folio: dictamenDocs.folio,
        numeroDictamen: dictamenDocs.numeroDictamen,
        titulo: dictamenDocs.titulo,
        responsableTecnico: dictamenDocs.responsableTecnico,
        cedulaProfesional: dictamenDocs.cedulaProfesional,
        razonSocial: dictamenDocs.razonSocial,
        fechaAprobacion: dictamenDocs.fechaAprobacion,
        creadoPor: dictamenDocs.creadoPor,
      })
      .from(dictamenDocs)
      .where(
        and(
          eq(dictamenDocs.estado, "aprobado"),
          isNotNull(dictamenDocs.fechaAprobacion),
          sql`${dictamenDocs.fechaAprobacion} >= ${windowStart.toISOString().split("T")[0]}`,
          sql`${dictamenDocs.fechaAprobacion} <= ${windowEnd.toISOString().split("T")[0]}`
        )
      );

    result.checked = expiringDictamenes.length;
    console.log(
      `${JOB_TAG} Dictámenes próximos a vencer encontrados: ${result.checked}`
    );

    if (result.checked === 0) {
      result.success = true;
      return result;
    }

    // Obtener email del owner desde systemSettings
    const [ownerEmailSetting] = await db
      .select({ settingValue: systemSettings.settingValue })
      .from(systemSettings)
      .where(eq(systemSettings.settingKey, "hrEmail"))
      .limit(1);
    const ownerEmail = ownerEmailSetting?.settingValue ?? null;

    for (const dictamen of expiringDictamenes) {
      try {
        // Calcular días restantes
        const expiryDate = new Date(dictamen.fechaAprobacion!);
        expiryDate.setFullYear(expiryDate.getFullYear() + 1);
        const daysRemaining = Math.ceil(
          (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        const expiryDateStr = expiryDate.toLocaleDateString("es-MX", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });

        const subject = `⚠️ Dictamen NOM-035 próximo a vencer — ${dictamen.folio} (${daysRemaining} días)`;

        const htmlBody = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: #0f172a; padding: 16px 24px; border-radius: 8px 8px 0 0;">
              <h2 style="color: #fff; margin: 0; font-size: 18px;">⚠️ Alerta de Vencimiento — Dictamen NOM-035</h2>
            </div>
            <div style="background: #fff; border: 1px solid #e2e8f0; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
              <p style="color: #334155; font-size: 15px;">
                El siguiente Dictamen NOM-035 STPS 2018 está próximo a vencer y requiere renovación:
              </p>
              <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
                <tr style="background: #f8fafc;">
                  <td style="padding: 8px 12px; font-weight: bold; color: #475569; border: 1px solid #e2e8f0;">Folio</td>
                  <td style="padding: 8px 12px; color: #1e293b; border: 1px solid #e2e8f0;">${dictamen.folio}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 12px; font-weight: bold; color: #475569; border: 1px solid #e2e8f0;">Número de Dictamen</td>
                  <td style="padding: 8px 12px; color: #1e293b; border: 1px solid #e2e8f0;">${dictamen.numeroDictamen}</td>
                </tr>
                <tr style="background: #f8fafc;">
                  <td style="padding: 8px 12px; font-weight: bold; color: #475569; border: 1px solid #e2e8f0;">Razón Social</td>
                  <td style="padding: 8px 12px; color: #1e293b; border: 1px solid #e2e8f0;">${dictamen.razonSocial ?? "N/A"}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 12px; font-weight: bold; color: #475569; border: 1px solid #e2e8f0;">Responsable Técnico</td>
                  <td style="padding: 8px 12px; color: #1e293b; border: 1px solid #e2e8f0;">${dictamen.responsableTecnico ?? "N/A"}</td>
                </tr>
                <tr style="background: #f8fafc;">
                  <td style="padding: 8px 12px; font-weight: bold; color: #475569; border: 1px solid #e2e8f0;">Fecha de Vencimiento</td>
                  <td style="padding: 8px 12px; color: #dc2626; font-weight: bold; border: 1px solid #e2e8f0;">${expiryDateStr}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 12px; font-weight: bold; color: #475569; border: 1px solid #e2e8f0;">Días Restantes</td>
                  <td style="padding: 8px 12px; color: #dc2626; font-weight: bold; border: 1px solid #e2e8f0;">${daysRemaining} días</td>
                </tr>
              </table>
              <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 12px 16px; margin-top: 16px;">
                <p style="color: #991b1b; margin: 0; font-size: 14px;">
                  <strong>Acción requerida:</strong> De acuerdo con la NOM-035-STPS-2018, el Dictamen tiene una vigencia de 12 meses.
                  Es necesario iniciar el proceso de renovación antes de la fecha de vencimiento para mantener el cumplimiento normativo.
                </p>
              </div>
              <p style="color: #94a3b8; font-size: 12px; margin-top: 24px; border-top: 1px solid #e2e8f0; padding-top: 12px;">
                Este mensaje fue generado automáticamente por el Sistema de Gestión NOM-035 STPS 2018.
                Fecha de generación: ${new Date().toLocaleDateString("es-MX")}.
              </p>
            </div>
          </div>
        `;

        // 1. Enviar correo al responsable técnico si hay email configurado en systemSettings
        const emailsSent: string[] = [];
        if (ownerEmail) {
          const sent = await sendEmail({
            to: ownerEmail,
            subject,
            html: htmlBody,
            sourceModule: "dictamen-expiry-alert",
          });
          if (sent) emailsSent.push(ownerEmail);
        }

        // 2. Notificar al owner del sistema
        await notifyOwner({
          title: `⚠️ Dictamen NOM-035 vence en ${daysRemaining} días — ${dictamen.folio}`,
          content: `El Dictamen ${dictamen.folio} (${dictamen.razonSocial ?? ""}) vence el ${expiryDateStr}. Responsable: ${dictamen.responsableTecnico ?? "N/A"}. Se requiere renovación.`,
        }).catch((e: Error) =>
          console.error(`${JOB_TAG} Error notifyOwner:`, e.message)
        );

        // 3. Crear notificación interna en la tabla notifications para el creador del dictamen
        if (dictamen.creadoPor) {
          await db
            .insert(notifications)
            .values({
              userId: dictamen.creadoPor,
              title: `⚠️ Dictamen ${dictamen.folio} vence en ${daysRemaining} días`,
              message: `El Dictamen NOM-035 con folio ${dictamen.folio} vence el ${expiryDateStr}. Inicia el proceso de renovación.`,
              type: "system",
              isRead: false,
              relatedEntityType: "dictamen",
              relatedEntityId: dictamen.id,
            })
            .catch((e: Error) =>
              console.error(
                `${JOB_TAG} Error creando notificación interna:`,
                e.message
              )
            );
        }

        result.alertsSent++;
        console.log(
          `${JOB_TAG} Alerta enviada para dictamen ${dictamen.folio} (vence en ${daysRemaining} días)`
        );
      } catch (itemErr: any) {
        const msg = `Error procesando dictamen ${dictamen.folio}: ${itemErr?.message}`;
        result.errors.push(msg);
        console.error(`${JOB_TAG} ${msg}`);
      }
    }

    result.success = true;
    console.log(
      `${JOB_TAG} Completado. Alertas enviadas: ${result.alertsSent}, errores: ${result.errors.length}`
    );
    return result;
  } catch (err: any) {
    result.errors.push(err?.message ?? "Error desconocido");
    console.error(`${JOB_TAG} Error fatal:`, err);
    return result;
  }
}
