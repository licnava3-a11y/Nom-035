import { getDb } from "../db";
import { dc3Records, systemSettings } from "../../drizzle/schema";
import { and, lte, gte, eq } from "drizzle-orm";
import { sendEmail } from "../_core/email";
import { notifyOwner } from "../_core/notification";

/**
 * Job diario de alertas de constancias DC-3 próximas a vencer.
 *
 * Vigencia estándar de una constancia DC-3: 2 años desde la fecha de emisión.
 * El job detecta constancias que vencen en los próximos 30 días y envía un
 * correo consolidado al responsable de capacitación configurado en systemSettings.
 *
 * Se ejecuta diariamente a las 07:30 AM (registrado en server/_core/index.ts).
 */
export async function runDc3ExpiryAlertsJob(): Promise<{
  success: boolean;
  checked: number;
  alertsSent: number;
  errors: string[];
}> {
  console.log("[DC3 Expiry Alerts Job] Iniciando verificación de constancias próximas a vencer...");

  const errors: string[] = [];

  try {
    const db = await getDb();
    if (!db) {
      return { success: false, checked: 0, alertsSent: 0, errors: ["Base de datos no disponible"] };
    }

    // Obtener email del responsable de capacitación desde systemSettings
    const [settings] = await db.select().from(systemSettings).limit(1);
    const trainingEmail = (settings as any)?.trainingManagerEmail ?? (settings as any)?.hrEmail;

    if (!trainingEmail) {
      console.warn("[DC3 Expiry Alerts Job] No hay email de responsable de capacitación configurado.");
      return { success: false, checked: 0, alertsSent: 0, errors: ["Email de responsable de capacitación no configurado"] };
    }

    const now = new Date();
    // Ventana: constancias emitidas entre (hoy - 2 años - 30 días) y (hoy - 2 años)
    // Es decir, las que vencen en los próximos 30 días
    const TWO_YEARS_MS = 2 * 365 * 24 * 60 * 60 * 1000;
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

    const expiryWindowStart = now.getTime() - TWO_YEARS_MS - THIRTY_DAYS_MS;
    const expiryWindowEnd = now.getTime() - TWO_YEARS_MS;

    // Buscar constancias emitidas (issued) cuya fecha de última actualización
    // (proxy de fecha de emisión) cae en la ventana de vencimiento
    const expiringRecords = await db
      .select()
      .from(dc3Records)
      .where(
        and(
          eq(dc3Records.status, "issued"),
          gte(dc3Records.updatedAt, new Date(expiryWindowStart)),
          lte(dc3Records.updatedAt, new Date(expiryWindowEnd))
        )
      );

    console.log(`[DC3 Expiry Alerts Job] Constancias próximas a vencer: ${expiringRecords.length}`);

    if (expiringRecords.length === 0) {
      return { success: true, checked: 0, alertsSent: 0, errors: [] };
    }

    // Calcular días restantes para cada constancia
    type ExpiringItem = {
      folio: string;
      workerName: string;
      workerCurp: string;
      company: string;
      courseName: string;
      issuedAt: Date;
      expiresAt: Date;
      daysRemaining: number;
    };

    const items: ExpiringItem[] = expiringRecords.map((r) => {
      // updatedAt es el proxy de la fecha de emisión (cuando status cambió a issued)
      const issuedAt = new Date(r.updatedAt);
      const expiresAt = new Date(issuedAt.getTime() + TWO_YEARS_MS);
      const daysRemaining = Math.ceil((expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000));
      return {
        folio: r.folioNumber ?? r.id.toString(),
        workerName: r.workerName ?? "—",
        workerCurp: r.workerCurp ?? "—",
        company: r.companyName ?? "—",
        courseName: r.courseName ?? "—",
        issuedAt,
        expiresAt,
        daysRemaining,
      };
    });

    // Ordenar por días restantes (más urgente primero)
    items.sort((a, b) => a.daysRemaining - b.daysRemaining);

    // Construir correo HTML
    const tableRows = items
      .map(
        (item) => `
      <tr style="border-bottom:1px solid #e5e7eb;">
        <td style="padding:8px 12px;font-weight:600;color:#1e3a5f;">${item.folio}</td>
        <td style="padding:8px 12px;">${item.workerName}</td>
        <td style="padding:8px 12px;font-family:monospace;font-size:12px;">${item.workerCurp}</td>
        <td style="padding:8px 12px;">${item.company}</td>
        <td style="padding:8px 12px;">${item.courseName}</td>
        <td style="padding:8px 12px;">${item.issuedAt.toLocaleDateString("es-MX")}</td>
        <td style="padding:8px 12px;">${item.expiresAt.toLocaleDateString("es-MX")}</td>
        <td style="padding:8px 12px;text-align:center;">
          <span style="
            background:${item.daysRemaining <= 7 ? "#fee2e2" : item.daysRemaining <= 15 ? "#fef9c3" : "#dcfce7"};
            color:${item.daysRemaining <= 7 ? "#b91c1c" : item.daysRemaining <= 15 ? "#92400e" : "#166534"};
            padding:2px 8px;border-radius:9999px;font-size:12px;font-weight:600;
          ">${item.daysRemaining} días</span>
        </td>
      </tr>`
      )
      .join("");

    const urgentCount = items.filter((i) => i.daysRemaining <= 7).length;
    const warningCount = items.filter((i) => i.daysRemaining > 7 && i.daysRemaining <= 15).length;

    const htmlBody = `
<!DOCTYPE html>
<html lang="es">
<head><meta charset="UTF-8"><title>Alerta: Constancias DC-3 Próximas a Vencer</title></head>
<body style="font-family:Arial,sans-serif;background:#f9fafb;margin:0;padding:20px;">
  <div style="max-width:900px;margin:0 auto;background:white;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
    <!-- Encabezado -->
    <div style="background:#1e3a5f;padding:24px 32px;">
      <h1 style="color:white;margin:0;font-size:20px;">⚠️ Alerta: Constancias DC-3 Próximas a Vencer</h1>
      <p style="color:#93c5fd;margin:6px 0 0;font-size:14px;">
        Generado el ${now.toLocaleDateString("es-MX", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
      </p>
    </div>

    <!-- Resumen -->
    <div style="padding:24px 32px;border-bottom:1px solid #e5e7eb;">
      <p style="margin:0 0 12px;font-size:15px;color:#374151;">
        Se han detectado <strong>${items.length} constancia(s) DC-3</strong> que vencerán en los próximos 30 días.
        Se requiere gestionar la renovación o reentrenamiento de los trabajadores correspondientes.
      </p>
      <div style="display:flex;gap:16px;flex-wrap:wrap;">
        ${urgentCount > 0 ? `<span style="background:#fee2e2;color:#b91c1c;padding:4px 12px;border-radius:6px;font-size:13px;font-weight:600;">🔴 ${urgentCount} vencen en ≤7 días</span>` : ""}
        ${warningCount > 0 ? `<span style="background:#fef9c3;color:#92400e;padding:4px 12px;border-radius:6px;font-size:13px;font-weight:600;">🟡 ${warningCount} vencen en 8-15 días</span>` : ""}
        <span style="background:#dcfce7;color:#166534;padding:4px 12px;border-radius:6px;font-size:13px;font-weight:600;">🟢 ${items.length - urgentCount - warningCount} vencen en 16-30 días</span>
      </div>
    </div>

    <!-- Tabla de constancias -->
    <div style="padding:24px 32px;overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:10px 12px;text-align:left;color:#6b7280;font-weight:600;">Folio</th>
            <th style="padding:10px 12px;text-align:left;color:#6b7280;font-weight:600;">Trabajador</th>
            <th style="padding:10px 12px;text-align:left;color:#6b7280;font-weight:600;">CURP</th>
            <th style="padding:10px 12px;text-align:left;color:#6b7280;font-weight:600;">Empresa</th>
            <th style="padding:10px 12px;text-align:left;color:#6b7280;font-weight:600;">Curso</th>
            <th style="padding:10px 12px;text-align:left;color:#6b7280;font-weight:600;">Fecha emisión</th>
            <th style="padding:10px 12px;text-align:left;color:#6b7280;font-weight:600;">Fecha vencimiento</th>
            <th style="padding:10px 12px;text-align:center;color:#6b7280;font-weight:600;">Días restantes</th>
          </tr>
        </thead>
        <tbody>${tableRows}</tbody>
      </table>
    </div>

    <!-- Pie de página -->
    <div style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">
        Este correo fue generado automáticamente por la Plataforma de Capacitación NOM-035 STPS.
        La vigencia estándar de una constancia DC-3 es de 2 años a partir de la fecha de emisión.
      </p>
    </div>
  </div>
</body>
</html>`;

    await sendEmail({
      to: trainingEmail,
      subject: `[NOM-035] ${items.length} constancia(s) DC-3 próximas a vencer — ${now.toLocaleDateString("es-MX")}`,
      html: htmlBody,
    });

    // Notificación interna al owner
    await notifyOwner({
      title: `⚠️ ${items.length} constancias DC-3 próximas a vencer`,
      content: `Se detectaron ${items.length} constancias DC-3 que vencen en los próximos 30 días. ${urgentCount > 0 ? `${urgentCount} vencen en 7 días o menos.` : ""} Revisa el módulo DC-3 para gestionar las renovaciones.`,
    });

    console.log(`[DC3 Expiry Alerts Job] Alerta enviada a ${trainingEmail} con ${items.length} registros.`);
    return { success: true, checked: expiringRecords.length, alertsSent: 1, errors };

  } catch (err: any) {
    const msg = err?.message ?? String(err);
    console.error("[DC3 Expiry Alerts Job] Error:", msg);
    errors.push(msg);
    return { success: false, checked: 0, alertsSent: 0, errors };
  }
}
