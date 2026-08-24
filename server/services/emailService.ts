import { isEmailEnabled } from "../_core/email";
import nodemailer from "nodemailer";
import { getDb } from "../db";
import {
  cases,
  employees,
  notifications,
  smtpConfig,
} from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

// Encryption key (same as smtpConfig router)
const ENCRYPTION_KEY =
  process.env.SMTP_ENCRYPTION_KEY || "your-32-character-secret-key-here!";
const ALGORITHM = "aes-256-cbc";

// Decrypt password
function decrypt(text: string): string {
  const parts = text.split(":");
  const iv = Buffer.from(parts.shift()!, "hex");
  const encryptedText = Buffer.from(parts.join(":"), "hex");
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(ENCRYPTION_KEY.padEnd(32, "0").slice(0, 32)),
    iv
  );
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
}

/**
 * Get SMTP transporter with current configuration
 */
async function getTransporter() {
  const db = await getDb();
  if (!db) {
    throw new Error("Base de datos no disponible");
  }

  const configs = await db
    .select()
    .from(smtpConfig)
    .where(eq(smtpConfig.isActive, true))
    .limit(1);

  if (configs.length === 0) {
    throw new Error(
      "No hay configuración SMTP activa. Por favor configura el servidor de correo en Configuración > SMTP."
    );
  }

  const config = configs[0];

  try {
    const decryptedPassword = decrypt(config.password);

    const transporter = nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: {
        user: config.user,
        pass: decryptedPassword,
      },
    });

    return { transporter, config };
  } catch (error) {
    console.error("Error al crear transporter SMTP:", error);
    throw new Error("Error al configurar el servidor de correo");
  }
}

/**
 * Email template types
 */
export type EmailTemplate =
  | "case_critical"
  | "case_assigned"
  | "case_resolved"
  | "alert_threshold"
  | "alert_early_warning"
  | "survey_invitation"
  | "survey_reminder"
  | "training_reminder"
  | "certificate_generated"
  | "contract_expiring"
  | "custom";

/**
 * Send email with retry logic
 */
