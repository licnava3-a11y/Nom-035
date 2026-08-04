import { getDb } from "../db";
import { committeeMinuteAgreements, committeeMinutes, users, systemSettings } from "../../drizzle/schema";
import { eq, and, sql } from "drizzle-orm";
import { sendEmail } from "../lib/email-sender";

/**
 * Obtiene el email del responsable de un acuerdo.
 * Prioridad: email del usuario vinculado → hrEmail de systemSettings → null
 */
async function getResponsibleEmail(
  db: Awaited<ReturnType<typeof getDb>>,
  responsibleUserId: number | null,
  fallbackName: string | null
): Promise<string | null> {
  if (!db) return null;

  // 1. Intentar obtener email del usuario vinculado
  if (responsibleUserId) {
    const [user] = await db
      .select({ email: users.email })
      .from(users)
      .where(eq(users.id, responsibleUserId))
      .limit(1);
    if (user?.email) return user.email;
  }

  // 2. Fallback: hrEmail de systemSettings
  const [settings] = await db.select().from(systemSettings).limit(1);
  const hrEmail = (settings as any)?.hrEmail as string | undefined;
  if (hrEmail) return hrEmail;

  return null;
}

/**
 * Job programado para enviar alertas automáticas de acuerdos próximos a vencer
 * Se ejecuta diariamente y detecta acuerdos que vencen en 3 y 7 días
 */
export async function runAgreementsAlertsJob() {
  console.log('[Agreements Alerts Job] Iniciando verificación de acuerdos próximos a vencer...');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Calcular fechas de alerta (3 y 7 días)
  const in3Days = new Date(today);
  in3Days.setDate(today.getDate() + 3);

  const in7Days = new Date(today);
  in7Days.setDate(today.getDate() + 7);

  try {
    const db = await getDb();
    if (!db) {
      console.error('[Agreements Alerts Job] Database not available');
      return;
    }

    // Obtener acuerdos que vencen en 7 días (con JOIN a users para email)
    const agreementsIn7Days = await db
      .select({
        id: committeeMinuteAgreements.id,
        description: committeeMinuteAgreements.description,
        responsibleName: committeeMinuteAgreements.responsibleName,
        responsibleUserId: committeeMinuteAgreements.responsibleUserId,
        dueDate: committeeMinuteAgreements.dueDate,
        priority: committeeMinuteAgreements.priority,
        minuteId: committeeMinuteAgreements.minuteId,
        sessionNumber: committeeMinutes.sessionNumber,
        responsibleEmail: users.email,
      })
      .from(committeeMinuteAgreements)
      .innerJoin(committeeMinutes, eq(committeeMinuteAgreements.minuteId, committeeMinutes.id))
      .leftJoin(users, eq(committeeMinuteAgreements.responsibleUserId, users.id))
      .where(
        and(
          eq(committeeMinuteAgreements.status, 'pendiente'),
          sql`DATE(${committeeMinuteAgreements.dueDate}) = DATE(${in7Days.toISOString().split('T')[0]})`
        )
      );

    // Obtener acuerdos que vencen en 3 días (con JOIN a users para email)
    const agreementsIn3Days = await db
      .select({
        id: committeeMinuteAgreements.id,
        description: committeeMinuteAgreements.description,
        responsibleName: committeeMinuteAgreements.responsibleName,
        responsibleUserId: committeeMinuteAgreements.responsibleUserId,
        dueDate: committeeMinuteAgreements.dueDate,
        priority: committeeMinuteAgreements.priority,
        minuteId: committeeMinuteAgreements.minuteId,
        sessionNumber: committeeMinutes.sessionNumber,
        responsibleEmail: users.email,
      })
      .from(committeeMinuteAgreements)
      .innerJoin(committeeMinutes, eq(committeeMinuteAgreements.minuteId, committeeMinutes.id))
      .leftJoin(users, eq(committeeMinuteAgreements.responsibleUserId, users.id))
      .where(
        and(
          eq(committeeMinuteAgreements.status, 'pendiente'),
          sql`DATE(${committeeMinuteAgreements.dueDate}) = DATE(${in3Days.toISOString().split('T')[0]})`
        )
      );

    // Obtener hrEmail de systemSettings como fallback global
    const [settings] = await db.select().from(systemSettings).limit(1);
    const globalFallbackEmail = (settings as any)?.hrEmail as string | undefined;

    let alertsSent = 0;

    // Enviar alertas para acuerdos que vencen en 7 días
    for (const agreement of agreementsIn7Days) {
      try {
        // Prioridad: email del usuario vinculado → hrEmail global → skip
        const recipientEmail = agreement.responsibleEmail ?? globalFallbackEmail;
        if (!recipientEmail) {
          console.warn(`[Agreements Alerts Job] Sin email para acuerdo #${agreement.id} (responsable: ${agreement.responsibleName ?? 'N/A'}). Saltando.`);
          continue;
        }
        await sendEmail({
          to: recipientEmail,
          subject: `⚠️ Recordatorio: Acuerdo próximo a vencer en 7 días`,
          html: generate7DaysAlertEmail(agreement),
        });
        alertsSent++;
        console.log(`[Agreements Alerts Job] Alerta de 7 días enviada a ${recipientEmail} para acuerdo #${agreement.id}`);
      } catch (error) {
        console.error(`[Agreements Alerts Job] Error al enviar alerta de 7 días para acuerdo #${agreement.id}:`, error);
      }
    }

    // Enviar alertas para acuerdos que vencen en 3 días
    for (const agreement of agreementsIn3Days) {
      try {
        const recipientEmail = agreement.responsibleEmail ?? globalFallbackEmail;
        if (!recipientEmail) {
          console.warn(`[Agreements Alerts Job] Sin email para acuerdo #${agreement.id} (responsable: ${agreement.responsibleName ?? 'N/A'}). Saltando.`);
          continue;
        }
        await sendEmail({
          to: recipientEmail,
          subject: `🚨 URGENTE: Acuerdo próximo a vencer en 3 días`,
          html: generate3DaysAlertEmail(agreement),
        });
        alertsSent++;
        console.log(`[Agreements Alerts Job] Alerta de 3 días enviada a ${recipientEmail} para acuerdo #${agreement.id}`);
      } catch (error) {
        console.error(`[Agreements Alerts Job] Error al enviar alerta de 3 días para acuerdo #${agreement.id}:`, error);
      }
    }

    console.log(`[Agreements Alerts Job] Verificación completada: ${agreementsIn7Days.length} acuerdos en 7 días, ${agreementsIn3Days.length} acuerdos en 3 días, ${alertsSent} alertas enviadas`);

    return {
      success: true,
      agreementsIn7Days: agreementsIn7Days.length,
      agreementsIn3Days: agreementsIn3Days.length,
      alertsSent,
    };
  } catch (error) {
    console.error('[Agreements Alerts Job] Error al ejecutar job:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
    };
  }
}

