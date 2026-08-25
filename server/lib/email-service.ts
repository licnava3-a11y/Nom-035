/**
 * Servicio de correo electrónico para el buzón NOM-035
 *
 * Este servicio maneja:
 * - Envío de notificaciones de recepción de solicitudes
 * - Envío de actualizaciones de estado
 * - Retroalimentación automática al cambiar estados
 */

interface EmailConfig {
  from: string;
  to: string;
  subject: string;
  html: string;
}

/**
 * Plantillas de correo para diferentes estados
 */
export const emailTemplates = {
  recibido: (folio: string, subject: string) => ({
    subject: `Confirmación de recepción - ${folio}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Solicitud Recibida</h2>
        <p>Estimado(a) usuario(a),</p>
        <p>Hemos recibido su solicitud con los siguientes datos:</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Folio:</strong> ${folio}</p>
          <p><strong>Asunto:</strong> ${subject}</p>
          <p><strong>Estado:</strong> Recibido</p>
        </div>
        <p>Su solicitud ha sido registrada y será atendida a la brevedad posible.</p>
        <p>Recibirá notificaciones por correo electrónico sobre cualquier actualización en el estado de su solicitud.</p>
        <br>
        <p>Atentamente,</p>
        <p><strong>Comité de Atención NOM-035</strong></p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="font-size: 12px; color: #6b7280;">
          Este es un correo automático, por favor no responda a este mensaje.
        </p>
      </div>
    `,
  }),

  asignado: (folio: string, subject: string, assignedTo: string) => ({
    subject: `Actualización de solicitud - ${folio}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Solicitud Asignada</h2>
        <p>Estimado(a) usuario(a),</p>
        <p>Le informamos que su solicitud ha sido asignada para su atención:</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Folio:</strong> ${folio}</p>
          <p><strong>Asunto:</strong> ${subject}</p>
          <p><strong>Estado:</strong> Asignado</p>
          <p><strong>Responsable:</strong> ${assignedTo}</p>
        </div>
        <p>Su caso está siendo revisado por un miembro del comité de atención.</p>
        <p>En breve recibirá más información sobre el seguimiento de su solicitud.</p>
        <br>
        <p>Atentamente,</p>
        <p><strong>Comité de Atención NOM-035</strong></p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="font-size: 12px; color: #6b7280;">
          Este es un correo automático, por favor no responda a este mensaje.
        </p>
      </div>
    `,
  }),

  en_proceso: (folio: string, subject: string) => ({
    subject: `Su solicitud está en proceso - ${folio}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Solicitud en Proceso</h2>
        <p>Estimado(a) usuario(a),</p>
        <p>Le informamos que su solicitud está siendo procesada:</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Folio:</strong> ${folio}</p>
          <p><strong>Asunto:</strong> ${subject}</p>
          <p><strong>Estado:</strong> En Proceso</p>
        </div>
        <p>El comité de atención está trabajando activamente en su caso.</p>
        <p>Se están realizando las investigaciones y análisis necesarios para dar una respuesta adecuada.</p>
        <br>
        <p>Atentamente,</p>
        <p><strong>Comité de Atención NOM-035</strong></p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="font-size: 12px; color: #6b7280;">
          Este es un correo automático, por favor no responda a este mensaje.
        </p>
      </div>
    `,
  }),

  concluido: (folio: string, subject: string, response?: string) => ({
    subject: `Solicitud concluida - ${folio}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #16a34a;">Solicitud Concluida</h2>
        <p>Estimado(a) usuario(a),</p>
        <p>Le informamos que su solicitud ha sido concluida:</p>
        <div style="background-color: #f3f4f6; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p><strong>Folio:</strong> ${folio}</p>
          <p><strong>Asunto:</strong> ${subject}</p>
          <p><strong>Estado:</strong> Concluido</p>
        </div>
        ${
          response
            ? `
          <div style="background-color: #ecfdf5; padding: 15px; border-radius: 5px; margin: 20px 0; border-left: 4px solid #16a34a;">
            <p><strong>Respuesta:</strong></p>
            <p>${response}</p>
          </div>
        `
            : ""
        }
        <p>Agradecemos su confianza en el comité de atención de la NOM-035.</p>
        <p>Si tiene alguna duda o comentario adicional, no dude en contactarnos.</p>
        <br>
        <p>Atentamente,</p>
        <p><strong>Comité de Atención NOM-035</strong></p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="font-size: 12px; color: #6b7280;">
          Este es un correo automático, por favor no responda a este mensaje.
        </p>
      </div>
    `,
  }),
};

