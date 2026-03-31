import nodemailer from "nodemailer";
import { getDb } from "../db";
import { smtpConfig, emailQueue } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  text?: string;
  /** Módulo que origina el envío (para trazabilidad en la cola) */
  sourceModule?: string;
}

// ── Caché del estado emailEnabled ────────────────────────────────────────────
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

// ── Encolar correo bloqueado ──────────────────────────────────────────────────
async function enqueueEmail(options: EmailOptions): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    const toAddress = Array.isArray(options.to) ? options.to.join(", ") : options.to;
    await (db.insert(emailQueue) as any).values({
      toAddress,
      subject: options.subject,
      htmlBody: options.html,
      textBody: options.text,
      fromAddress: options.from,
      sourceModule: options.sourceModule || "unknown",
      status: "pending",
    });
  } catch (err) {
    console.error("[Email Queue] Error al encolar correo:", err);
  }
}

// ── Envío real via SMTP ───────────────────────────────────────────────────────
async function sendViaSmtp(options: EmailOptions): Promise<boolean> {
  try {
    const db = await getDb();
    let smtpHost = process.env.SMTP_HOST;
    let smtpPort = parseInt(process.env.SMTP_PORT || "587");
    let smtpUser = process.env.SMTP_USER;
    let smtpPass = process.env.SMTP_PASS;
    let smtpFrom = options.from || process.env.SMTP_FROM || "noreply@example.com";

    // Intentar leer config desde BD
    if (db) {
      const configs = await db
        .select()
        .from(smtpConfig)
        .where(and(eq(smtpConfig.isActive, true), eq(smtpConfig.emailEnabled, true)))
        .limit(1);
      if (configs.length > 0) {
        const cfg = configs[0];
        smtpHost = cfg.host || smtpHost;
        smtpPort = cfg.port || smtpPort;
        smtpUser = cfg.username || smtpUser;
        smtpPass = cfg.password ? Buffer.from(cfg.password, "base64").toString("utf-8") : smtpPass;
        smtpFrom = cfg.fromEmail || smtpFrom;
      }
    }

    if (!smtpHost || !smtpUser || !smtpPass) {
      console.log("[Email] SMTP no configurado. Correo no enviado:", { to: options.to, subject: options.subject });
      return false;
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    await transporter.sendMail({
      from: smtpFrom,
      to: Array.isArray(options.to) ? options.to.join(", ") : options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    console.log(`[Email] Enviado exitosamente a ${options.to}`);
    return true;
  } catch (error) {
    console.error("[Email] Error al enviar:", error);
    return false;
  }
}

// ── Función principal de envío ────────────────────────────────────────────────
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  const enabled = await isEmailEnabled();

  if (!enabled) {
    // Registrar en cola para reenvío posterior
    await enqueueEmail(options);
    console.log(
      "[Email PAUSADO] Correo encolado para reenvío al activar SMTP:",
      { to: options.to, subject: options.subject, module: options.sourceModule }
    );
    return true; // No rompe flujos que dependen del resultado
  }

  return sendViaSmtp(options);
}

// ── Reenvío de correos pendientes en la cola ──────────────────────────────────
export async function flushEmailQueue(): Promise<{ sent: number; failed: number }> {
  const db = await getDb();
  if (!db) return { sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;

  try {
    const pending = await db
      .select()
      .from(emailQueue)
      .where(eq(emailQueue.status, "pending"))
      .limit(50); // Procesar en lotes de 50

    for (const item of pending) {
      const success = await sendViaSmtp({
        to: item.toAddress,
        subject: item.subject,
        html: item.htmlBody,
        text: item.textBody || undefined,
        from: item.fromAddress || undefined,
        sourceModule: item.sourceModule || undefined,
      });

      if (success) {
        await db
          .update(emailQueue)
          .set({ status: "sent", sentAt: new Date(), attempts: (item.attempts || 0) + 1 })
          .where(eq(emailQueue.id, item.id));
        sent++;
      } else {
        const newAttempts = (item.attempts || 0) + 1;
        await db
          .update(emailQueue)
          .set({
            status: newAttempts >= 3 ? "failed" : "pending",
            attempts: newAttempts,
            lastAttemptAt: new Date(),
            errorMessage: "SMTP send failed",
          })
          .where(eq(emailQueue.id, item.id));
        failed++;
      }
    }
  } catch (err) {
    console.error("[Email Queue] Error al procesar cola:", err);
  }

  return { sent, failed };
}