/**
 * Genera HTML para email de alerta de 7 días
 */
function generate7DaysAlertEmail(agreement: any): string {
  const priorityColors: Record<string, string> = {
    baja: '#10b981',
    media: '#f59e0b',
    alta: '#ef4444',
    urgente: '#dc2626',
  };

  const priorityLabels: Record<string, string> = {
    baja: 'Baja',
    media: 'Media',
    alta: 'Alta',
    urgente: 'Urgente',
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #0066cc; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; }
        .agreement-card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b; }
        .priority-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; color: white; font-size: 12px; font-weight: bold; }
        .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; padding: 12px 24px; background: #0066cc; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">⚠️ Recordatorio de Acuerdo</h1>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">Acuerdo próximo a vencer en 7 días</p>
        </div>
        <div class="content">
          <p>Estimado/a <strong>${agreement.responsibleName ?? 'Responsable'}</strong>,</p>
          <p>Le recordamos que tiene un acuerdo pendiente que vence en <strong>7 días</strong>.</p>

          <div class="agreement-card">
            <h3 style="margin-top: 0; color: #0066cc;">Detalles del Acuerdo</h3>
            <p><strong>Minuta:</strong> ${agreement.sessionNumber ?? agreement.minuteId}</p>
            <p><strong>Descripción:</strong> ${agreement.description}</p>
            <p><strong>Fecha de vencimiento:</strong> ${new Date(agreement.dueDate).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p>
              <strong>Prioridad:</strong>
              <span class="priority-badge" style="background: ${priorityColors[agreement.priority] ?? '#6b7280'};">
                ${priorityLabels[agreement.priority] ?? agreement.priority}
              </span>
            </p>
          </div>

          <p>Por favor, asegúrese de completar este acuerdo antes de la fecha límite.</p>

          <a href="#" class="button">Ver Dashboard de Acuerdos</a>
        </div>
        <div class="footer">
          <p>Este es un mensaje automático del Sistema de Gestión NOM-035</p>
          <p>© 2026 - Todos los derechos reservados</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Genera HTML para email de alerta de 3 días
 */
function generate3DaysAlertEmail(agreement: any): string {
  const priorityColors: Record<string, string> = {
    baja: '#10b981',
    media: '#f59e0b',
    alta: '#ef4444',
    urgente: '#dc2626',
  };

  const priorityLabels: Record<string, string> = {
    baja: 'Baja',
    media: 'Media',
    alta: 'Alta',
    urgente: 'Urgente',
  };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #dc2626; color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #fef2f2; padding: 30px; border: 2px solid #fecaca; }
        .agreement-card { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626; }
        .priority-badge { display: inline-block; padding: 4px 12px; border-radius: 12px; color: white; font-size: 12px; font-weight: bold; }
        .footer { background: #f3f4f6; padding: 15px; text-align: center; font-size: 12px; color: #6b7280; border-radius: 0 0 8px 8px; }
        .button { display: inline-block; padding: 12px 24px; background: #dc2626; color: white; text-decoration: none; border-radius: 6px; margin-top: 20px; }
        .urgent-banner { background: #fee2e2; border: 2px solid #dc2626; padding: 15px; border-radius: 8px; margin-bottom: 20px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1 style="margin: 0;">🚨 ALERTA URGENTE</h1>
          <p style="margin: 5px 0 0 0; opacity: 0.9;">Acuerdo próximo a vencer en 3 días</p>
        </div>
        <div class="content">
          <div class="urgent-banner">
            <h2 style="margin: 0; color: #dc2626;">⏰ ACCIÓN REQUERIDA</h2>
            <p style="margin: 5px 0 0 0; font-weight: bold;">Este acuerdo vence en solo 3 días</p>
          </div>

          <p>Estimado/a <strong>${agreement.responsibleName ?? 'Responsable'}</strong>,</p>
          <p>Este es un recordatorio <strong>URGENTE</strong>. Su acuerdo vence en <strong>3 días</strong>.</p>

          <div class="agreement-card">
            <h3 style="margin-top: 0; color: #dc2626;">Detalles del Acuerdo</h3>
            <p><strong>Minuta:</strong> ${agreement.sessionNumber ?? agreement.minuteId}</p>
            <p><strong>Descripción:</strong> ${agreement.description}</p>
            <p><strong>Fecha de vencimiento:</strong> ${new Date(agreement.dueDate).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            <p>
              <strong>Prioridad:</strong>
              <span class="priority-badge" style="background: ${priorityColors[agreement.priority] ?? '#6b7280'};">
                ${priorityLabels[agreement.priority] ?? agreement.priority}
              </span>
            </p>
          </div>

          <p><strong>Por favor, tome acción inmediata para completar este acuerdo.</strong></p>

          <a href="#" class="button">Ver Dashboard de Acuerdos</a>
        </div>
        <div class="footer">
          <p>Este es un mensaje automático del Sistema de Gestión NOM-035</p>
          <p>© 2026 - Todos los derechos reservados</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Iniciar job programado
 * Se ejecuta diariamente a las 8:00 AM
 */
export function startAgreementsAlertsJob() {
  console.log('[Agreements Alerts Job] Initializing automated alerts job (daily at 8:00 AM)...');

  // Calcular tiempo hasta las 8:00 AM del próximo día
  const now = new Date();
  const next8AM = new Date();
  next8AM.setHours(8, 0, 0, 0);

  if (now.getHours() >= 8) {
    // Si ya pasaron las 8 AM, programar para mañana
    next8AM.setDate(next8AM.getDate() + 1);
  }

  const timeUntilNext8AM = next8AM.getTime() - now.getTime();

  // Ejecutar primera vez a las 8 AM
  setTimeout(() => {
    runAgreementsAlertsJob();

    // Luego ejecutar cada 24 horas
    const ONE_DAY = 24 * 60 * 60 * 1000;
    setInterval(() => {
      runAgreementsAlertsJob();
    }, ONE_DAY);
  }, timeUntilNext8AM);

  console.log(`[Agreements Alerts Job] First execution scheduled for ${next8AM.toLocaleString('es-MX')}`);
  console.log('[Agreements Alerts Job] Automated alerts job started successfully');
}
