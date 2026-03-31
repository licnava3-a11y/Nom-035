import nodemailer from "nodemailer";

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

/**
 * Guard global de envío de correos.
 *
 * Por defecto está DESACTIVADO (EMAIL_ENABLED != 'true').
 * Para activar en producción, agregar al archivo .env:
 *   EMAIL_ENABLED=true
 *
 * Mientras esté desactivado, todos los correos se registran en consola
 * pero NO se envían al exterior. Los flujos que dependen del resultado
 * siguen funcionando con normalidad (retorna true).
 */
const EMAIL_ENABLED = process.env.EMAIL_ENABLED === "true";

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  // ── MODO PAUSA ──────────────────────────────────────────────────────────────
  if (!EMAIL_ENABLED) {
    console.log(
      "[Email PAUSADO] Envío desactivado (EMAIL_ENABLED != true). Se habría enviado:",
      {
        to: options.to,
        subject: options.subject,
        from: options.from || process.env.SMTP_FROM || "noreply@example.com",
      }
    );
    return true; // No rompe flujos que dependen del resultado
  }
  // ────────────────────────────────────────────────────────────────────────────

  try {
    // Configuración SMTP (usar variables de entorno en producción)
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    // Si no hay configuración SMTP, simular envío exitoso en desarrollo
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log("[Email Simulation] Would send email:", {
        to: options.to,
        subject: options.subject,
        from: options.from || process.env.SMTP_FROM || "noreply@example.com",
      });
      return true;
    }

    // Enviar email
    await transporter.sendMail({
      from: options.from || process.env.SMTP_FROM || "noreply@example.com",
      to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
      subject: options.subject,
      html: options.html,
    });

    console.log(`Email sent successfully to ${options.to}`);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);
    return false;
  }
}
