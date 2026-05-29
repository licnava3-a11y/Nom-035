/**
 * nom035-action-alerts-job.ts
 *
 * Job automático que se ejecuta cada 24 horas para detectar acciones NOM-035
 * próximas a vencer (7 días) o ya vencidas sin notificar, y envía:
 *   1. Un correo HTML al responsable de la acción con enlace directo a la Matriz.
 *   2. Un correo de resumen al administrador del sistema con todas las acciones en alerta.
 *
 * Deduplicación: usa los campos `notificacion7DiasEnviada` y `notificacionVencimientoEnviada`
 * en la tabla nom035_actions para evitar reenvíos.
 */

import { getDb } from "../db";
import { nom035Actions, nom035Plans } from "../../drizzle/schema";
import { eq, and, lte, gte, or, isNull, not, sql } from "drizzle-orm";
import { sendEmail } from "../lib/email-sender";
import { notifyOwner } from "../_core/notification";

const JOB_NAME = "NOM-035 Action Alerts Job";
const JOB_INTERVAL_MS = 24 * 60 * 60 * 1000; // 24 horas

function getBaseUrl(): string {
  return process.env.VITE_APP_URL
    || process.env.APP_URL
    || "https://nom035mood-32dy4ksx.manus.space";
}

const PRIORIDAD_LABEL: Record<string, string> = {
  alta: "🔴 Alta",
  media: "🟡 Media",
  baja: "🟢 Baja",
};

const ESTADO_LABEL: Record<string, string> = {
  no_iniciada: "No iniciada",
  en_proceso: "En proceso",
  cumplida: "Cumplida",
  vencida: "Vencida",
  cancelada: "Cancelada",
};

// ── Plantilla HTML para correo al responsable ─────────────────────────────────

