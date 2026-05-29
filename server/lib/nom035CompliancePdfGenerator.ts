/**
 * nom035CompliancePdfGenerator.ts
 *
 * Genera el reporte ejecutivo PDF del Dashboard de Cumplimiento NOM-035.
 * Usa Puppeteer (HTML → PDF) para producir un documento A4 con:
 *   - Portada con membrete institucional, folio y período
 *   - Sección de KPIs globales con semáforo visual
 *   - Tabla de planes con porcentaje de avance y semáforo por plan
 *   - Alertas: acciones próximas a vencer (14 días) y vencidas
 *   - Distribución por tipo de plan, nivel y prioridad
 *   - Pie de página con fecha de generación
 */

export interface CompliancePdfData {
  kpis: {
    total: number;
    cumplidas: number;
    vencidas: number;
    noIniciadas: number;
    enProceso: number;
    canceladas: number;
    conEvidencia: number;
    altaPrioridad: number;
    altaVencida: number;
    porcentajeCumplimiento: number;
    semaforoGlobal: "verde" | "amarillo" | "rojo";
  };
  byTipoPlan: Array<{
    tipoPlan: string;
    total: number;
    cumplidas: number;
    vencidas: number;
    enProceso: number;
    noIniciadas: number;
    porcentaje: number;
  }>;
  byNivel: Array<{
    nivelAplicacion: string;
    total: number;
    cumplidas: number;
    vencidas: number;
    porcentaje: number;
  }>;
  byPrioridad: Array<{
    prioridad: string;
    total: number;
    cumplidas: number;
    vencidas: number;
    porcentaje: number;
  }>;
  planes: Array<{
    id: number;
    identificadorNivel: string;
    tipoPlan: string;
    nivelAplicacion: string;
    status: string;
    centroTrabajo: string | null;
    totalAcciones: number;
    cumplidas: number;
    vencidas: number;
    enProceso: number;
    noIniciadas: number;
    porcentajeCumplimiento: number;
    semaforo: "verde" | "amarillo" | "rojo";
  }>;
  proximasAVencer: Array<{
    accionId: string;
    objetivo: string;
    responsable: string | null;
    plazo: string | null;
    prioridad: string;
    tipoPlan: string;
  }>;
  accionesVencidas: Array<{
    accionId: string;
    objetivo: string;
    responsable: string | null;
    plazo: string | null;
    prioridad: string;
    tipoPlan: string;
  }>;
  tendenciaMeses: Array<{ mes: string; cumplidas: number; vencidas: number; total: number }>;
  periodoMeses?: number;
}

const TIPO_PLAN_LABEL: Record<string, string> = {
  intervencion: "Intervención",
  violencia_laboral: "Violencia Laboral",
  no_discriminacion: "No Discriminación",
  consolidado: "Consolidado",
};

const NIVEL_LABEL: Record<string, string> = {
  organizacional: "Organizacional",
  grupal: "Grupal",
  individual: "Individual",
};

const PRIORIDAD_LABEL: Record<string, string> = {
  alta: "Alta",
  media: "Media",
  baja: "Baja",
};

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-MX", { year: "numeric", month: "short", day: "numeric" });
}

function semaforoCircle(s: "verde" | "amarillo" | "rojo"): string {
  const colors = { verde: "#16a34a", amarillo: "#d97706", rojo: "#dc2626" };
  return `<span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${colors[s]};margin-right:6px;vertical-align:middle;"></span>`;
}

function progressBar(pct: number, semaforo: "verde" | "amarillo" | "rojo"): string {
  const colors = { verde: "#16a34a", amarillo: "#d97706", rojo: "#dc2626" };
  return `
    <div style="background:#e5e7eb;border-radius:4px;height:8px;width:100%;">
      <div style="background:${colors[semaforo]};border-radius:4px;height:8px;width:${pct}%;"></div>
    </div>`;
}

