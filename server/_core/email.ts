import nodemailer from "nodemailer";
import { getDb } from "../db";
import { smtpConfig } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
}

/**
 * Cache del estado emailEnabled para evitar consultas a BD en cada envío.
 * Se invalida cada 30 segundos o cuando el toggle cambia desde la UI.
 */
let _emailEnabledCache: boolean | null = null;
let _emailEnabledCacheAt = 0;
const CACHE_TTL_MS = 30_000; // 30 segundos

export async function isEmailEnabled(): Promise<boolean> {
  const now = Date.now();
  if (_emailEnabledCache !== null && now - _emailEnabledCacheAt < CACHE_TTL_MS) {
    return _emailEnabledCache;
  }
  try {
    const db = await getDb();
    if (!db) {
      _emailEnabledCache = process.env.EMAIL_ENABLED === "true";
    } else {
      const configs = await db
        .select({ emailEnabled: smtpConfig.emailEnabled })
        .from(smtpConfig)
        .where(eq(smtpConfig.isActive, true))
        .limit(1);
      if (configs.length > 0) {
        _emailEnabledCache = Boolean(configs[0].emailEnabled);
      } else {
        // Sin registro SMTP: usar variable de entorno como fallback
        _emailEnabledCache = process.env.EMAIL_ENABLED === "true";
      }
    }
  } catch {
    _emailEnabledCache = process.env.EMAIL_ENABLED === "true";
  }
  _emailEnabledCacheAt = now;
  return _emailEnabledCache!;
}

/** Invalida el caché (llamar tras cambiar el toggle en la UI) */
export function invalidateEmailEnabledCache(): void {
  _emailEnabledCache = null;
  _emailEnabledCacheAt = 0;
}

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const enabled = await isEmailEnabled();

  // ── MODO PAUSA ──────────────────────────────────────────────────────────────
  if (!enabled) {
    console.log(
      "[Email PAUSADO] Envío desactivado desde la configuración. Se habría enviado:",
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
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log("[Email Simulation] Would send email:", {
        to: options.to,
        subject: options.subject,
        from: options.from || process.env.SMTP_FROM || "noreply@example.com",
      });
      return true;
    }

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
