/**
 * dispatchesReport.ts
 * Genera el reporte ejecutivo PDF de trazabilidad de despachos de minutas.
 * Usa jsPDF (cliente-side compatible) + autoTable para la tabla de despachos.
 * Se ejecuta en Node.js usando el paquete jspdf + jspdf-autotable.
 */
import { getDb } from "./db";
import {
  minuteDispatches,
  minuteRecipients,
  meetingMinutes,
} from "../drizzle/schema";
import { eq, and, gte, lte, desc } from "drizzle-orm";

interface DispatchReportOptions {
  status?: "sent" | "read" | "bounced" | "all";
  recipientId?: number;
  dateFrom?: string;
  dateTo?: string;
  search?: string;
}

function fmtDate(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function fmtDateTime(d: Date | string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleString("es-MX", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export async function generateDispatchesReportPDF(
  options: DispatchReportOptions = {}
): Promise<Buffer> {
  const db = await getDb();
  if (!db) throw new Error("Base de datos no disponible");

  // ── Construir condiciones de filtro ────────────────────────────────────────
  const conditions: any[] = [];
  if (options.recipientId) {
    conditions.push(eq(minuteDispatches.recipientId, options.recipientId));
  }
  if (options.status && options.status !== "all") {
    conditions.push(eq(minuteDispatches.status, options.status));
  }
  if (options.dateFrom) {
    conditions.push(gte(minuteDispatches.sentAt, new Date(options.dateFrom)));
  }
  if (options.dateTo) {
    const end = new Date(options.dateTo);
    end.setHours(23, 59, 59, 999);
    conditions.push(lte(minuteDispatches.sentAt, end));
  }
  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // ── Obtener despachos con joins ─────────────────────────────────────────────
  let rows = await db
    .select({
      id: minuteDispatches.id,
      status: minuteDispatches.status,
      sentAt: minuteDispatches.sentAt,
      readAt: minuteDispatches.readAt,
      notes: minuteDispatches.notes,
      minuteFolio: meetingMinutes.folio,
      minuteTitle: meetingMinutes.title,
      minuteDate: meetingMinutes.meetingDate,
      minuteType: meetingMinutes.meetingType,
      recipientName: minuteRecipients.name,
      recipientEmail: minuteRecipients.email,
      recipientPosition: minuteRecipients.position,
      recipientDepartment: minuteRecipients.department,
    })
    .from(minuteDispatches)
    .leftJoin(meetingMinutes, eq(minuteDispatches.minuteId, meetingMinutes.id))
    .leftJoin(
      minuteRecipients,
      eq(minuteDispatches.recipientId, minuteRecipients.id)
    )
    .where(whereClause)
    .orderBy(desc(minuteDispatches.sentAt))
    .limit(500); // máximo 500 registros en el reporte

  // Filtro de búsqueda en memoria
  if (options.search && options.search.trim()) {
    const term = options.search.toLowerCase().trim();
    rows = rows.filter(
      r =>
        (r.recipientName ?? "").toLowerCase().includes(term) ||
        (r.minuteTitle ?? "").toLowerCase().includes(term) ||
        (r.minuteFolio ?? "").toLowerCase().includes(term) ||
        (r.recipientEmail ?? "").toLowerCase().includes(term)
    );
  }

  // ── Calcular estadísticas ───────────────────────────────────────────────────
  const total = rows.length;
  const read = rows.filter(r => r.status === "read" || r.readAt).length;
  const sent = rows.filter(r => r.status === "sent").length;
  const bounced = rows.filter(r => r.status === "bounced").length;
  const unread = total - read - bounced;
  const readRate = total > 0 ? Math.round((read / total) * 100) : 0;

  // ── Tasa de lectura por destinatario ────────────────────────────────────────
  const byRecipient = new Map<string, { total: number; read: number }>();
  for (const r of rows) {
    const key = r.recipientName ?? r.recipientEmail ?? "Desconocido";
    if (!byRecipient.has(key)) byRecipient.set(key, { total: 0, read: 0 });
    const entry = byRecipient.get(key)!;
    entry.total++;
    if (r.status === "read" || r.readAt) entry.read++;
  }
  const recipientStats = Array.from(byRecipient.entries())
    .map(([name, s]) => ({
      name,
      total: s.total,
      read: s.read,
      rate: s.total > 0 ? Math.round((s.read / s.total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 20);

  // ── Generar HTML para el PDF ────────────────────────────────────────────────
  const generatedAt = new Date().toLocaleString("es-MX", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const periodLabel =
    options.dateFrom || options.dateTo
      ? `${options.dateFrom ? fmtDate(options.dateFrom) : "Inicio"} — ${options.dateTo ? fmtDate(options.dateTo) : "Hoy"}`
      : "Todo el tiempo";

  const statusLabel: Record<string, string> = {
    sent: "Enviado",
    read: "Leído",
    bounced: "Rebotado",
  };

  const tableRows = rows
    .map(
      r => `
    <tr>
      <td class="mono">${r.minuteFolio ?? "—"}</td>
      <td>${r.minuteTitle ?? "Sin título"}</td>
      <td>${r.recipientName ?? "—"}</td>
      <td>${r.recipientPosition ?? "—"}</td>
      <td>${fmtDate(r.sentAt)}</td>
      <td>${r.readAt ? fmtDateTime(r.readAt) : '<span class="pending">Sin confirmar</span>'}</td>
      <td><span class="badge badge-${r.status}">${statusLabel[r.status] ?? r.status}</span></td>
    </tr>`
    )
    .join("");

  const recipientRows = recipientStats
    .map(
      s => `
    <tr>
      <td>${s.name}</td>
      <td class="center">${s.total}</td>
      <td class="center green">${s.read}</td>
      <td class="center">
        <div class="bar-wrap">
          <div class="bar" style="width:${s.rate}%"></div>
          <span>${s.rate}%</span>
        </div>
      </td>
    </tr>`
    )
    .join("");

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8"/>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #1a1a2e; background: #fff; }
  .page { padding: 24px 28px; }

  /* Header */
  .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #1a237e; padding-bottom: 12px; margin-bottom: 18px; }
  .header-left h1 { font-size: 18px; font-weight: 700; color: #1a237e; }
  .header-left p { font-size: 10px; color: #555; margin-top: 2px; }
  .header-right { text-align: right; font-size: 10px; color: #555; }
  .badge-nom { background: #1a237e; color: #fff; font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 3px; }

  /* Stats */
  .stats { display: flex; gap: 10px; margin-bottom: 18px; }
  .stat-card { flex: 1; border: 1px solid #e0e0e0; border-radius: 6px; padding: 10px; text-align: center; }
  .stat-card .val { font-size: 22px; font-weight: 700; }
  .stat-card .lbl { font-size: 9px; color: #666; margin-top: 2px; }
  .blue { color: #1565c0; }
  .green { color: #2e7d32; }
  .amber { color: #e65100; }
  .red { color: #c62828; }
  .violet { color: #6a1b9a; }

  /* Section title */
  .section-title { font-size: 12px; font-weight: 700; color: #1a237e; border-left: 4px solid #1a237e; padding-left: 8px; margin-bottom: 10px; }

  /* Tables */
  table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  th { background: #1a237e; color: #fff; font-size: 9px; font-weight: 600; padding: 6px 5px; text-align: left; }
  td { border-bottom: 1px solid #f0f0f0; padding: 5px; font-size: 9px; vertical-align: middle; }
  tr:nth-child(even) td { background: #f8f9ff; }
  .mono { font-family: monospace; font-size: 9px; background: #eee; padding: 1px 4px; border-radius: 2px; }
  .center { text-align: center; }
  .pending { color: #999; font-style: italic; }

  /* Badges */
  .badge { padding: 2px 6px; border-radius: 3px; font-size: 8px; font-weight: 600; }
  .badge-read { background: #e8f5e9; color: #2e7d32; }
  .badge-sent { background: #e3f2fd; color: #1565c0; }
  .badge-bounced { background: #ffebee; color: #c62828; }

  /* Bar chart */
  .bar-wrap { display: flex; align-items: center; gap: 4px; }
  .bar { height: 8px; background: #1565c0; border-radius: 2px; min-width: 2px; }

  /* Footer */
  .footer { border-top: 1px solid #e0e0e0; padding-top: 8px; margin-top: 10px; display: flex; justify-content: space-between; font-size: 9px; color: #888; }
</style>
</head>
<body>
<div class="page">

  <!-- Encabezado -->
  <div class="header">
    <div class="header-left">
      <h1>Reporte Ejecutivo de Trazabilidad Documental</h1>
      <p>Despachos de Minutas del Comité de Seguridad y Salud en el Trabajo &nbsp;|&nbsp; <span class="badge-nom">NOM-035-STPS-2018</span></p>
    </div>
    <div class="header-right">
      <p><strong>Período:</strong> ${periodLabel}</p>
      <p><strong>Generado:</strong> ${generatedAt}</p>
      ${options.status && options.status !== "all" ? `<p><strong>Estado filtrado:</strong> ${statusLabel[options.status] ?? options.status}</p>` : ""}
    </div>
  </div>

  <!-- Estadísticas -->
  <div class="stats">
    <div class="stat-card"><div class="val">${total}</div><div class="lbl">Total despachos</div></div>
    <div class="stat-card"><div class="val green">${read}</div><div class="lbl">Leídos</div></div>
    <div class="stat-card"><div class="val blue">${sent}</div><div class="lbl">Enviados</div></div>
    <div class="stat-card"><div class="val amber">${unread}</div><div class="lbl">Sin leer</div></div>
    <div class="stat-card"><div class="val red">${bounced}</div><div class="lbl">Rebotados</div></div>
    <div class="stat-card"><div class="val violet">${readRate}%</div><div class="lbl">Tasa de lectura</div></div>
  </div>

  <!-- Tasa de lectura por destinatario -->
  ${
    recipientStats.length > 0
      ? `<div class="section-title">Tasa de Lectura por Destinatario</div>
  <table>
    <thead>
      <tr>
        <th>Destinatario</th>
        <th class="center">Total</th>
        <th class="center">Leídos</th>
        <th>Tasa de lectura</th>
      </tr>
    </thead>
    <tbody>${recipientRows}</tbody>
  </table>`
      : ""
  }

  <!-- Detalle de despachos -->
  <div class="section-title">Detalle de Despachos (${rows.length} registros)</div>
  <table>
    <thead>
      <tr>
        <th>Folio</th>
        <th>Minuta</th>
        <th>Destinatario</th>
        <th>Cargo</th>
        <th>Fecha Envío</th>
        <th>Fecha Lectura</th>
        <th>Estado</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows || '<tr><td colspan="7" style="text-align:center;color:#999;padding:16px;">No se encontraron despachos con los filtros aplicados.</td></tr>'}
    </tbody>
  </table>

  <!-- Pie de página -->
  <div class="footer">
    <span>Sistema de Gestión NOM-035-STPS-2018 &nbsp;|&nbsp; Comité de Seguridad y Salud en el Trabajo</span>
    <span>Reporte generado automáticamente &nbsp;|&nbsp; ${generatedAt}</span>
  </div>

</div>
</body>
</html>`;

  // ── Generar PDF con Puppeteer (ya disponible en el proyecto) ────────────────
  const { generatePDFFromHTML } = await import("./_core/pdfGenerator");
  const pdfUrl = await generatePDFFromHTML(
    html,
    `despachos-minutas-${Date.now()}`,
    {
      format: "A4",
      orientation: "landscape",
      margin: { top: "10mm", right: "10mm", bottom: "10mm", left: "10mm" },
    }
  );

  // Descargar el PDF desde S3 y devolver como Buffer
  const response = await fetch(pdfUrl);
  if (!response.ok)
    throw new Error(
      `Error al descargar el PDF generado: ${response.statusText}`
    );
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