export async function sendEmail(options: {
  to: string | string[];
  subject: string;
  html: string;
  template?: EmailTemplate;
  retries?: number;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // Guard centralizado: lee emailEnabled desde la BD
  const enabled = await isEmailEnabled();
  if (!enabled) {
    console.log(
      "[Email PAUSADO] Envío desactivado (EMAIL_ENABLED != true). Se habría enviado:",
      { to: options.to, subject: options.subject }
    );
    return { success: true, messageId: "paused" };
  }
  // ────────────────────────────────────────────────────────────────────────
  const maxRetries = options.retries || 3;
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const { transporter, config } = await getTransporter();

      const info = await transporter.sendMail({
        from: `"${config.fromName}" <${config.fromEmail}>`,
        to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
        subject: options.subject,
        html: options.html,
      });

      console.log(
        `Email enviado exitosamente: ${info.messageId} (intento ${attempt}/${maxRetries})`
      );

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error: any) {
      lastError = error;
      console.error(
        `Error al enviar email (intento ${attempt}/${maxRetries}):`,
        error
      );

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        const waitTime = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  return {
    success: false,
    error: lastError?.message || "Error desconocido al enviar email",
  };
}

/**
 * Email Templates
 */

export function getCaseCriticalTemplate(data: {
  folio: string;
  caseType: string;
  reporterName: string;
  description: string;
  priority: string;
  departmentName?: string;
}): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 30px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: bold;">
                    🚨 Caso Crítico Detectado
                  </h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 30px;">
                  <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                    Se ha reportado un nuevo caso de <strong>${data.caseType}</strong> con prioridad <strong style="color: #dc2626;">${data.priority.toUpperCase()}</strong>.
                  </p>
                  
                  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0;">
                    <tr>
                      <td>
                        <p style="margin: 0 0 10px 0; color: #991b1b; font-size: 14px;"><strong>Folio:</strong> ${data.folio}</p>
                        <p style="margin: 0 0 10px 0; color: #991b1b; font-size: 14px;"><strong>Reportante:</strong> ${data.reporterName}</p>
                        ${data.departmentName ? `<p style="margin: 0 0 10px 0; color: #991b1b; font-size: 14px;"><strong>Departamento:</strong> ${data.departmentName}</p>` : ""}
                        <p style="margin: 0; color: #991b1b; font-size: 14px;"><strong>Descripción:</strong> ${data.description}</p>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="margin: 20px 0; color: #374151; font-size: 14px; line-height: 1.6;">
                    Este caso requiere <strong>atención inmediata</strong>. Por favor, accede al sistema para revisar los detalles y tomar las acciones necesarias.
                  </p>
                  
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                    <tr>
                      <td align="center">
                        <a href="${process.env.VITE_FRONTEND_URL || "http://localhost:3000"}/cases" 
                           style="display: inline-block; padding: 12px 30px; background-color: #dc2626; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                          Ver Caso en el Sistema
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0; color: #6b7280; font-size: 12px;">
                    Sistema de Gestión NOM-035 STPS 2018<br>
                    Este es un correo automático, por favor no responder.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

export function getCaseAssignedTemplate(data: {
  folio: string;
  caseType: string;
  assignedToName: string;
  reporterName: string;
  description: string;
}): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #2563eb 0%, #1e40af 100%); padding: 30px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: bold;">
                    📋 Nuevo Caso Asignado
                  </h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 30px;">
                  <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                    Hola <strong>${data.assignedToName}</strong>,
                  </p>
                  
                  <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                    Se te ha asignado un nuevo caso de <strong>${data.caseType}</strong> para su atención.
                  </p>
                  
                  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
                    <tr>
                      <td>
                        <p style="margin: 0 0 10px 0; color: #1e40af; font-size: 14px;"><strong>Folio:</strong> ${data.folio}</p>
                        <p style="margin: 0 0 10px 0; color: #1e40af; font-size: 14px;"><strong>Reportante:</strong> ${data.reporterName}</p>
                        <p style="margin: 0; color: #1e40af; font-size: 14px;"><strong>Descripción:</strong> ${data.description}</p>
                      </td>
                    </tr>
                  </table>
                  
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                    <tr>
                      <td align="center">
                        <a href="${process.env.VITE_FRONTEND_URL || "http://localhost:3000"}/cases" 
                           style="display: inline-block; padding: 12px 30px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                          Ver Caso
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0; color: #6b7280; font-size: 12px;">
                    Sistema de Gestión NOM-035 STPS 2018<br>
                    Este es un correo automático, por favor no responder.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

export function getAlertThresholdTemplate(data: {
  alertType: string;
  departmentName?: string;
  metric: string;
  currentValue: number;
  thresholdValue: number;
  severity: string;
}): string {
  const severityColors: Record<
    string,
    { bg: string; text: string; border: string }
  > = {
    critical: { bg: "#fef2f2", text: "#991b1b", border: "#dc2626" },
    high: { bg: "#fff7ed", text: "#9a3412", border: "#ea580c" },
    medium: { bg: "#fef9c3", text: "#854d0e", border: "#eab308" },
    low: { bg: "#f0fdf4", text: "#166534", border: "#22c55e" },
  };

  const colors = severityColors[data.severity] || severityColors.medium;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, ${colors.border} 0%, ${colors.text} 100%); padding: 30px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: bold;">
                    ⚠️ Alerta de Umbral Superado
                  </h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 30px;">
                  <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                    Se ha detectado que <strong>${data.metric}</strong> ha superado el umbral configurado.
                  </p>
                  
                  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${colors.bg}; border-left: 4px solid ${colors.border}; padding: 15px; margin: 20px 0;">
                    <tr>
                      <td>
                        <p style="margin: 0 0 10px 0; color: ${colors.text}; font-size: 14px;"><strong>Tipo de Alerta:</strong> ${data.alertType}</p>
                        ${data.departmentName ? `<p style="margin: 0 0 10px 0; color: ${colors.text}; font-size: 14px;"><strong>Departamento:</strong> ${data.departmentName}</p>` : ""}
                        <p style="margin: 0 0 10px 0; color: ${colors.text}; font-size: 14px;"><strong>Valor Actual:</strong> ${data.currentValue}</p>
                        <p style="margin: 0 0 10px 0; color: ${colors.text}; font-size: 14px;"><strong>Umbral:</strong> ${data.thresholdValue}</p>
                        <p style="margin: 0; color: ${colors.text}; font-size: 14px;"><strong>Severidad:</strong> ${data.severity.toUpperCase()}</p>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="margin: 20px 0; color: #374151; font-size: 14px; line-height: 1.6;">
                    Se recomienda revisar la situación y tomar las medidas preventivas necesarias.
                  </p>
                  
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                    <tr>
                      <td align="center">
                        <a href="${process.env.VITE_FRONTEND_URL || "http://localhost:3000"}/alerts" 
                           style="display: inline-block; padding: 12px 30px; background-color: ${colors.border}; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                          Ver Alertas
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0; color: #6b7280; font-size: 12px;">
                    Sistema de Gestión NOM-035 STPS 2018<br>
                    Este es un correo automático, por favor no responder.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

export function getContractExpiringTemplate(data: {
  contracts: Array<{
    employeeName: string;
    contractType: string;
    expirationDate: Date;
    daysRemaining: number;
  }>;
}): string {
  const contractRows = data.contracts
    .map(
      contract => `
    <tr>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #374151; font-size: 14px;">${contract.employeeName}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #374151; font-size: 14px;">${contract.contractType}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; color: #374151; font-size: 14px;">${contract.expirationDate.toLocaleDateString("es-MX")}</td>
      <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">
        <span style="display: inline-block; padding: 4px 12px; background-color: ${contract.daysRemaining <= 2 ? "#fef2f2" : "#fff7ed"}; color: ${contract.daysRemaining <= 2 ? "#991b1b" : "#9a3412"}; border-radius: 12px; font-size: 12px; font-weight: bold;">
          ${contract.daysRemaining} día${contract.daysRemaining !== 1 ? "s" : ""}
        </span>
      </td>
    </tr>
  `
    )
    .join("");

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
        <tr>
          <td align="center">
            <table width="700" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #ea580c 0%, #9a3412 100%); padding: 30px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: bold;">
                    ⏰ Alerta de Vencimiento de Contratos
                  </h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 30px;">
                  <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                    Los siguientes contratos están próximos a vencer:
                  </p>
                  
                  <table width="100%" cellpadding="0" cellspacing="0" style="border: 1px solid #e5e7eb; border-radius: 6px; overflow: hidden; margin: 20px 0;">
                    <thead>
                      <tr style="background-color: #f9fafb;">
                        <th style="padding: 12px; text-align: left; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; border-bottom: 2px solid #e5e7eb;">Empleado</th>
                        <th style="padding: 12px; text-align: left; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; border-bottom: 2px solid #e5e7eb;">Tipo de Contrato</th>
                        <th style="padding: 12px; text-align: left; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; border-bottom: 2px solid #e5e7eb;">Fecha de Vencimiento</th>
                        <th style="padding: 12px; text-align: center; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; border-bottom: 2px solid #e5e7eb;">Días Restantes</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${contractRows}
                    </tbody>
                  </table>
                  
                  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fff7ed; border-left: 4px solid #ea580c; padding: 15px; margin: 20px 0;">
                    <tr>
                      <td>
                        <p style="margin: 0; color: #9a3412; font-size: 14px; line-height: 1.6;">
                          <strong>⚠️ Acción Requerida:</strong> Por favor revisa estos contratos y toma las medidas necesarias para su renovación o finalización.
                        </p>
                      </td>
                    </tr>
                  </table>
                  
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                    <tr>
                      <td align="center">
                        <a href="${process.env.VITE_FRONTEND_URL || "http://localhost:3000"}/employees" 
                           style="display: inline-block; padding: 12px 30px; background-color: #ea580c; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                          Ver Contratos
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0; color: #6b7280; font-size: 12px;">
                    Sistema de Gestión de Recursos Humanos<br>
                    Este es un correo automático, por favor no responder.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

export function getTrainingReminderTemplate(data: {
  employeeName: string;
  trainingTitle: string;
  daysOverdue?: number;
  certificateExpirationDate?: Date;
  type: "pending" | "certificate_expiring";
}): string {
  const isExpiring = data.type === "certificate_expiring";
  const headerColor = isExpiring ? "#ea580c" : "#2563eb";
  const headerGradient = isExpiring
    ? "linear-gradient(135deg, #ea580c 0%, #9a3412 100%)"
    : "linear-gradient(135deg, #2563eb 0%, #1e40af 100%)";
  const icon = isExpiring ? "⏰" : "📚";
  const title = isExpiring
    ? "Certificado Próximo a Vencer"
    : "Recordatorio de Capacitación Pendiente";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="background: ${headerGradient}; padding: 30px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: bold;">
                    ${icon} ${title}
                  </h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 30px;">
                  <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                    Hola <strong>${data.employeeName}</strong>,
                  </p>
                  
                  ${
                    isExpiring
                      ? `
                    <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                      Tu certificado de <strong>${data.trainingTitle}</strong> está próximo a vencer.
                    </p>
                    
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #fff7ed; border-left: 4px solid #ea580c; padding: 15px; margin: 20px 0;">
                      <tr>
                        <td>
                          <p style="margin: 0 0 10px 0; color: #9a3412; font-size: 14px;"><strong>Capacitación:</strong> ${data.trainingTitle}</p>
                          <p style="margin: 0; color: #9a3412; font-size: 14px;"><strong>Fecha de Vencimiento:</strong> ${data.certificateExpirationDate?.toLocaleDateString("es-MX")}</p>
                        </td>
                      </tr>
                    </table>
                    
                    <p style="margin: 20px 0; color: #374151; font-size: 14px; line-height: 1.6;">
                      Por favor programa la renovación de tu certificación antes de la fecha de vencimiento.
                    </p>
                  `
                      : `
                    <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                      Tienes pendiente completar la capacitación: <strong>${data.trainingTitle}</strong>.
                    </p>
                    
                    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #eff6ff; border-left: 4px solid #2563eb; padding: 15px; margin: 20px 0;">
                      <tr>
                        <td>
                          <p style="margin: 0 0 10px 0; color: #1e40af; font-size: 14px;"><strong>Capacitación:</strong> ${data.trainingTitle}</p>
                          ${data.daysOverdue ? `<p style="margin: 0; color: #1e40af; font-size: 14px;"><strong>Días de retraso:</strong> ${data.daysOverdue}</p>` : ""}
                        </td>
                      </tr>
                    </table>
                    
                    <p style="margin: 20px 0; color: #374151; font-size: 14px; line-height: 1.6;">
                      Por favor accede al sistema para completar esta capacitación a la brevedad.
                    </p>
                  `
                  }
                  
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                    <tr>
                      <td align="center">
                        <a href="${process.env.VITE_FRONTEND_URL || "http://localhost:3000"}/training" 
                           style="display: inline-block; padding: 12px 30px; background-color: ${headerColor}; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                          Ir a Capacitaciones
                        </a>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0; color: #6b7280; font-size: 12px;">
                    Sistema de Gestión de Capacitación<br>
                    Este es un correo automático, por favor no responder.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

export function getCertificateGeneratedTemplate(data: {
  employeeName: string;
  trainingTitle: string;
  certificateNumber: string;
  issueDate: Date;
  downloadUrl?: string;
}): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: bold;">
                    🎓 Certificado Generado
                  </h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 30px;">
                  <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                    Hola <strong>${data.employeeName}</strong>,
                  </p>
                  
                  <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                    ¡Felicidades! Se ha generado tu certificado de finalización de la capacitación.
                  </p>
                  
                  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
                    <tr>
                      <td>
                        <p style="margin: 0 0 10px 0; color: #166534; font-size: 14px;"><strong>Capacitación:</strong> ${data.trainingTitle}</p>
                        <p style="margin: 0 0 10px 0; color: #166534; font-size: 14px;"><strong>Número de Certificado:</strong> ${data.certificateNumber}</p>
                        <p style="margin: 0; color: #166534; font-size: 14px;"><strong>Fecha de Emisión:</strong> ${data.issueDate.toLocaleDateString("es-MX")}</p>
                      </td>
                    </tr>
                  </table>
                  
                  ${
                    data.downloadUrl
                      ? `
                    <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                      <tr>
                        <td align="center">
                          <a href="${data.downloadUrl}" 
                             style="display: inline-block; padding: 12px 30px; background-color: #10b981; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                            Descargar Certificado
                          </a>
                        </td>
                      </tr>
                    </table>
                  `
                      : ""
                  }
                  
                  <p style="margin: 20px 0; color: #374151; font-size: 14px; line-height: 1.6;">
                    Puedes consultar y descargar tu certificado en cualquier momento desde el sistema.
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0; color: #6b7280; font-size: 12px;">
                    Sistema de Gestión de Capacitación<br>
                    Este es un correo automático, por favor no responder.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

export function getSurveyInvitationTemplate(data: {
  employeeName: string;
  surveyType: string;
  surveyToken: string;
  expiresAt: Date;
}): string {
  const surveyUrl = `${process.env.VITE_FRONTEND_URL || "http://localhost:3000"}/survey/public/${data.surveyToken}`;
  const expirationDate = new Date(data.expiresAt).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #7c3aed 0%, #5b21b6 100%); padding: 30px; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: bold;">
                    📝 Invitación a Encuesta NOM-035
                  </h1>
                </td>
              </tr>
              
              <!-- Content -->
              <tr>
                <td style="padding: 30px;">
                  <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                    Hola <strong>${data.employeeName}</strong>,
                  </p>
                  
                  <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                    Estás invitado/a a participar en la encuesta <strong>${data.surveyType}</strong> como parte del programa de prevención de riesgos psicosociales NOM-035 STPS 2018.
                  </p>
                  
                  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #faf5ff; border-left: 4px solid #7c3aed; padding: 15px; margin: 20px 0;">
                    <tr>
                      <td>
                        <p style="margin: 0 0 10px 0; color: #5b21b6; font-size: 14px;"><strong>Tipo de Encuesta:</strong> ${data.surveyType}</p>
                        <p style="margin: 0; color: #5b21b6; font-size: 14px;"><strong>Válida hasta:</strong> ${expirationDate}</p>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="margin: 20px 0; color: #374151; font-size: 14px; line-height: 1.6;">
                    Tu participación es <strong>confidencial y anónima</strong>. Los resultados se utilizarán únicamente para mejorar las condiciones laborales en la organización.
                  </p>
                  
                  <table width="100%" cellpadding="0" cellspacing="0" style="margin: 30px 0;">
                    <tr>
                      <td align="center">
                        <a href="${surveyUrl}" 
                           style="display: inline-block; padding: 12px 30px; background-color: #7c3aed; color: #ffffff; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">
                          Responder Encuesta
                        </a>
                      </td>
                    </tr>
                  </table>
                  
                  <p style="margin: 20px 0 0 0; color: #6b7280; font-size: 12px; line-height: 1.6; text-align: center;">
                    Si el botón no funciona, copia y pega este enlace en tu navegador:<br>
                    <a href="${surveyUrl}" style="color: #7c3aed; word-break: break-all;">${surveyUrl}</a>
                  </p>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
                  <p style="margin: 0; color: #6b7280; font-size: 12px;">
                    Sistema de Gestión NOM-035 STPS 2018<br>
                    Este es un correo automático, por favor no responder.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

/**
 * Send bulk emails (for notifications to multiple recipients)
 */
export async function sendBulkEmails(
  emails: Array<{
    to: string;
    subject: string;
    html: string;
    template?: EmailTemplate;
  }>
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const results = {
    sent: 0,
    failed: 0,
    errors: [] as string[],
  };

  for (const email of emails) {
    const result = await sendEmail(email);

    if (result.success) {
      results.sent++;
    } else {
      results.failed++;
      results.errors.push(`${email.to}: ${result.error}`);
    }

    // Small delay between emails to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  return results;
}