/**
 * Función para enviar correo electrónico
 *
 * NOTA: Esta es una implementación de ejemplo.
 * En producción, deberás configurar un servicio de correo real como:
 * - SendGrid
 * - AWS SES
 * - Mailgun
 * - Postmark
 * - SMTP personalizado
 */
export async function sendEmail(config: EmailConfig): Promise<boolean> {
  try {
    // TODO: Implementar integración con servicio de correo real
    // Ejemplo con SendGrid:
    // const sgMail = require('@sendgrid/mail');
    // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    // await sgMail.send(config);

    // Ejemplo con Nodemailer (SMTP):
    // const nodemailer = require('nodemailer');
    // const transporter = nodemailer.createTransport({
    //   host: process.env.SMTP_HOST,
    //   port: process.env.SMTP_PORT,
    //   secure: true,
    //   auth: {
    //     user: process.env.SMTP_USER,
    //     pass: process.env.SMTP_PASS,
    //   },
    // });
    // await transporter.sendMail(config);

    // Por ahora, solo registramos en consola para demostración
    console.log("📧 Correo enviado:", {
      to: config.to,
      subject: config.subject,
      timestamp: new Date().toISOString(),
    });

    return true;
  } catch (error) {
    console.error("❌ Error enviando correo:", error);
    return false;
  }
}

/**
 * Enviar notificación de cambio de estado
 */
export async function sendStatusChangeNotification(
  email: string,
  folio: string,
  subject: string,
  newStatus: "recibido" | "asignado" | "en_proceso" | "concluido",
  assignedTo?: string,
  response?: string
): Promise<boolean> {
  let template: any;

  switch (newStatus) {
    case "recibido":
      template = emailTemplates.recibido(folio, subject);
      break;
    case "asignado":
      template = emailTemplates.asignado(
        folio,
        subject,
        assignedTo || "Comité de Atención"
      );
      break;
    case "en_proceso":
      template = emailTemplates.en_proceso(folio, subject);
      break;
    case "concluido":
      template = emailTemplates.concluido(folio, subject, response);
      break;
    default:
      return false;
  }

  return sendEmail({
    from: process.env.MAILBOX_EMAIL_FROM || "buzon@empresa.com",
    to: email,
    subject: template.subject,
    html: template.html,
  });
}

/**
 * Parser de correos entrantes
 *
 * Esta función procesa correos entrantes y extrae la información necesaria
 * para crear una solicitud en el buzón.
 *
 * NOTA: La implementación específica dependerá del servicio de correo que uses:
 * - SendGrid Inbound Parse
 * - AWS SES + Lambda
 * - Mailgun Routes
 * - Webhook personalizado
 */
export interface ParsedEmail {
  from: string;
  subject: string;
  body: string;
  receivedAt: Date;
}

export function parseIncomingEmail(rawEmail: any): ParsedEmail {
  // TODO: Implementar parser según el formato del servicio de correo
  // Ejemplo con SendGrid Inbound Parse:
  // return {
  //   from: rawEmail.from,
  //   subject: rawEmail.subject,
  //   body: rawEmail.text || rawEmail.html,
  //   receivedAt: new Date(rawEmail.date),
  // };

  return {
    from: rawEmail.from || "",
    subject: rawEmail.subject || "Sin asunto",
    body: rawEmail.body || rawEmail.text || "",
    receivedAt: new Date(),
  };
}