export async function generateNom035CompliancePdf(data: CompliancePdfData): Promise<Buffer> {
  const generatedAt = new Date().toLocaleString("es-MX", {
    year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
  });
  const folio = `NOM035-DASH-${Date.now()}`;
  const periodoLabel = `Últimos ${data.periodoMeses ?? 12} meses`;

  // ── Semáforo global ──────────────────────────────────────────────────────────
  const semaforoColors = { verde: "#16a34a", amarillo: "#d97706", rojo: "#dc2626" };
  const semaforoLabels = { verde: "Óptimo", amarillo: "En riesgo", rojo: "Crítico" };
  const semaforoColor = semaforoColors[data.kpis.semaforoGlobal];
  const semaforoLabel = semaforoLabels[data.kpis.semaforoGlobal];

  // ── Tabla de planes ──────────────────────────────────────────────────────────
  const planesRows = data.planes.map(p => `
    <tr>
      <td>${p.identificadorNivel}</td>
      <td>${TIPO_PLAN_LABEL[p.tipoPlan] ?? p.tipoPlan}</td>
      <td>${NIVEL_LABEL[p.nivelAplicacion] ?? p.nivelAplicacion}</td>
      <td>${p.centroTrabajo ?? "—"}</td>
      <td class="center">${p.totalAcciones}</td>
      <td class="center green">${p.cumplidas}</td>
      <td class="center red">${p.vencidas}</td>
      <td>
        <div style="display:flex;align-items:center;gap:8px;">
          ${semaforoCircle(p.semaforo)}
          <div style="flex:1;">${progressBar(p.porcentajeCumplimiento, p.semaforo)}</div>
          <span style="font-weight:600;color:${semaforoColors[p.semaforo]};min-width:36px;">${p.porcentajeCumplimiento}%</span>
        </div>
      </td>
    </tr>`).join("");

  // ── Tabla de próximas a vencer ───────────────────────────────────────────────
  const proximasRows = data.proximasAVencer.length > 0
    ? data.proximasAVencer.map(a => `
      <tr>
        <td class="mono">${a.accionId}</td>
        <td>${a.objetivo.slice(0, 70)}${a.objetivo.length > 70 ? "..." : ""}</td>
        <td>${a.responsable ?? "—"}</td>
        <td>${TIPO_PLAN_LABEL[a.tipoPlan] ?? a.tipoPlan}</td>
        <td class="center" style="color:#d97706;font-weight:600;">${fmtDate(a.plazo)}</td>
        <td class="center"><span class="badge badge-media">${PRIORIDAD_LABEL[a.prioridad] ?? a.prioridad}</span></td>
      </tr>`).join("")
    : `<tr><td colspan="6" class="center muted">Sin acciones próximas a vencer en los próximos 14 días</td></tr>`;

  // ── Tabla de acciones vencidas ───────────────────────────────────────────────
  const vencidasRows = data.accionesVencidas.length > 0
    ? data.accionesVencidas.map(a => `
      <tr>
        <td class="mono">${a.accionId}</td>
        <td>${a.objetivo.slice(0, 70)}${a.objetivo.length > 70 ? "..." : ""}</td>
        <td>${a.responsable ?? "—"}</td>
        <td>${TIPO_PLAN_LABEL[a.tipoPlan] ?? a.tipoPlan}</td>
        <td class="center" style="color:#dc2626;font-weight:600;">${fmtDate(a.plazo)}</td>
        <td class="center"><span class="badge badge-alta">${PRIORIDAD_LABEL[a.prioridad] ?? a.prioridad}</span></td>
      </tr>`).join("")
    : `<tr><td colspan="6" class="center muted">Sin acciones vencidas registradas</td></tr>`;

  // ── Tabla de distribución por tipo de plan ───────────────────────────────────
  const tipoPlanRows = data.byTipoPlan.map(r => `
    <tr>
      <td>${TIPO_PLAN_LABEL[r.tipoPlan] ?? r.tipoPlan}</td>
      <td class="center">${r.total}</td>
      <td class="center green">${r.cumplidas}</td>
      <td class="center red">${r.vencidas}</td>
      <td class="center">${r.enProceso}</td>
      <td class="center">${r.noIniciadas}</td>
      <td class="center" style="font-weight:600;">${r.porcentaje}%</td>
    </tr>`).join("");

  // ── Tabla de distribución por nivel ─────────────────────────────────────────
  const nivelRows = data.byNivel.map(r => `
    <tr>
      <td>${NIVEL_LABEL[r.nivelAplicacion] ?? r.nivelAplicacion}</td>
      <td class="center">${r.total}</td>
      <td class="center green">${r.cumplidas}</td>
      <td class="center red">${r.vencidas}</td>
      <td class="center" style="font-weight:600;">${r.porcentaje}%</td>
    </tr>`).join("");

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reporte de Cumplimiento NOM-035</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Inter', Arial, sans-serif; font-size: 11px; color: #1f2937; background: #fff; }
    .page { padding: 20mm 18mm; }

    /* ── Header ── */
    .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 3px solid #1d4ed8; padding-bottom: 12px; margin-bottom: 20px; }
    .header-left h1 { font-size: 18px; font-weight: 700; color: #1d4ed8; }
    .header-left p { font-size: 11px; color: #6b7280; margin-top: 2px; }
    .header-right { text-align: right; font-size: 10px; color: #6b7280; }
    .folio { font-weight: 600; color: #374151; font-size: 11px; }

    /* ── Semáforo global ── */
    .semaforo-global { display: flex; align-items: center; justify-content: center; gap: 24px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 20px; }
    .semaforo-circle { width: 80px; height: 80px; border-radius: 50%; display: flex; align-items: center; justify-content: center; flex-direction: column; color: white; font-weight: 700; }
    .semaforo-circle .pct { font-size: 22px; }
    .semaforo-circle .lbl { font-size: 9px; margin-top: 2px; }
    .kpi-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 10px; flex: 1; }
    .kpi-card { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; text-align: center; }
    .kpi-card .val { font-size: 20px; font-weight: 700; }
    .kpi-card .lbl { font-size: 9px; color: #6b7280; margin-top: 2px; }

    /* ── Secciones ── */
    .section { margin-bottom: 20px; }
    .section-title { font-size: 13px; font-weight: 700; color: #111827; border-left: 4px solid #1d4ed8; padding-left: 10px; margin-bottom: 10px; }
    .alert-title { border-left-color: #d97706; }
    .danger-title { border-left-color: #dc2626; }

    /* ── Tablas ── */
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th { background: #f3f4f6; color: #374151; font-weight: 600; padding: 6px 8px; text-align: left; border-bottom: 2px solid #e5e7eb; font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; }
    td { padding: 6px 8px; border-bottom: 1px solid #f3f4f6; vertical-align: middle; }
    tr:last-child td { border-bottom: none; }
    .center { text-align: center; }
    .mono { font-family: monospace; font-size: 10px; }
    .green { color: #16a34a; }
    .red { color: #dc2626; }
    .muted { color: #9ca3af; font-style: italic; }

    /* ── Badges ── */
    .badge { padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 600; }
    .badge-alta { background: #fee2e2; color: #dc2626; }
    .badge-media { background: #fef3c7; color: #d97706; }
    .badge-baja { background: #dcfce7; color: #16a34a; }

    /* ── Distribución ── */
    .dist-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

    /* ── Firma ── */
    .firma-section { margin-top: 30px; border-top: 1px solid #e5e7eb; padding-top: 20px; }
    .firma-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
    .firma-box { text-align: center; }
    .firma-line { border-top: 1px solid #374151; margin: 40px 20px 6px; }
    .firma-label { font-size: 10px; color: #374151; font-weight: 600; }
    .firma-sublabel { font-size: 9px; color: #6b7280; margin-top: 2px; }

    /* ── Footer ── */
    .footer { margin-top: 20px; border-top: 1px solid #e5e7eb; padding-top: 10px; display: flex; justify-content: space-between; font-size: 9px; color: #9ca3af; }

    /* ── Tendencia ── */
    .tendencia-table { font-size: 10px; }
    .bar-cell { min-width: 120px; }
    .mini-bar-wrap { background: #e5e7eb; border-radius: 3px; height: 6px; }
    .mini-bar { border-radius: 3px; height: 6px; }
  </style>
</head>
<body>
<div class="page">

  <!-- ── ENCABEZADO ── -->
  <div class="header">
    <div class="header-left">
      <h1>Reporte de Cumplimiento NOM-035 STPS 2018</h1>
      <p>Matriz de Acciones y Planes de Intervención · ${periodoLabel}</p>
    </div>
    <div class="header-right">
      <div class="folio">Folio: ${folio}</div>
      <div>Generado: ${generatedAt}</div>
    </div>
  </div>

  <!-- ── SEMÁFORO GLOBAL + KPIs ── -->
  <div class="semaforo-global">
    <div class="semaforo-circle" style="background:${semaforoColor};">
      <span class="pct">${data.kpis.porcentajeCumplimiento}%</span>
      <span class="lbl">${semaforoLabel}</span>
    </div>
    <div class="kpi-grid">
      <div class="kpi-card">
        <div class="val">${data.kpis.total}</div>
        <div class="lbl">Total acciones</div>
      </div>
      <div class="kpi-card">
        <div class="val green">${data.kpis.cumplidas}</div>
        <div class="lbl">Cumplidas</div>
      </div>
      <div class="kpi-card">
        <div class="val" style="color:#3b82f6;">${data.kpis.enProceso}</div>
        <div class="lbl">En proceso</div>
      </div>
      <div class="kpi-card">
        <div class="val red">${data.kpis.vencidas}</div>
        <div class="lbl">Vencidas</div>
      </div>
      <div class="kpi-card">
        <div class="val" style="color:#059669;">${data.kpis.conEvidencia}</div>
        <div class="lbl">Con evidencia</div>
      </div>
    </div>
  </div>

  <!-- ── TABLA DE PLANES ── -->
  <div class="section">
    <div class="section-title">Planes de Intervención — Avance por Plan</div>
    <table>
      <thead>
        <tr>
          <th>Identificador</th>
          <th>Tipo de Plan</th>
          <th>Nivel</th>
          <th>Centro de Trabajo</th>
          <th class="center">Total</th>
          <th class="center">Cumplidas</th>
          <th class="center">Vencidas</th>
          <th>Avance</th>
        </tr>
      </thead>
      <tbody>
        ${planesRows || `<tr><td colspan="8" class="center muted">Sin planes registrados</td></tr>`}
      </tbody>
    </table>
  </div>

  <!-- ── ALERTAS: PRÓXIMAS A VENCER ── -->
  <div class="section">
    <div class="section-title alert-title">⚠ Acciones Próximas a Vencer (próximos 14 días)</div>
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Objetivo</th>
          <th>Responsable</th>
          <th>Tipo Plan</th>
          <th class="center">Fecha Límite</th>
          <th class="center">Prioridad</th>
        </tr>
      </thead>
      <tbody>${proximasRows}</tbody>
    </table>
  </div>

  <!-- ── ALERTAS: VENCIDAS ── -->
  <div class="section">
    <div class="section-title danger-title">🔴 Acciones Vencidas</div>
    <table>
      <thead>
        <tr>
          <th>ID</th>
          <th>Objetivo</th>
          <th>Responsable</th>
          <th>Tipo Plan</th>
          <th class="center">Fecha Límite</th>
          <th class="center">Prioridad</th>
        </tr>
      </thead>
      <tbody>${vencidasRows}</tbody>
    </table>
  </div>

  <!-- ── DISTRIBUCIÓN POR TIPO Y NIVEL ── -->
  <div class="dist-grid">
    <div class="section">
      <div class="section-title">Distribución por Tipo de Plan</div>
      <table>
        <thead>
          <tr>
            <th>Tipo</th>
            <th class="center">Total</th>
            <th class="center">Cumpl.</th>
            <th class="center">Venc.</th>
            <th class="center">Proc.</th>
            <th class="center">No ini.</th>
            <th class="center">%</th>
          </tr>
        </thead>
        <tbody>
          ${tipoPlanRows || `<tr><td colspan="7" class="center muted">Sin datos</td></tr>`}
        </tbody>
      </table>
    </div>
    <div class="section">
      <div class="section-title">Distribución por Nivel de Aplicación</div>
      <table>
        <thead>
          <tr>
            <th>Nivel</th>
            <th class="center">Total</th>
            <th class="center">Cumpl.</th>
            <th class="center">Venc.</th>
            <th class="center">%</th>
          </tr>
        </thead>
        <tbody>
          ${nivelRows || `<tr><td colspan="5" class="center muted">Sin datos</td></tr>`}
        </tbody>
      </table>
    </div>
  </div>

  <!-- ── TENDENCIA MENSUAL ── -->
  ${data.tendenciaMeses.length > 0 ? `
  <div class="section">
    <div class="section-title">Tendencia Mensual de Cumplimiento</div>
    <table class="tendencia-table">
      <thead>
        <tr>
          <th>Mes</th>
          <th class="center">Total</th>
          <th class="center">Cumplidas</th>
          <th class="center">Vencidas</th>
          <th class="center">% Cumplimiento</th>
          <th class="bar-cell">Avance</th>
        </tr>
      </thead>
      <tbody>
        ${data.tendenciaMeses.map(m => {
          const pct = m.total > 0 ? Math.round((m.cumplidas / m.total) * 100) : 0;
          const color = pct >= 80 ? "#16a34a" : pct >= 50 ? "#d97706" : "#dc2626";
          return `
          <tr>
            <td>${m.mes}</td>
            <td class="center">${m.total}</td>
            <td class="center green">${m.cumplidas}</td>
            <td class="center red">${m.vencidas}</td>
            <td class="center" style="font-weight:600;color:${color};">${pct}%</td>
            <td class="bar-cell">
              <div class="mini-bar-wrap">
                <div class="mini-bar" style="width:${pct}%;background:${color};"></div>
              </div>
            </td>
          </tr>`;
        }).join("")}
      </tbody>
    </table>
  </div>` : ""}

  <!-- ── CAMPOS DE FIRMA ── -->
  <div class="firma-section">
    <div class="firma-grid">
      <div class="firma-box">
        <div class="firma-line"></div>
        <div class="firma-label">Responsable NOM-035</div>
        <div class="firma-sublabel">Nombre y firma</div>
      </div>
      <div class="firma-box">
        <div class="firma-line"></div>
        <div class="firma-label">Representante de la Dirección</div>
        <div class="firma-sublabel">Nombre y firma</div>
      </div>
    </div>
  </div>

  <!-- ── PIE DE PÁGINA ── -->
  <div class="footer">
    <span>NOM-035-STPS-2018 · Factores de Riesgo Psicosocial en el Trabajo</span>
    <span>Folio: ${folio} · ${generatedAt}</span>
  </div>

</div>
</body>
</html>`;

  const { generatePDFFromHTML } = await import("../_core/pdfGenerator");
  const pdfUrl = await generatePDFFromHTML(html, `nom035-compliance-${Date.now()}`, {
    format: "A4",
    orientation: "portrait",
    margin: { top: "10mm", right: "10mm", bottom: "10mm", left: "10mm" },
  });

  const response = await fetch(pdfUrl);
  if (!response.ok) throw new Error(`Error al descargar el PDF generado: ${response.statusText}`);
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
