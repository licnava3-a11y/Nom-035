import { isEmailEnabled } from "../_core/email";
import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

/**
 * Servicio de envío de correos electrónicos para encuestas NOM-035
 * Utiliza configuración SMTP del entorno
 */

// Configuración del transportador SMTP
const createTransporter = (): Transporter => {
  // TODO: Configurar variables de entorno SMTP
  // Por ahora usamos un transportador de prueba (ethereal.email)
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.ethereal.email",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER || "test@example.com",
      pass: process.env.SMTP_PASS || "password",
    },
  });
};

/**
 * Plantilla HTML base para correos
 */
const getEmailTemplate = (content: string, title: string): string => {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #333333;
      background-color: #f4f4f4;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 20px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    .header {
      background: linear-gradient(135deg, #1e40af 0%, #3b82f6 100%);
      color: #ffffff;
      padding: 30px 20px;
      text-align: center;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .content {
      padding: 30px 20px;
    }
    .content p {
      margin: 0 0 15px 0;
      font-size: 15px;
    }
    .button {
      display: inline-block;
      padding: 12px 30px;
      background-color: #1e40af;
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
      text-align: center;
    }
    .button:hover {
      background-color: #1e3a8a;
    }
    .info-box {
      background-color: #eff6ff;
      border-left: 4px solid #3b82f6;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .warning-box {
      background-color: #fef3c7;
      border-left: 4px solid #f59e0b;
      padding: 15px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .footer {
      background-color: #f9fafb;
      padding: 20px;
      text-align: center;
      font-size: 13px;
      color: #6b7280;
      border-top: 1px solid #e5e7eb;
    }
    .footer p {
      margin: 5px 0;
    }
    .footer a {
      color: #3b82f6;
      text-decoration: none;
    }
    @media only screen and (max-width: 600px) {
      .container {
        margin: 0;
        border-radius: 0;
      }
      .content {
        padding: 20px 15px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${title}</h1>
    </div>
    <div class="content">
      ${content}
    </div>
    <div class="footer">
      <p><strong>Plataforma de Capacitación NOM-035 STPS 2018</strong></p>
      <p>Este correo es confidencial y está dirigido únicamente al destinatario.</p>
      <p>Si recibió este correo por error, por favor elimínelo.</p>
    </div>
  </div>
</body>
</html>
  `;
};

/**
 * Plantilla para invitación a encuesta
 */
export const getSurveyInvitationTemplate = (data: {
  userName: string;
  surveyTitle: string;
  surveyDescription: string;
  surveyUrl: string;
  dueDate?: string;
}): string => {
  const content = `
    <p>Estimado(a) <strong>${data.userName}</strong>,</p>
    
    <p>Como parte del cumplimiento de la <strong>NOM-035-STPS-2018</strong> sobre factores de riesgo psicosocial en el trabajo, le invitamos a responder la siguiente encuesta:</p>
    
    <div class="info-box">
      <h3 style="margin-top: 0; color: #1e40af;">${data.surveyTitle}</h3>
      <p>${data.surveyDescription}</p>
    </div>
    
    <p>Su participación es <strong>confidencial y anónima</strong>. Los resultados serán utilizados únicamente para identificar áreas de mejora en el ambiente laboral.</p>
    
    ${
      data.dueDate
        ? `
    <div class="warning-box">
      <p style="margin: 0;"><strong>Fecha límite:</strong> ${data.dueDate}</p>
    </div>
    `
        : ""
    }
    
    <div style="text-align: center;">
      <a href="${data.surveyUrl}" class="button">Responder Encuesta</a>
    </div>
    
    <p style="font-size: 13px; color: #6b7280; margin-top: 30px;">
      Si tiene alguna duda o problema técnico, por favor contacte al área de Recursos Humanos.
    </p>
  `;

  return getEmailTemplate(content, "Invitación a Encuesta NOM-035");
};

/**
 * Plantilla para recordatorio de encuesta pendiente
 */
export const getSurveyReminderTemplate = (data: {
  userName: string;
  surveyTitle: string;
  surveyUrl: string;
  daysRemaining?: number;
}): string => {
  const content = `
    <p>Estimado(a) <strong>${data.userName}</strong>,</p>
    
    <p>Le recordamos que aún no ha completado la siguiente encuesta:</p>
    
    <div class="info-box">
      <h3 style="margin-top: 0; color: #1e40af;">${data.surveyTitle}</h3>
    </div>
    
    ${
      data.daysRemaining !== undefined
        ? `
    <div class="warning-box">
      <p style="margin: 0;">
        <strong>⏰ Tiempo restante:</strong> ${data.daysRemaining} ${data.daysRemaining === 1 ? "día" : "días"}
      </p>
    </div>
    `
        : ""
    }
    
    <p>Su participación es importante para cumplir con la normativa <strong>NOM-035-STPS-2018</strong> y mejorar el ambiente laboral de nuestra organización.</p>
    
    <div style="text-align: center;">
      <a href="${data.surveyUrl}" class="button">Completar Encuesta Ahora</a>
    </div>
    
    <p style="font-size: 13px; color: #6b7280; margin-top: 30px;">
      Este es un recordatorio automático. Si ya completó la encuesta, por favor ignore este mensaje.
    </p>
  `;

  return getEmailTemplate(content, "Recordatorio: Encuesta NOM-035 Pendiente");
};

/**
 * Plantilla para confirmación de encuesta completada
 */
export const getSurveyCompletionTemplate = (data: {
  userName: string;
  surveyTitle: string;
  completedAt: string;
}): string => {
  const content = `
    <p>Estimado(a) <strong>${data.userName}</strong>,</p>
    
    <p>Hemos recibido exitosamente su respuesta a la encuesta:</p>
    
    <div class="info-box">
      <h3 style="margin-top: 0; color: #10b981;">${data.surveyTitle}</h3>
      <p style="margin: 0;"><strong>Completada el:</strong> ${data.completedAt}</p>
    </div>
    
    <p>Agradecemos su participación. Su opinión es valiosa para identificar áreas de mejora en el ambiente laboral.</p>
    
    <p><strong>Confidencialidad:</strong> Sus respuestas son completamente confidenciales y serán utilizadas únicamente con fines estadísticos para cumplir con la NOM-035-STPS-2018.</p>
    
    <p style="font-size: 13px; color: #6b7280; margin-top: 30px;">
      Si tiene alguna pregunta sobre los resultados o el proceso, por favor contacte al área de Recursos Humanos.
    </p>
  `;

  return getEmailTemplate(content, "Encuesta NOM-035 Completada");
};

/**
 * Enviar correo electrónico
 */
export async function sendEmail(options: {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
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
  try {
    const transporter = createTransporter();

    const info = await transporter.sendMail({
      from:
        options.from ||
        process.env.SMTP_FROM ||
        '"Plataforma NOM-035" <noreply@nom035.com>',
      to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
      subject: options.subject,
      html: options.html,
    });

    console.log("Email sent:", info.messageId);

    return {
      success: true,
      messageId: info.messageId,
    };
  } catch (error) {
    console.error("Error sending email:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Enviar invitación a encuesta
 */
export async function sendSurveyInvitation(data: {
  to: string;
  userName: string;
  surveyTitle: string;
  surveyDescription: string;
  surveyUrl: string;
  dueDate?: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const html = getSurveyInvitationTemplate(data);

  return sendEmail({
    to: data.to,
    subject: `Invitación: ${data.surveyTitle}`,
    html,
  });
}

/**
 * Enviar recordatorio de encuesta
 */
export async function sendSurveyReminder(data: {
  to: string;
  userName: string;
  surveyTitle: string;
  surveyUrl: string;
  daysRemaining?: number;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const html = getSurveyReminderTemplate(data);

  return sendEmail({
    to: data.to,
    subject: `Recordatorio: ${data.surveyTitle}`,
    html,
  });
}

/**
 * Enviar confirmación de encuesta completada
 */
export async function sendSurveyCompletion(data: {
  to: string;
  userName: string;
  surveyTitle: string;
  completedAt: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const html = getSurveyCompletionTemplate(data);

  return sendEmail({
    to: data.to,
    subject: `Confirmación: ${data.surveyTitle} completada`,
    html,
  });
}