function buildResponsableEmail(params: {
  responsable: string;
  accionId: string;
  objetivo: string;
  accion: string;
  plazo: string;
  prioridad: string;
  tipoPlan: string;
  planIdentificador: string;
  estado: string;
  tipo: "proxima" | "vencida";
  matrizUrl: string;
}): string {
  const esVencida = params.tipo === "vencida";
  const colorBanner = esVencida ? "#dc2626" : "#d97706";
  const tituloBanner = esVencida
    ? "⚠️ Acción NOM-035 VENCIDA"
    : "🔔 Acción NOM-035 próxima a vencer";
  const mensajePrincipal = esVencida
    ? `La siguiente acción de su plan NOM-035 ha <strong>vencido</strong> y requiere atención inmediata.`
    : `La siguiente acción de su plan NOM-035 vence en los próximos <strong>7 días</strong> y requiere su atención.`;

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${tituloBanner}</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
    <!-- Banner -->
    <div style="background:${colorBanner};padding:24px 32px;">
      <h1 style="color:#fff;margin:0;font-size:20px;font-weight:700;">${tituloBanner}</h1>
      <p style="color:rgba(255,255,255,0.9);margin:6px 0 0;font-size:14px;">Sistema de Gestión NOM-035 STPS 2018</p>
    </div>
    <!-- Cuerpo -->
    <div style="padding:28px 32px;">
      <p style="color:#374151;font-size:15px;margin:0 0 20px;">${mensajePrincipal}</p>

      <!-- Datos de la acción -->
      <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:20px;margin-bottom:24px;">
        <table style="width:100%;border-collapse:collapse;">
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:13px;width:140px;vertical-align:top;">ID Acción:</td>
            <td style="padding:6px 0;color:#111827;font-size:13px;font-weight:600;">${params.accionId}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:13px;vertical-align:top;">Plan:</td>
            <td style="padding:6px 0;color:#111827;font-size:13px;">${params.planIdentificador}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:13px;vertical-align:top;">Objetivo:</td>
            <td style="padding:6px 0;color:#111827;font-size:13px;">${params.objetivo}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:13px;vertical-align:top;">Acción:</td>
            <td style="padding:6px 0;color:#111827;font-size:13px;">${params.accion}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:13px;">Estado:</td>
            <td style="padding:6px 0;color:#111827;font-size:13px;">${ESTADO_LABEL[params.estado] || params.estado}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:13px;">Prioridad:</td>
            <td style="padding:6px 0;color:#111827;font-size:13px;">${PRIORIDAD_LABEL[params.prioridad] || params.prioridad}</td>
          </tr>
          <tr>
            <td style="padding:6px 0;color:#6b7280;font-size:13px;">Fecha límite:</td>
            <td style="padding:6px 0;font-size:13px;font-weight:700;color:${colorBanner};">${params.plazo}</td>
          </tr>
        </table>
      </div>

      <!-- CTA -->
      <div style="text-align:center;margin:24px 0;">
        <a href="${params.matrizUrl}" style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:15px;font-weight:600;">
          Ver acción en la Matriz NOM-035
        </a>
      </div>

      <p style="color:#6b7280;font-size:12px;margin:20px 0 0;border-top:1px solid #e5e7eb;padding-top:16px;">
        Este correo fue generado automáticamente por el Sistema de Gestión NOM-035 STPS 2018.<br>
        Por favor no responda a este mensaje.
      </p>
    </div>
  </div>
</body>
</html>`;
}

// ── Plantilla HTML para resumen al administrador ──────────────────────────────

function buildAdminSummaryEmail(params: {
  proximasCount: number;
  vencidasCount: number;
  acciones: Array<{
    accionId: string;
    objetivo: string;
    responsable: string;
    plazo: string;
    prioridad: string;
    estado: string;
    tipo: "proxima" | "vencida";
  }>;
  matrizUrl: string;
}): string {
  const rows = params.acciones.map(a => `
    <tr style="border-bottom:1px solid #e5e7eb;">
      <td style="padding:8px 12px;font-size:12px;font-weight:600;color:#111827;">${a.accionId}</td>
      <td style="padding:8px 12px;font-size:12px;color:#374151;">${a.objetivo.slice(0, 60)}${a.objetivo.length > 60 ? "..." : ""}</td>
      <td style="padding:8px 12px;font-size:12px;color:#374151;">${a.responsable || "—"}</td>
      <td style="padding:8px 12px;font-size:12px;color:${a.tipo === "vencida" ? "#dc2626" : "#d97706"};font-weight:600;">${a.plazo}</td>
      <td style="padding:8px 12px;font-size:12px;">
        <span style="background:${a.tipo === "vencida" ? "#fee2e2" : "#fef3c7"};color:${a.tipo === "vencida" ? "#dc2626" : "#d97706"};padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;">
          ${a.tipo === "vencida" ? "Vencida" : "Próxima"}
        </span>
      </td>
    </tr>`).join("");

  return `<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Resumen de Alertas NOM-035</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif;">
  <div style="max-width:700px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
    <div style="background:#1d4ed8;padding:24px 32px;">
      <h1 style="color:#fff;margin:0;font-size:20px;font-weight:700;">📋 Resumen de Alertas NOM-035</h1>
      <p style="color:rgba(255,255,255,0.9);margin:6px 0 0;font-size:14px;">Reporte automático diario — ${new Date().toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
    </div>
    <div style="padding:28px 32px;">
      <!-- KPIs -->
      <div style="display:flex;gap:16px;margin-bottom:24px;">
        <div style="flex:1;background:#fef3c7;border:1px solid #fde68a;border-radius:8px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:#d97706;">${params.proximasCount}</div>
          <div style="font-size:12px;color:#92400e;margin-top:4px;">Próximas a vencer</div>
        </div>
        <div style="flex:1;background:#fee2e2;border:1px solid #fecaca;border-radius:8px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:#dc2626;">${params.vencidasCount}</div>
          <div style="font-size:12px;color:#991b1b;margin-top:4px;">Acciones vencidas</div>
        </div>
      </div>

      <!-- Tabla de acciones -->
      <h2 style="font-size:15px;font-weight:600;color:#111827;margin:0 0 12px;">Detalle de acciones en alerta</h2>
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="background:#f9fafb;border-bottom:2px solid #e5e7eb;">
              <th style="padding:8px 12px;text-align:left;color:#6b7280;font-weight:600;font-size:11px;text-transform:uppercase;">ID</th>
              <th style="padding:8px 12px;text-align:left;color:#6b7280;font-weight:600;font-size:11px;text-transform:uppercase;">Objetivo</th>
              <th style="padding:8px 12px;text-align:left;color:#6b7280;font-weight:600;font-size:11px;text-transform:uppercase;">Responsable</th>
              <th style="padding:8px 12px;text-align:left;color:#6b7280;font-weight:600;font-size:11px;text-transform:uppercase;">Plazo</th>
              <th style="padding:8px 12px;text-align:left;color:#6b7280;font-weight:600;font-size:11px;text-transform:uppercase;">Estado</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>

      <div style="text-align:center;margin:24px 0;">
        <a href="${params.matrizUrl}" style="display:inline-block;background:#1d4ed8;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:15px;font-weight:600;">
          Ver Matriz de Acciones NOM-035
        </a>
      </div>

      <p style="color:#6b7280;font-size:12px;margin:20px 0 0;border-top:1px solid #e5e7eb;padding-top:16px;">
        Este correo fue generado automáticamente por el Sistema de Gestión NOM-035 STPS 2018.
      </p>
    </div>
  </div>
</body>
</html>`;
}

// ── Función principal del job ─────────────────────────────────────────────────

export async function runNom035ActionAlertsJob(): Promise<{
  checked: number;
  alertsSent: number;
  errors: string[];
}> {
  console.log(`[${JOB_NAME}] Iniciando verificación de acciones próximas a vencer...`);

  const result = { checked: 0, alertsSent: 0, errors: [] as string[] };

  try {
    const db = await getDb();
    if (!db) {
      console.error(`[${JOB_NAME}] Base de datos no disponible`);
      return result;
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // Fecha límite: 7 días a partir de hoy
    const en7Dias = new Date(hoy);
    en7Dias.setDate(hoy.getDate() + 7);

    // ── 1. Acciones próximas a vencer (plazo en los próximos 7 días, sin notificar) ──
    const proximasAVencer = await db
      .select({
        id: nom035Actions.id,
        planId: nom035Actions.planId,
        accionId: nom035Actions.accionId,
        objetivo: nom035Actions.objetivo,
        accion: nom035Actions.accion,
        responsable: nom035Actions.responsable,
        responsableEmail: nom035Actions.responsableEmail,
        plazo: nom035Actions.plazo,
        prioridad: nom035Actions.prioridad,
        estado: nom035Actions.estado,
        planIdentificador: nom035Plans.identificadorNivel,
      })
      .from(nom035Actions)
      .innerJoin(nom035Plans, eq(nom035Actions.planId, nom035Plans.id))
      .where(
        and(
          eq(nom035Actions.isActive, true),
          eq(nom035Actions.notificacion7DiasEnviada, false),
          not(eq(nom035Actions.estado, "cumplida")),
          not(eq(nom035Actions.estado, "cancelada")),
          not(eq(nom035Actions.estado, "vencida")),
          sql`${nom035Actions.plazo} >= ${hoy.toISOString().split("T")[0]}`,
          sql`${nom035Actions.plazo} <= ${en7Dias.toISOString().split("T")[0]}`
        )
      );

    // ── 2. Acciones vencidas (plazo pasado, sin notificar) ────────────────────
    const accionesVencidas = await db
      .select({
        id: nom035Actions.id,
        planId: nom035Actions.planId,
        accionId: nom035Actions.accionId,
        objetivo: nom035Actions.objetivo,
        accion: nom035Actions.accion,
        responsable: nom035Actions.responsable,
        responsableEmail: nom035Actions.responsableEmail,
        plazo: nom035Actions.plazo,
        prioridad: nom035Actions.prioridad,
        estado: nom035Actions.estado,
        planIdentificador: nom035Plans.identificadorNivel,
      })
      .from(nom035Actions)
      .innerJoin(nom035Plans, eq(nom035Actions.planId, nom035Plans.id))
      .where(
        and(
          eq(nom035Actions.isActive, true),
          eq(nom035Actions.notificacionVencimientoEnviada, false),
          not(eq(nom035Actions.estado, "cumplida")),
          not(eq(nom035Actions.estado, "cancelada")),
          sql`${nom035Actions.plazo} < ${hoy.toISOString().split("T")[0]}`
        )
      );

    result.checked = proximasAVencer.length + accionesVencidas.length;
    console.log(`[${JOB_NAME}] Próximas a vencer: ${proximasAVencer.length} | Vencidas: ${accionesVencidas.length}`);

    if (result.checked === 0) {
      console.log(`[${JOB_NAME}] Sin acciones pendientes de notificar. Finalizando.`);
      return result;
    }

    const baseUrl = getBaseUrl();
    const matrizUrl = `${baseUrl}/nom035-matrix`;
    const adminAlertItems: Array<{
      accionId: string; objetivo: string; responsable: string;
      plazo: string; prioridad: string; estado: string; tipo: "proxima" | "vencida";
    }> = [];

    // ── Enviar correos a responsables de acciones próximas ────────────────────
    for (const accion of proximasAVencer) {
      try {
        const plazoStr = accion.plazo
          ? new Date(accion.plazo).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })
          : "Sin fecha";

        adminAlertItems.push({
          accionId: accion.accionId,
          objetivo: accion.objetivo,
          responsable: accion.responsable || "Sin asignar",
          plazo: plazoStr,
          prioridad: accion.prioridad,
          estado: accion.estado,
          tipo: "proxima",
        });

        // Enviar correo al responsable si tiene email
        if (accion.responsableEmail) {
          const html = buildResponsableEmail({
            responsable: accion.responsable || "Responsable",
            accionId: accion.accionId,
            objetivo: accion.objetivo,
            accion: accion.accion,
            plazo: plazoStr,
            prioridad: accion.prioridad,
            tipoPlan: "",
            planIdentificador: accion.planIdentificador || `Plan #${accion.planId}`,
            estado: accion.estado,
            tipo: "proxima",
            matrizUrl,
          });

          await sendEmail({
            to: accion.responsableEmail,
            subject: `🔔 Acción NOM-035 próxima a vencer: ${accion.accionId}`,
            html,
          });
        }

        // Marcar como notificada
        await db
          .update(nom035Actions)
          .set({ notificacion7DiasEnviada: true })
          .where(eq(nom035Actions.id, accion.id));

        result.alertsSent++;
      } catch (err) {
        const msg = `Error procesando acción próxima ${accion.accionId}: ${String(err)}`;
        console.error(`[${JOB_NAME}] ${msg}`);
        result.errors.push(msg);
      }
    }

    // ── Enviar correos a responsables de acciones vencidas ────────────────────
    for (const accion of accionesVencidas) {
      try {
        const plazoStr = accion.plazo
          ? new Date(accion.plazo).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })
          : "Sin fecha";

        adminAlertItems.push({
          accionId: accion.accionId,
          objetivo: accion.objetivo,
          responsable: accion.responsable || "Sin asignar",
          plazo: plazoStr,
          prioridad: accion.prioridad,
          estado: accion.estado,
          tipo: "vencida",
        });

        // Actualizar estado a "vencida" en BD
        await db
          .update(nom035Actions)
          .set({ estado: "vencida", notificacionVencimientoEnviada: true })
          .where(eq(nom035Actions.id, accion.id));

        // Enviar correo al responsable si tiene email
        if (accion.responsableEmail) {
          const html = buildResponsableEmail({
            responsable: accion.responsable || "Responsable",
            accionId: accion.accionId,
            objetivo: accion.objetivo,
            accion: accion.accion,
            plazo: plazoStr,
            prioridad: accion.prioridad,
            tipoPlan: "",
            planIdentificador: accion.planIdentificador || `Plan #${accion.planId}`,
            estado: "vencida",
            tipo: "vencida",
            matrizUrl,
          });

          await sendEmail({
            to: accion.responsableEmail,
            subject: `⚠️ Acción NOM-035 VENCIDA: ${accion.accionId}`,
            html,
          });
        }

        result.alertsSent++;
      } catch (err) {
        const msg = `Error procesando acción vencida ${accion.accionId}: ${String(err)}`;
        console.error(`[${JOB_NAME}] ${msg}`);
        result.errors.push(msg);
      }
    }

    // ── Enviar resumen al administrador ───────────────────────────────────────
    if (adminAlertItems.length > 0) {
      try {
        const summaryHtml = buildAdminSummaryEmail({
          proximasCount: proximasAVencer.length,
          vencidasCount: accionesVencidas.length,
          acciones: adminAlertItems,
          matrizUrl,
        });

        await notifyOwner({
          title: `📋 NOM-035: ${proximasAVencer.length} próximas a vencer, ${accionesVencidas.length} vencidas`,
          content: summaryHtml,
        });
      } catch (err) {
        console.error(`[${JOB_NAME}] Error enviando resumen al administrador:`, err);
      }
    }

    console.log(`[${JOB_NAME}] Completado: ${result.alertsSent} alertas enviadas, ${result.errors.length} errores.`);
    return result;

  } catch (err) {
    const msg = `Error general en el job: ${String(err)}`;
    console.error(`[${JOB_NAME}] ${msg}`);
    result.errors.push(msg);
    return result;
  }
}

// ── Función de arranque con setInterval ──────────────────────────────────────

export function startNom035ActionAlertsJob(): void {
  // Ejecutar con un delay inicial de 10 segundos para no saturar el arranque
  setTimeout(() => {
    runNom035ActionAlertsJob().catch((e) =>
      console.error(`[${JOB_NAME}] Error en ejecución inicial:`, e)
    );
  }, 10_000);

  // Luego ejecutar cada 24 horas
  setInterval(() => {
    runNom035ActionAlertsJob().catch((e) =>
      console.error(`[${JOB_NAME}] Error en ejecución periódica:`, e)
    );
  }, JOB_INTERVAL_MS);

  console.log(`[${JOB_NAME}] Job registrado. Se ejecutará cada 24 horas.`);
}
