import nodemailer from "nodemailer";

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

/**
 * Enviar email usando configuración SMTP del sistema
 * 
 * Nota: Esta es una implementación básica. En producción, configurar SMTP
 * a través de variables de entorno o panel de administración.
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    // Configuración SMTP (usar variables de entorno en producción)
    const transporter = nodemailer.createTransporter({
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
