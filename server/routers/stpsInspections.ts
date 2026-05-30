import { z } from "zod";
import { protectedProcedure, router } from "../_core/trpc";
import { getDb } from "../db";
import {
  stpsInspections,
  stpsInspectionItems,
} from "../../drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { storagePut } from "../storage";
import { generatePDFFromHTML } from "../_core/pdfGenerator";

// ─── Checklist NOM-035 (35 numerales) ─────────────────────────────────────────
const NOM035_CHECKLIST: Array<{ numeral: string; requirement: string; category: string }> = [
  // Capítulo 5 — Identificación y análisis de los factores de riesgo psicosocial
  { numeral: "5.1", requirement: "Identificar y analizar los factores de riesgo psicosocial", category: "Identificación de Riesgos" },
  { numeral: "5.2", requirement: "Evaluar el entorno organizacional", category: "Identificación de Riesgos" },
  { numeral: "5.3", requirement: "Utilizar los instrumentos de evaluación de la Guía de Referencia I o II según el tamaño del centro de trabajo", category: "Identificación de Riesgos" },
  { numeral: "5.4", requirement: "Identificar a los trabajadores expuestos a violencia laboral y a factores de riesgo psicosocial severos", category: "Identificación de Riesgos" },
  // Capítulo 6 — Medidas y acciones de control
  { numeral: "6.1", requirement: "Establecer acciones y programas para la prevención de los factores de riesgo psicosocial", category: "Medidas de Control" },
  { numeral: "6.2", requirement: "Adoptar medidas para prevenir y controlar los factores de riesgo psicosocial", category: "Medidas de Control" },
  { numeral: "6.3", requirement: "Difundir y proporcionar información a los trabajadores sobre los factores de riesgo psicosocial", category: "Medidas de Control" },
  { numeral: "6.4", requirement: "Establecer medidas para prevenir la violencia laboral", category: "Medidas de Control" },
  { numeral: "6.5", requirement: "Promover el entorno organizacional favorable", category: "Medidas de Control" },
  // Capítulo 7 — Prevención de violencia laboral
  { numeral: "7.1", requirement: "Contar con política de prevención de violencia laboral", category: "Violencia Laboral" },
  { numeral: "7.2", requirement: "Difundir la política de prevención de violencia laboral", category: "Violencia Laboral" },
  { numeral: "7.3", requirement: "Establecer mecanismos para denunciar actos de violencia laboral", category: "Violencia Laboral" },
  { numeral: "7.4", requirement: "Investigar los actos de violencia laboral que se reporten", category: "Violencia Laboral" },
  { numeral: "7.5", requirement: "Adoptar medidas disciplinarias para los casos de violencia laboral", category: "Violencia Laboral" },
  // Capítulo 8 — Información y capacitación
  { numeral: "8.1", requirement: "Informar a los trabajadores sobre los factores de riesgo psicosocial y sus efectos en la salud", category: "Capacitación" },
  { numeral: "8.2", requirement: "Proporcionar capacitación para la prevención de factores de riesgo psicosocial", category: "Capacitación" },
  { numeral: "8.3", requirement: "Capacitar a los jefes inmediatos sobre el entorno organizacional favorable", category: "Capacitación" },
  { numeral: "8.4", requirement: "Capacitar a los trabajadores sobre la política de prevención de violencia laboral", category: "Capacitación" },
  // Capítulo 9 — Atención de trabajadores
  { numeral: "9.1", requirement: "Proporcionar atención a los trabajadores que padezcan trastornos mentales o alteraciones en la salud por factores de riesgo psicosocial", category: "Atención a Trabajadores" },
  { numeral: "9.2", requirement: "Canalizar a los trabajadores con el médico de la empresa o institución de seguridad social", category: "Atención a Trabajadores" },
  // Capítulo 10 — Registro de resultados
  { numeral: "10.1", requirement: "Llevar registro de los resultados de la identificación y análisis de factores de riesgo psicosocial", category: "Registros" },
  { numeral: "10.2", requirement: "Conservar los registros durante al menos 2 años", category: "Registros" },
  { numeral: "10.3", requirement: "Registrar las medidas adoptadas para prevenir y controlar los factores de riesgo psicosocial", category: "Registros" },
  // Obligaciones del patrón
  { numeral: "P.1", requirement: "Contar con política de prevención de riesgos psicosociales (centros de trabajo de más de 50 trabajadores)", category: "Obligaciones del Patrón" },
  { numeral: "P.2", requirement: "Identificar y analizar los factores de riesgo psicosocial de forma anual", category: "Obligaciones del Patrón" },
  { numeral: "P.3", requirement: "Evaluar el entorno organizacional de forma anual", category: "Obligaciones del Patrón" },
  { numeral: "P.4", requirement: "Adoptar las medidas para prevenir y controlar los factores de riesgo psicosocial", category: "Obligaciones del Patrón" },
  { numeral: "P.5", requirement: "Llevar los registros sobre los resultados de la evaluación", category: "Obligaciones del Patrón" },
  // Obligaciones de los trabajadores
  { numeral: "T.1", requirement: "Participar en la identificación y análisis de factores de riesgo psicosocial", category: "Obligaciones del Trabajador" },
  { numeral: "T.2", requirement: "Abstenerse de realizar prácticas de violencia laboral", category: "Obligaciones del Trabajador" },
  { numeral: "T.3", requirement: "Reportar actos de violencia laboral al patrón o a las autoridades", category: "Obligaciones del Trabajador" },
  // Comité de Seguridad e Higiene
  { numeral: "CSH.1", requirement: "Participación del Comité de Seguridad e Higiene en la identificación de factores de riesgo psicosocial", category: "Comité de Seguridad" },
  { numeral: "CSH.2", requirement: "El Comité verifica el cumplimiento de las medidas de control adoptadas", category: "Comité de Seguridad" },
  // Documentación
  { numeral: "DOC.1", requirement: "Contar con el programa de prevención de factores de riesgo psicosocial documentado", category: "Documentación" },
  { numeral: "DOC.2", requirement: "Contar con evidencia de las actividades de información y capacitación realizadas", category: "Documentación" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function generateInspectionFolio(type: string, id: number): string {
  const year = new Date().getFullYear();
  const typeCode = type === "ordinaria" ? "ORD" : type === "extraordinaria" ? "EXT" : "SEG";
  return `INSP-${typeCode}-${String(id).padStart(3, "0")}/${year}`;
}

function statusLabel(s: string): string {
  const map: Record<string, string> = {
    cumple: "✅ Cumple",
    no_cumple: "❌ No Cumple",
    parcial: "⚠️ Parcial",
    na: "N/A",
  };
  return map[s] ?? s;
}

function statusColor(s: string): string {
  const map: Record<string, string> = {
    cumple: "#16a34a",
    no_cumple: "#dc2626",
    parcial: "#d97706",
    na: "#6b7280",
  };
  return map[s] ?? "#6b7280";
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const stpsInspectionsRouter = router({
  // Lista todas las visitas de inspección
  listInspections: protectedProcedure
    .input(z.object({ status: z.string().optional() }).optional())
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const rows = await db
        .select()
        .from(stpsInspections)
        .orderBy(desc(stpsInspections.createdAt));
      if (input?.status) {
        return rows.filter((r) => r.status === input.status);
      }
      return rows;
    }),

  // Crear nueva visita de inspección (genera checklist automáticamente)
  createInspection: protectedProcedure
    .input(
      z.object({
        inspectionDate: z.string(),
        inspectorName: z.string().min(2),
        inspectorId: z.string().optional(),
        inspectionType: z.enum(["ordinaria", "extraordinaria", "seguimiento"]).default("ordinaria"),
        responsibleName: z.string().optional(),
        observations: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      // Contar inspecciones del mismo tipo en el año actual para el folio
      const year = new Date().getFullYear();
      const [countRow] = await db
        .select({ count: sql<number>`count(*)` })
        .from(stpsInspections)
        .where(
          and(
            eq(stpsInspections.inspectionType, input.inspectionType),
            sql`YEAR(created_at) = ${year}`
          )
        );
      const seq = (Number(countRow?.count ?? 0) + 1);
      const folio = generateInspectionFolio(input.inspectionType, seq);

      const [result] = await db.insert(stpsInspections).values({
        folio,
        inspectionDate: new Date(input.inspectionDate),
        inspectorName: input.inspectorName,
        inspectorId: input.inspectorId,
        inspectionType: input.inspectionType,
        responsibleName: input.responsibleName,
        observations: input.observations,
        createdBy: ctx.user.id,
        status: "programada",
      });
      const inspectionId = result.insertId;

      // Crear los ítems del checklist automáticamente
      const items = NOM035_CHECKLIST.map((item) => ({
        inspectionId,
        numeral: item.numeral,
        requirement: item.requirement,
        category: item.category,
        status: "na" as const,
      }));
      await db.insert(stpsInspectionItems).values(items);

      return { id: inspectionId, folio };
    }),

  // Obtener detalle de una inspección con su checklist
  getInspectionDetail: protectedProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [inspection] = await db
        .select()
        .from(stpsInspections)
        .where(eq(stpsInspections.id, input.id));
      if (!inspection) throw new Error("Inspección no encontrada");

      const items = await db
        .select()
        .from(stpsInspectionItems)
        .where(eq(stpsInspectionItems.inspectionId, input.id))
        .orderBy(stpsInspectionItems.numeral);

      // Agrupar por categoría
      const byCategory: Record<string, typeof items> = {};
      for (const item of items) {
        if (!byCategory[item.category]) byCategory[item.category] = [];
        byCategory[item.category].push(item);
      }

      // Estadísticas
      const total = items.length;
      const cumple = items.filter((i) => i.status === "cumple").length;
      const noCumple = items.filter((i) => i.status === "no_cumple").length;
      const parcial = items.filter((i) => i.status === "parcial").length;
      const na = items.filter((i) => i.status === "na").length;
      const evaluated = total - na;
      const complianceRate = evaluated > 0 ? Math.round((cumple / evaluated) * 100) : 0;

      return { inspection, items, byCategory, stats: { total, cumple, noCumple, parcial, na, evaluated, complianceRate } };
    }),

  // Actualizar el estado de un ítem del checklist
  updateChecklistItem: protectedProcedure
    .input(
      z.object({
        itemId: z.number(),
        status: z.enum(["cumple", "no_cumple", "parcial", "na"]),
        observations: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db
        .update(stpsInspectionItems)
        .set({ status: input.status, observations: input.observations })
        .where(eq(stpsInspectionItems.id, input.itemId));
      return { ok: true };
    }),

  // Actualizar estado general de la inspección
  updateInspectionStatus: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        status: z.enum(["programada", "en_proceso", "concluida", "con_observaciones"]),
        observations: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      await db
        .update(stpsInspections)
        .set({ status: input.status, observations: input.observations })
        .where(eq(stpsInspections.id, input.id));
      return { ok: true };
    }),

  // Generar expediente de respuesta PDF
  generateExpedientPdf: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");
      const [inspection] = await db
        .select()
        .from(stpsInspections)
        .where(eq(stpsInspections.id, input.id));
      if (!inspection) throw new Error("Inspección no encontrada");

      const items = await db
        .select()
        .from(stpsInspectionItems)
        .where(eq(stpsInspectionItems.inspectionId, input.id))
        .orderBy(stpsInspectionItems.numeral);

      const total = items.length;
      const cumple = items.filter((i) => i.status === "cumple").length;
      const noCumple = items.filter((i) => i.status === "no_cumple").length;
      const parcial = items.filter((i) => i.status === "parcial").length;
      const na = items.filter((i) => i.status === "na").length;
      const evaluated = total - na;
      const rate = evaluated > 0 ? Math.round((cumple / evaluated) * 100) : 0;
      const rateColor = rate >= 80 ? "#16a34a" : rate >= 50 ? "#d97706" : "#dc2626";

      // Agrupar por categoría
      const byCategory: Record<string, typeof items> = {};
      for (const item of items) {
        if (!byCategory[item.category]) byCategory[item.category] = [];
        byCategory[item.category].push(item);
      }

      const categorySections = Object.entries(byCategory).map(([cat, catItems]) => `
        <div class="category-section">
          <h3 class="category-title">${cat}</h3>
          <table class="checklist-table">
            <thead>
              <tr>
                <th style="width:80px">Numeral</th>
                <th>Requisito</th>
                <th style="width:110px">Estado</th>
                <th style="width:200px">Observaciones</th>
              </tr>
            </thead>
            <tbody>
              ${catItems.map((item) => `
                <tr>
                  <td class="numeral">${item.numeral}</td>
                  <td>${item.requirement}</td>
                  <td style="color:${statusColor(item.status)};font-weight:600;text-align:center">${statusLabel(item.status)}</td>
                  <td class="obs">${item.observations ?? ""}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      `).join("");

      const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<style>
  body { font-family: Arial, sans-serif; font-size: 11px; color: #1f2937; margin: 0; padding: 20px; }
  .header { background: #1e3a5f; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
  .header h1 { margin: 0 0 4px; font-size: 18px; }
  .header p { margin: 2px 0; font-size: 11px; opacity: 0.85; }
  .folio { font-size: 13px; font-weight: 700; color: #93c5fd; margin-top: 8px; }
  .meta-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 20px; }
  .meta-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px; }
  .meta-card .label { font-size: 9px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
  .meta-card .value { font-size: 13px; font-weight: 700; color: #1e3a5f; margin-top: 2px; }
  .stats-row { display: flex; gap: 10px; margin-bottom: 20px; }
  .stat-box { flex: 1; text-align: center; padding: 10px; border-radius: 6px; }
  .stat-box .num { font-size: 22px; font-weight: 800; }
  .stat-box .lbl { font-size: 9px; text-transform: uppercase; }
  .compliance-bar { background: #e5e7eb; border-radius: 4px; height: 14px; margin-bottom: 20px; }
  .compliance-fill { height: 14px; border-radius: 4px; background: ${rateColor}; width: ${rate}%; }
  .compliance-label { text-align: center; font-size: 11px; color: ${rateColor}; font-weight: 700; margin-bottom: 20px; }
  .category-section { margin-bottom: 16px; page-break-inside: avoid; }
  .category-title { background: #1e3a5f; color: white; padding: 6px 10px; font-size: 11px; margin: 0 0 0; border-radius: 4px 4px 0 0; }
  .checklist-table { width: 100%; border-collapse: collapse; }
  .checklist-table th { background: #f1f5f9; padding: 5px 8px; text-align: left; font-size: 9px; text-transform: uppercase; border: 1px solid #e2e8f0; }
  .checklist-table td { padding: 5px 8px; border: 1px solid #e2e8f0; vertical-align: top; }
  .checklist-table tr:nth-child(even) td { background: #f9fafb; }
  .numeral { font-weight: 700; color: #1e3a5f; }
  .obs { color: #6b7280; font-style: italic; }
  .signature-section { margin-top: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px; }
  .sig-box { border-top: 2px solid #1e3a5f; padding-top: 8px; text-align: center; }
  .sig-label { font-size: 10px; color: #374151; }
  .footer { margin-top: 20px; text-align: center; font-size: 9px; color: #9ca3af; border-top: 1px solid #e5e7eb; padding-top: 8px; }
</style>
</head>
<body>
  <div class="header">
    <h1>Expediente de Respuesta a Visita de Verificación STPS</h1>
    <p>NOM-035-STPS-2018 — Factores de Riesgo Psicosocial en el Trabajo</p>
    <div class="folio">Folio: ${inspection.folio}</div>
  </div>

  <div class="meta-grid">
    <div class="meta-card">
      <div class="label">Fecha de Visita</div>
      <div class="value">${new Date(inspection.inspectionDate).toLocaleDateString("es-MX", { day: "2-digit", month: "long", year: "numeric" })}</div>
    </div>
    <div class="meta-card">
      <div class="label">Inspector STPS</div>
      <div class="value">${inspection.inspectorName}</div>
    </div>
    <div class="meta-card">
      <div class="label">Tipo de Visita</div>
      <div class="value">${inspection.inspectionType.charAt(0).toUpperCase() + inspection.inspectionType.slice(1)}</div>
    </div>
    <div class="meta-card">
      <div class="label">Responsable</div>
      <div class="value">${inspection.responsibleName ?? "—"}</div>
    </div>
    <div class="meta-card">
      <div class="label">Estado</div>
      <div class="value">${inspection.status.replace("_", " ").toUpperCase()}</div>
    </div>
    <div class="meta-card">
      <div class="label">Generado</div>
      <div class="value">${new Date().toLocaleDateString("es-MX")}</div>
    </div>
  </div>

  <div class="stats-row">
    <div class="stat-box" style="background:#dcfce7;color:#16a34a">
      <div class="num">${cumple}</div><div class="lbl">Cumple</div>
    </div>
    <div class="stat-box" style="background:#fee2e2;color:#dc2626">
      <div class="num">${noCumple}</div><div class="lbl">No Cumple</div>
    </div>
    <div class="stat-box" style="background:#fef3c7;color:#d97706">
      <div class="num">${parcial}</div><div class="lbl">Parcial</div>
    </div>
    <div class="stat-box" style="background:#f3f4f6;color:#6b7280">
      <div class="num">${na}</div><div class="lbl">N/A</div>
    </div>
    <div class="stat-box" style="background:#eff6ff;color:${rateColor}">
      <div class="num">${rate}%</div><div class="lbl">Cumplimiento</div>
    </div>
  </div>

  <div class="compliance-bar"><div class="compliance-fill"></div></div>
  <div class="compliance-label">${rate >= 80 ? "✅ Nivel de Cumplimiento Óptimo" : rate >= 50 ? "⚠️ Nivel de Cumplimiento en Riesgo" : "❌ Nivel de Cumplimiento Crítico"}</div>

  ${categorySections}

  ${inspection.observations ? `<div style="background:#fef9c3;border:1px solid #fde047;border-radius:6px;padding:12px;margin-top:16px"><strong>Observaciones Generales:</strong><br>${inspection.observations}</div>` : ""}

  <div class="signature-section">
    <div class="sig-box">
      <div style="height:50px"></div>
      <div class="sig-label">Responsable NOM-035<br>${inspection.responsibleName ?? "________________________"}</div>
    </div>
    <div class="sig-box">
      <div style="height:50px"></div>
      <div class="sig-label">Inspector STPS<br>${inspection.inspectorName}</div>
    </div>
  </div>

  <div class="footer">
    Expediente generado el ${new Date().toLocaleString("es-MX")} — ${inspection.folio} — NOM-035-STPS-2018
  </div>
</body>
</html>`;

      const pdfBuffer = await generatePDFFromHTML(html, `expediente-${inspection.folio}.pdf`);
      const key = `stps-expedients/${inspection.folio}-${Date.now()}.pdf`;
      const { url } = await storagePut(key, pdfBuffer, "application/pdf");

      // Guardar URL en la inspección
      const db2 = await getDb();
      if (!db2) throw new Error("Database not available");
      await db2.update(stpsInspections).set({ expedientUrl: url, expedientKey: key }).where(eq(stpsInspections.id, input.id));

      return { url, folio: inspection.folio };
    }),

  // Obtener estadísticas globales de inspecciones
  getInspectionStats: protectedProcedure.query(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");
    const all = await db.select().from(stpsInspections);
    const total = all.length;
    const programadas = all.filter((i) => i.status === "programada").length;
    const enProceso = all.filter((i) => i.status === "en_proceso").length;
    const concluidas = all.filter((i) => i.status === "concluida").length;
    const conObservaciones = all.filter((i) => i.status === "con_observaciones").length;
    return { total, programadas, enProceso, concluidas, conObservaciones };
  }),
});
