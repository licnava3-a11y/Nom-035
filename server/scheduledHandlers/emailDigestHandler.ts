/**
 * Handler del cron job de resúmenes por correo (Heartbeat).
 * Se ejecuta cada hora. Envía resúmenes diarios y semanales a los empleados
 * según sus preferencias en la tabla notification_preferences.
 *
 * Ruta: POST /api/scheduled/email-digest
 * Autenticación: sdk.authenticateRequest → user.isCron === true
 */
import type { Request, Response } from "express";
import { eq } from "drizzle-orm";
import { getDb } from "../db";
import { sdk } from "../_core/sdk";
import { sendEmail } from "../_core/email";
import {
  notificationPreferences,
  users,
} from "../../drizzle/schema";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getCurrentHourUTC(): number {
  return new Date().getUTCHours();
}

function getCurrentDayOfWeekUTC(): number {
  // 0=Sunday, 1=Monday, ..., 6=Saturday
  return new Date().getUTCDay();
}

async function buildDailySummaryHtml(userId: number, userName: string): Promise<string> {
  const now = new Date();
  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#1e3a5f;color:white;padding:20px;border-radius:8px 8px 0 0">
        <h1 style="margin:0;font-size:20px">📊 Resumen Diario NOM-035</h1>
        <p style="margin:4px 0 0;opacity:0.8;font-size:14px">${now.toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
      </div>
      <div style="background:#f8fafc;padding:20px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px">
        <p>Hola <strong>${userName}</strong>, aquí tu resumen del día:</p>
        <p>Accede a la plataforma para revisar tus alertas, encuestas y casos asignados.</p>
        <div style="text-align:center;margin:20px 0">
          <a href="${process.env.APP_PUBLIC_URL ?? ""}" 
             style="background:#1e3a5f;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">
            Ver plataforma
          </a>
        </div>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0">
        <p style="font-size:12px;color:#64748b">
          Puedes cambiar la frecuencia de estas notificaciones en tu 
          <a href="${process.env.APP_PUBLIC_URL ?? ""}/profile" style="color:#3b82f6">perfil de usuario</a>.
        </p>
      </div>
    </div>
  `;
}

async function buildWeeklySummaryHtml(userId: number, userName: string): Promise<string> {
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  return `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto">
      <div style="background:#1e3a5f;color:white;padding:20px;border-radius:8px 8px 0 0">
        <h1 style="margin:0;font-size:20px">📅 Resumen Semanal NOM-035</h1>
        <p style="margin:4px 0 0;opacity:0.8;font-size:14px">Semana del ${weekAgo.toLocaleDateString("es-MX")} al ${now.toLocaleDateString("es-MX")}</p>
      </div>
      <div style="background:#f8fafc;padding:20px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 8px 8px">
        <p>Hola <strong>${userName}</strong>, aquí tu resumen semanal de actividad en la plataforma NOM-035:</p>
        <p style="color:#64748b">Accede a la plataforma para ver el detalle completo de tus indicadores, encuestas y casos asignados.</p>
        <div style="text-align:center;margin:20px 0">
          <a href="${process.env.APP_PUBLIC_URL ?? ""}" 
             style="background:#1e3a5f;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold">
            Ver plataforma
          </a>
        </div>
        <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0">
        <p style="font-size:12px;color:#64748b">
          Puedes cambiar la frecuencia de estas notificaciones en tu 
          <a href="${process.env.APP_PUBLIC_URL ?? ""}/profile" style="color:#3b82f6">perfil de usuario</a>.
        </p>
      </div>
    </div>
  `;
}

// ─── Handler principal ────────────────────────────────────────────────────────

export async function emailDigestHandler(req: Request, res: Response) {
  try {
    // Autenticar como cron
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron) {
      return res.status(403).json({ error: "cron-only" });
    }

    const db = await getDb();
    if (!db) return res.status(500).json({ error: "db-unavailable" });

    const currentHour = getCurrentHourUTC();
    const currentDay = getCurrentDayOfWeekUTC();

    // Obtener todas las preferencias con email del usuario
    const prefs = await db
      .select({
        userId: notificationPreferences.userId,
        dailyEmailEnabled: notificationPreferences.dailyEmailEnabled,
        dailyEmailHour: notificationPreferences.dailyEmailHour,
        weeklyEmailEnabled: notificationPreferences.weeklyEmailEnabled,
        weeklyEmailDay: notificationPreferences.weeklyEmailDay,
        userName: users.name,
        userEmail: users.email,
      })
      .from(notificationPreferences)
      .innerJoin(users, eq(users.id, notificationPreferences.userId));

    let dailySent = 0;
    let weeklySent = 0;
    let errors = 0;

    for (const pref of prefs) {
      if (!pref.userEmail) continue;

      try {
        // Resumen diario: enviar si la hora UTC coincide
        if (pref.dailyEmailEnabled && pref.dailyEmailHour === currentHour) {
          const html = await buildDailySummaryHtml(pref.userId, pref.userName ?? "Usuario");
          if (html) {
            await sendEmail({
              to: pref.userEmail,
              subject: `📊 Tu resumen diario NOM-035 — ${new Date().toLocaleDateString("es-MX")}`,
              html,
              sourceModule: "email-digest-daily",
            });
            dailySent++;
          }
        }

        // Resumen semanal: enviar si el día y hora coinciden (hora fija 08:00 UTC)
        if (pref.weeklyEmailEnabled && pref.weeklyEmailDay === currentDay && currentHour === 8) {
          const html = await buildWeeklySummaryHtml(pref.userId, pref.userName ?? "Usuario");
          if (html) {
            await sendEmail({
              to: pref.userEmail,
              subject: `📅 Tu resumen semanal NOM-035 — Semana ${new Date().toLocaleDateString("es-MX")}`,
              html,
              sourceModule: "email-digest-weekly",
            });
            weeklySent++;
          }
        }
      } catch (err) {
        console.error(`[Email Digest] Error procesando userId=${pref.userId}:`, err);
        errors++;
      }
    }

    console.log(`[Email Digest] Completado: ${dailySent} diarios, ${weeklySent} semanales, ${errors} errores`);
    return res.json({ ok: true, dailySent, weeklySent, errors, processedAt: new Date().toISOString() });

  } catch (err) {
    console.error("[Email Digest] Error fatal:", err);
    return res.status(500).json({
      error: String(err),
      stack: err instanceof Error ? err.stack : undefined,
      context: { url: req.url },
      timestamp: new Date().toISOString(),
    });
  }
}
