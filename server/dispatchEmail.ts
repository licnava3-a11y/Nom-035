/**
 * dispatchEmail.ts
 * Helper para enviar correos de notificación a destinatarios de minutas.
 * Genera un token único de confirmación de lectura por despacho.
 */

import crypto from "crypto";
import { sendEmail } from "./_core/email";
import { getDb } from "./db";
import { minuteDispatches } from "../drizzle/schema";
import { eq } from "drizzle-orm";

export interface DispatchEmailData {
  dispatchId: number;
  recipientName: string;
  recipientEmail: string;
  minuteId: number;
  minuteFolio: string;
  minuteTitle: string;
  meetingDate: Date | string;
  meetingType: string;
  /** URL base del sitio, ej: https://xxx.manus.space */
  baseUrl: string;
}

/** Genera un token hexadecimal único de 32 bytes (64 chars) */
export function generateReadToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/** Formatea el tipo de reunión en español */
function formatMeetingType(type: string): string {
  const types: Record<string, string> = {
    ordinary: "Reunión Ordinaria",
    extraordinary: "Reunión Extraordinaria",
    workshop: "Taller",
    training: "Capacitación",
    seminar: "Seminario",
    forum: "Foro",
  };
  return types[type] || type;
}

/** Formatea una fecha en español */
function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("es-MX", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "America/Mexico_City",
  });
}

/**
 * Envía el correo de notificación de minuta al destinatario.
 * Genera y guarda el readToken en el despacho antes de enviar.
 */
export async function sendDispatchEmail(data: DispatchEmailData): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  // Generar token único de confirmación
  const readToken = generateReadToken();
  const confirmUrl = `${data.baseUrl}/api/confirm-read/${readToken}`;

  // Guardar el token en el despacho
  await db
    .update(minuteDispatches)
    .set({ readToken, emailSentAt: new Date(), updatedAt: new Date() })
    .where(eq(minuteDispatches.id, data.dispatchId));

  const meetingDateStr = formatDate(data.meetingDate);
  const meetingTypeStr = formatMeetingType(data.meetingType);

  const html = buildEmailHtml({
    recipientName: data.recipientName,
    minuteFolio: data.minuteFolio,
    minuteTitle: data.minuteTitle,
    meetingDate: meetingDateStr,
    meetingType: meetingTypeStr,
    confirmUrl,
  });

  const text = `
Estimado/a ${data.recipientName},

Se le hace llegar la siguiente minuta para su conocimiento y seguimiento:

Folio: ${data.minuteFolio}
Título: ${data.minuteTitle}
Tipo de reunión: ${meetingTypeStr}
Fecha de reunión: ${meetingDateStr}

Para confirmar la recepción y lectura de este documento, haga clic en el siguiente enlace:
${confirmUrl}

Plataforma NOM-035 STPS 2018
Sistema de Gestión de Riesgos Psicosociales
`.trim();

  return sendEmail({
    to: data.recipientEmail,
    subject: `[NOM-035] Minuta ${data.minuteFolio} — ${data.minuteTitle}`,
    html,
    text,
    sourceModule: "minute-dispatches",
  });
}

/**
 * Envía correos a múltiples destinatarios de una minuta.
 * Retorna el número de correos enviados exitosamente.
 */
export async function sendDispatchEmails(
  dispatches: DispatchEmailData[]
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  for (const dispatch of dispatches) {
    try {
      const ok = await sendDispatchEmail(dispatch);
      if (ok) sent++;
      else failed++;
    } catch (err) {
      console.error(`[DispatchEmail] Error enviando a ${dispatch.recipientEmail}:`, err);
      failed++;
    }
  }

  return { sent, failed };
}

// ── Template HTML del correo ──────────────────────────────────────────────────

interface EmailTemplateData {
  recipientName: string;
  minuteFolio: string;
  minuteTitle: string;
  meetingDate: string;
  meetingType: string;
  confirmUrl: string;
}

function buildEmailHtml(data: EmailTemplateData): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Minuta ${data.minuteFolio}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);max-width:600px;width:100%;">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%);padding:32px 40px;text-align:center;">
              <div style="font-size:13px;font-weight:600;color:#94a3b8;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">Plataforma NOM-035 STPS 2018</div>
              <div style="font-size:24px;font-weight:700;color:white;">Notificación de Minuta</div>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="font-size:16px;color:#334155;margin:0 0 24px;">
                Estimado/a <strong style="color:#0f172a;">${escapeHtml(data.recipientName)}</strong>,
              </p>
              <p style="font-size:15px;color:#475569;line-height:1.6;margin:0 0 32px;">
                Se le hace llegar la siguiente minuta para su conocimiento y seguimiento de los acuerdos establecidos.
              </p>

              <!-- Minuta Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:32px;">
                <tr>
                  <td style="padding:24px;">
                    <div style="font-size:11px;font-weight:700;color:#64748b;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px;">Folio</div>
                    <div style="font-size:20px;font-weight:700;color:#0f172a;margin-bottom:20px;">${escapeHtml(data.minuteFolio)}</div>
                    
                    <div style="font-size:11px;font-weight:700;color:#64748b;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px;">Título</div>
                    <div style="font-size:16px;font-weight:600;color:#1e293b;margin-bottom:20px;">${escapeHtml(data.minuteTitle)}</div>
                    
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td width="50%" style="vertical-align:top;">
                          <div style="font-size:11px;font-weight:700;color:#64748b;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px;">Tipo de Reunión</div>
                          <div style="font-size:14px;color:#334155;">${escapeHtml(data.meetingType)}</div>
                        </td>
                        <td width="50%" style="vertical-align:top;">
                          <div style="font-size:11px;font-weight:700;color:#64748b;letter-spacing:1.5px;text-transform:uppercase;margin-bottom:4px;">Fecha de Reunión</div>
                          <div style="font-size:14px;color:#334155;">${escapeHtml(data.meetingDate)}</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                <tr>
                  <td align="center">
                    <a href="${data.confirmUrl}" 
                       style="display:inline-block;background:#16a34a;color:white;font-size:15px;font-weight:600;padding:14px 32px;border-radius:8px;text-decoration:none;letter-spacing:0.3px;">
                      ✓ Confirmar lectura
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size:13px;color:#94a3b8;line-height:1.6;margin:0;border-top:1px solid #e2e8f0;padding-top:24px;">
                Si el botón no funciona, copie y pegue el siguiente enlace en su navegador:<br/>
                <a href="${data.confirmUrl}" style="color:#3b82f6;word-break:break-all;">${data.confirmUrl}</a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;border-top:1px solid #e2e8f0;padding:20px 40px;text-align:center;">
              <p style="font-size:12px;color:#94a3b8;margin:0;">
                Sistema de Gestión de Riesgos Psicosociales · NOM-035-STPS-2018<br/>
                Este correo fue generado automáticamente, no responda a este mensaje.
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

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
