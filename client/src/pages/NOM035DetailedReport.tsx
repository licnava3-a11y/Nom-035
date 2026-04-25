import { useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, CheckCircle2, BarChart3, Layers, Grid3X3, Lightbulb, ClipboardList, RefreshCw, FileDown, FileText, Printer } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

// ─── Exportación Excel ──────────────────────────────────────────────────────
function exportToExcel(data: any) {
  if (!data) return;
  const wb = XLSX.utils.book_new();
  const fecha = new Date().toLocaleString("es-MX");

  // Hoja 1: Resumen ejecutivo
  const resumenRows: any[][] = [
    ["REPORTE NOM-035-STPS-2018 — ANÁLISIS EXTENDIDO"],
    ["Generado:", fecha],
    ["Total de respuestas:", data.totalRespuestas ?? 0],
    [],
    ["SECCIÓN", "TOTAL DE ELEMENTOS", "CON RIESGO ALTO/MUY ALTO"],
    ["Categorías", (data.categorias ?? []).length, (data.categorias ?? []).filter((c: any) => c.nivel?.labelClass === "alto" || c.nivel?.labelClass === "muy_alto").length],
    ["Dominios", (data.dominios ?? []).length, (data.dominios ?? []).filter((d: any) => d.nivel?.labelClass === "alto" || d.nivel?.labelClass === "muy_alto").length],
    ["Dimensiones", (data.dimensiones ?? []).length, (data.dimensiones ?? []).filter((d: any) => d.nivel?.labelClass === "alto" || d.nivel?.labelClass === "muy_alto").length],
  ];
  const wsRes = XLSX.utils.aoa_to_sheet(resumenRows);
  wsRes["!cols"] = [{ wch: 40 }, { wch: 22 }, { wch: 25 }];
  XLSX.utils.book_append_sheet(wb, wsRes, "Resumen Ejecutivo");

  // Hoja 2: Categorías
  const catRows: any[][] = [
    ["CATEGORÍA", "PUNTAJE (%)", "NIVEL DE RIESGO"],
  ];
  (data.categorias ?? []).forEach((c: any) => {
    catRows.push([c.nombre, c.puntaje, c.nivel?.nivel?.toUpperCase() ?? "—"]);
  });
  const wsCat = XLSX.utils.aoa_to_sheet(catRows);
  wsCat["!cols"] = [{ wch: 45 }, { wch: 14 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsCat, "Categorías");

  // Hoja 3: Dominios
  const domRows: any[][] = [
    ["DOMINIO", "PUNTAJE (%)", "NIVEL DE RIESGO"],
  ];
  (data.dominios ?? []).forEach((d: any) => {
    domRows.push([d.nombre, d.puntaje, d.nivel?.nivel?.toUpperCase() ?? "—"]);
  });
  const wsDom = XLSX.utils.aoa_to_sheet(domRows);
  wsDom["!cols"] = [{ wch: 45 }, { wch: 14 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsDom, "Dominios");

  // Hoja 4: Dimensiones
  const dimRows: any[][] = [
    ["DIMENSIÓN", "PUNTAJE (%)", "NIVEL DE RIESGO"],
  ];
  (data.dimensiones ?? []).forEach((d: any) => {
    dimRows.push([d.nombre, d.puntaje, d.nivel?.nivel?.toUpperCase() ?? "—"]);
  });
  const wsDim = XLSX.utils.aoa_to_sheet(dimRows);
  wsDim["!cols"] = [{ wch: 45 }, { wch: 14 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsDim, "Dimensiones");

  // Hoja 5: Plan de Trabajo
  const planRows: any[][] = [
    ["PLAN DE TRABAJO NOM-035 — ACCIONES CORRECTIVAS"],
    ["Generado:", fecha],
    [],
    ["ÁREA / DIMENSIÓN", "NIVEL", "ACCIÓN RECOMENDADA", "RESPONSABLE", "FECHA COMPROMISO", "ESTATUS"],
  ];
  const itemsAlto = [
    ...(data.dimensiones ?? []).filter((d: any) => d.nivel?.labelClass === "alto" || d.nivel?.labelClass === "muy_alto"),
    ...(data.dominios ?? []).filter((d: any) => d.nivel?.labelClass === "alto" || d.nivel?.labelClass === "muy_alto"),
  ];
  if (itemsAlto.length === 0) {
    planRows.push(["Sin áreas de riesgo alto o muy alto identificadas", "", "", "", "", ""]);
  } else {
    itemsAlto.forEach((item: any) => {
      planRows.push([item.nombre, item.nivel?.nivel?.toUpperCase() ?? "", "Definir intervención específica", "Por asignar", "", "Pendiente"]);
    });
  }
  const wsPlan = XLSX.utils.aoa_to_sheet(planRows);
  wsPlan["!cols"] = [{ wch: 45 }, { wch: 12 }, { wch: 50 }, { wch: 25 }, { wch: 18 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, wsPlan, "Plan de Trabajo");

  // Hoja 6: Recomendaciones
  if (data.recomendaciones?.length) {
    const recRows: any[][] = [
      ["RECOMENDACIONES NOM-035"],
      [],
      ["ÁREA", "RECOMENDACIÓN"],
    ];
    data.recomendaciones.forEach((r: any) => {
      recRows.push([r.area ?? r.nombre ?? "", r.texto ?? r.recomendacion ?? ""]);
    });
    const wsRec = XLSX.utils.aoa_to_sheet(recRows);
    wsRec["!cols"] = [{ wch: 40 }, { wch: 80 }];
    XLSX.utils.book_append_sheet(wb, wsRec, "Recomendaciones");
  }

  const fechaFile = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  XLSX.writeFile(wb, `NOM035_Reporte_Extendido_${fechaFile}.xlsx`);
}
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList, ReferenceLine,
} from "recharts";

// ─── Colores por nivel ────────────────────────────────────────────────────────
const NIVEL_COLORS: Record<string, string> = {
  nulo:    "bg-green-100 text-green-800 border-green-300",
  bajo:    "bg-cyan-100 text-cyan-800 border-cyan-300",
  medio:   "bg-yellow-100 text-yellow-800 border-yellow-300",
  alto:    "bg-orange-100 text-orange-800 border-orange-300",
  muy_alto:"bg-red-100 text-red-800 border-red-300",
};
const NIVEL_BAR_COLORS: Record<string, string> = {
  nulo:    "bg-green-500",
  bajo:    "bg-cyan-500",
  medio:   "bg-yellow-500",
  alto:    "bg-orange-500",
  muy_alto:"bg-red-600",
};
// Colores hex para Recharts
const NIVEL_HEX: Record<string, string> = {
  nulo:    "#22c55e",
  bajo:    "#06b6d4",
  medio:   "#eab308",
  alto:    "#f97316",
  muy_alto:"#dc2626",
};

// ─── Componentes auxiliares ───────────────────────────────────────────────────
function NivelBadge({ nivel, labelClass }: { nivel: string; labelClass: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${NIVEL_COLORS[labelClass] ?? "bg-gray-100 text-gray-700 border-gray-300"}`}>
      {nivel}
    </span>
  );
}

function ScoreBar({ puntaje, labelClass }: { puntaje: number; labelClass: string }) {
  return (
    <div className="flex items-center gap-2 min-w-[140px]">
      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
        <div className={`h-2 rounded-full ${NIVEL_BAR_COLORS[labelClass] ?? "bg-gray-400"}`} style={{ width: `${Math.min(puntaje, 100)}%` }} />
      </div>
      <span className="text-xs font-mono text-slate-600 w-12 text-right">{puntaje}%</span>
    </div>
  );
}

// ─── Tooltip personalizado para la gráfica ────────────────────────────────────
function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { nombre: string; puntaje: number; nivel: { nivel: string } } }> }) {
  if (!active || !payload?.length) return null;
  const d = payload[0].payload;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-sm max-w-[220px]">
      <p className="font-semibold text-slate-800 mb-1 leading-tight">{d.nombre}</p>
      <p className="text-slate-600">Puntaje: <strong className="text-slate-900">{d.puntaje}%</strong></p>
      <p className="text-slate-500 text-xs mt-0.5">Nivel: {d.nivel.nivel}</p>
    </div>
  );
}

// ─── Gráfica de barras horizontal ─────────────────────────────────────────────
function DimensionesBarChart({ items }: { items: Array<{ nombre: string; puntaje: number; nivel: { nivel: string; labelClass: string } }> }) {
  if (!items.length) return null;

  const chartData = items.map((d) => ({
    nombre: d.nombre.length > 28 ? d.nombre.slice(0, 26) + "…" : d.nombre,
    puntaje: d.puntaje,
    nivel: d.nivel,
    fill: NIVEL_HEX[d.nivel.labelClass] ?? "#94a3b8",
  }));

  const chartHeight = Math.max(280, chartData.length * 42);

  return (
    <div style={{ height: chartHeight }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 8, right: 60, left: 8, bottom: 8 }}
          barCategoryGap="30%"
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
          <XAxis
            type="number"
            domain={[0, 100]}
            tickCount={6}
            tick={{ fontSize: 11, fill: "#94a3b8" }}
            tickLine={false}
            axisLine={false}
            tickFormatter={(v) => `${v}%`}
          />
          <YAxis
            type="category"
            dataKey="nombre"
            width={180}
            tick={{ fontSize: 11, fill: "#475569" }}
            tickLine={false}
            axisLine={false}
          />
          {/* Líneas de referencia de umbrales NOM-035 */}
          <ReferenceLine x={5}  stroke="#22c55e" strokeDasharray="4 3" label={{ value: "Nulo", position: "top", fontSize: 9, fill: "#22c55e" }} />
          <ReferenceLine x={40} stroke="#06b6d4" strokeDasharray="4 3" label={{ value: "Bajo", position: "top", fontSize: 9, fill: "#06b6d4" }} />
          <ReferenceLine x={60} stroke="#eab308" strokeDasharray="4 3" label={{ value: "Medio", position: "top", fontSize: 9, fill: "#eab308" }} />
          <ReferenceLine x={85} stroke="#f97316" strokeDasharray="4 3" label={{ value: "Alto", position: "top", fontSize: 9, fill: "#f97316" }} />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: "#f8fafc" }} />
          <Bar dataKey="puntaje" radius={[0, 4, 4, 0]} maxBarSize={22}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.fill} />
            ))}
            <LabelList dataKey="puntaje" position="right" formatter={(v: number) => `${v}%`} style={{ fontSize: 11, fill: "#64748b", fontWeight: 600 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── Leyenda de niveles ────────────────────────────────────────────────────────
function NivelLeyenda() {
  const niveles = [
    { key: "nulo",     label: "Nulo (0–5%)",      hex: "#22c55e" },
    { key: "bajo",     label: "Bajo (6–40%)",      hex: "#06b6d4" },
    { key: "medio",    label: "Medio (41–60%)",    hex: "#eab308" },
    { key: "alto",     label: "Alto (61–85%)",     hex: "#f97316" },
    { key: "muy_alto", label: "Muy Alto (86–100%)",hex: "#dc2626" },
  ];
  return (
    <div className="flex flex-wrap gap-3 mt-2">
      {niveles.map((n) => (
        <div key={n.key} className="flex items-center gap-1.5 text-xs text-slate-600">
          <span className="w-3 h-3 rounded-sm inline-block flex-shrink-0" style={{ background: n.hex }} />
          {n.label}
        </div>
      ))}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function NOM035DetailedReport() {
  const [showCategoria, setShowCategoria] = useState(true);
  const [showDominio, setShowDominio] = useState(true);
  const [showDimension, setShowDimension] = useState(true);
  const [showRecomendaciones, setShowRecomendaciones] = useState(false);
  const [showPlanTrabajo, setShowPlanTrabajo] = useState(false);
  const [activeTab, setActiveTab] = useState<"tabla" | "grafica">("grafica");
  const [queryParams, setQueryParams] = useState({
    showCategoria: true,
    showDominio: true,
    showDimension: true,
    showRecomendaciones: false,
    showPlanTrabajo: false,
    surveyPeriodId: undefined as number | undefined,
  });

  const { data, isLoading } = trpc.nom035Admin.getDetailedResults.useQuery(queryParams, { retry: false });

  return (
    <DashboardLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">

        {/* ── Encabezado ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-blue-600" />
              Dictamen NOM-035 — Análisis Extendido
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Cálculo por <strong>Categoría, Dominio y Dimensión</strong> conforme a la NOM-035-STPS-2018.
              Fórmula: (PuntajeDirecto / MáximoPosible) × 100.
            </p>
          </div>
          <Badge variant="outline" className="text-xs border-blue-300 text-blue-700 bg-blue-50 whitespace-nowrap">
            NOM-035-STPS-2018
          </Badge>
        </div>

        {/* ── Panel de configuración ── */}
        <Card className="border-slate-200">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Grid3X3 className="w-4 h-4 text-slate-500" />
              Personaliza tu reporte final
            </CardTitle>
            <CardDescription>Selecciona qué secciones incluir en el dictamen</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-3">
              {[
                { label: "Resultados por Categoría",      value: showCategoria,       set: setShowCategoria },
                { label: "Resultados por Dominio",         value: showDominio,         set: setShowDominio },
                { label: "Resultados por Dimensión",       value: showDimension,       set: setShowDimension },
                { label: "Recomendaciones (Guía STPS)",    value: showRecomendaciones, set: setShowRecomendaciones },
                { label: "Plan de trabajo / Intervención", value: showPlanTrabajo,     set: setShowPlanTrabajo },
              ].map(({ label, value, set }) => (
                <label key={label} className="flex items-center gap-2 cursor-pointer bg-slate-50 border border-slate-200 rounded-full px-4 py-2 hover:bg-blue-50 transition-colors">
                  <Checkbox checked={value} onCheckedChange={(v) => set(!!v)} />
                  <span className="text-sm font-medium text-slate-700">{label}</span>
                </label>
              ))}
            </div>
            <Button
              onClick={() => setQueryParams({ showCategoria, showDominio, showDimension, showRecomendaciones, showPlanTrabajo, surveyPeriodId: undefined })}
              className="bg-slate-800 hover:bg-slate-700 text-white rounded-full px-6"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Generar Dictamen NOM-035
            </Button>
            {data && data.totalRespuestas > 0 && (
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => exportToExcel(data)}
                  variant="outline"
                  className="border-emerald-600 text-emerald-700 hover:bg-emerald-50 rounded-full px-6"
                >
                  <FileDown className="w-4 h-4 mr-2" />Excel
                </Button>
                <Button
                  variant="outline"
                  className="border-blue-600 text-blue-700 hover:bg-blue-50 rounded-full px-6"
                  onClick={async () => {
                    try {
                      const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel } = await import("docx");
                      const makeCell = (t: string, bold = false) =>
                        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(t), bold })] })] });
                      const catRows = [
                        new TableRow({ children: [makeCell("Dominio", true), makeCell("Puntaje", true), makeCell("Nivel", true)] }),
                        ...(data.dominios ?? []).map((d: any) => new TableRow({ children: [makeCell(d.nombre), makeCell(`${d.puntaje}%`), makeCell(d.nivel?.nivel ?? "")] })),
                      ];
                      const doc = new Document({
                        sections: [{
                          children: [
                            new Paragraph({ text: "Dictamen NOM-035 \u2014 An\u00e1lisis Extendido", heading: HeadingLevel.HEADING_1 }),
                            new Paragraph({ children: [new TextRun({ text: `Generado: ${new Date().toLocaleString("es-MX")}` })] }),
                            new Paragraph({ children: [new TextRun({ text: `Total respuestas: ${data.totalRespuestas}` })] }),
                            new Paragraph({ text: "" }),
                            new Paragraph({ text: "Resultados por Categor\u00eda", heading: HeadingLevel.HEADING_2 }),
                            new Table({ width: { size: 80, type: WidthType.PERCENTAGE }, rows: catRows }),
                          ],
                        }],
                      });
                      const blob = await Packer.toBlob(doc);
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `dictamen-nom035-${new Date().toISOString().slice(0, 10)}.docx`;
                      a.click();
                      URL.revokeObjectURL(url);
                      toast.success("Archivo Word generado");
                    } catch { toast.error("Error al exportar a Word"); }
                  }}
                >
                  <FileText className="w-4 h-4 mr-2" />Word
                </Button>
                <Button
                  variant="outline"
                  className="border-slate-600 text-slate-700 hover:bg-slate-50 rounded-full px-6"
                  onClick={() => window.print()}
                >
                  <Printer className="w-4 h-4 mr-2" />PDF
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* ── Loading ── */}
        {isLoading && (
          <div className="text-center py-12 text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3" />
            <p>Calculando resultados...</p>
          </div>
        )}

        {/* ── Sin datos ── */}
        {!isLoading && data && data.totalRespuestas === 0 && (
          <Card className="border-dashed border-slate-300">
            <CardContent className="py-12 text-center text-slate-400">
              <BarChart3 className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>No hay respuestas completadas. Aplica la encuesta NOM-035 primero.</p>
            </CardContent>
          </Card>
        )}

        {/* ── Resultados ── */}
        {!isLoading && data && data.totalRespuestas > 0 && (
          <div className="space-y-5">

            {/* KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="pt-5">
                  <p className="text-xs font-semibold text-blue-600 uppercase">Total respuestas</p>
                  <p className="text-3xl font-bold text-blue-900 mt-1">{data.totalRespuestas}</p>
                </CardContent>
              </Card>
              {data.categoriaGeneral && (
                <Card>
                  <CardContent className="pt-5">
                    <p className="text-xs font-semibold text-slate-500 uppercase">Categoría General</p>
                    <p className="text-3xl font-bold text-slate-900 mt-1">{data.categoriaGeneral.puntaje}%</p>
                    <NivelBadge nivel={data.categoriaGeneral.nivel.nivel} labelClass={data.categoriaGeneral.nivel.labelClass} />
                  </CardContent>
                </Card>
              )}
              <Card className={`border-2 ${data.requierePlanObligatorio ? "border-orange-300 bg-orange-50" : "border-green-300 bg-green-50"}`}>
                <CardContent className="pt-5">
                  <p className={`text-xs font-semibold uppercase ${data.requierePlanObligatorio ? "text-orange-600" : "text-green-600"}`}>
                    Plan de intervención
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    {data.requierePlanObligatorio
                      ? <AlertTriangle className="w-6 h-6 text-orange-500" />
                      : <CheckCircle2 className="w-6 h-6 text-green-500" />}
                    <span className={`text-sm font-semibold ${data.requierePlanObligatorio ? "text-orange-800" : "text-green-800"}`}>
                      {data.requierePlanObligatorio ? "Obligatorio (NOM-035 §8.4)" : "No requerido"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* ── Gráfica de Dimensiones ── */}
            {data.dimensiones.length > 0 && queryParams.showDimension && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-blue-500" />
                      Gráfica de Dimensiones — Nivel de Riesgo
                    </CardTitle>
                    <div className="flex gap-1 bg-slate-100 rounded-full p-1">
                      <button
                        onClick={() => setActiveTab("grafica")}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${activeTab === "grafica" ? "bg-white shadow text-slate-800" : "text-slate-500 hover:text-slate-700"}`}
                      >
                        Gráfica
                      </button>
                      <button
                        onClick={() => setActiveTab("tabla")}
                        className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${activeTab === "tabla" ? "bg-white shadow text-slate-800" : "text-slate-500 hover:text-slate-700"}`}
                      >
                        Tabla
                      </button>
                    </div>
                  </div>
                  <CardDescription className="text-xs">
                    Barras coloreadas por nivel de riesgo NOM-035. Las líneas verticales marcan los umbrales normativos.
                  </CardDescription>
                  <NivelLeyenda />
                </CardHeader>
                <CardContent>
                  {activeTab === "grafica" ? (
                    <DimensionesBarChart items={data.dimensiones} />
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-slate-100">
                            <th className="text-left py-2 px-3 text-slate-500 font-medium">Dimensión</th>
                            <th className="text-left py-2 px-3 text-slate-500 font-medium">Dominio</th>
                            <th className="text-left py-2 px-3 text-slate-500 font-medium">Puntaje (%)</th>
                            <th className="text-left py-2 px-3 text-slate-500 font-medium">Nivel</th>
                            <th className="text-right py-2 px-3 text-slate-500 font-medium">Reactivos</th>
                          </tr>
                        </thead>
                        <tbody>
                          {data.dimensiones.map((dim) => (
                            <tr key={dim.nombre} className="border-b border-slate-50 hover:bg-slate-50">
                              <td className="py-2.5 px-3 font-medium text-slate-800">{dim.nombre}</td>
                              <td className="py-2.5 px-3 text-slate-500 text-xs">{dim.domain || dim.category || "—"}</td>
                              <td className="py-2.5 px-3"><ScoreBar puntaje={dim.puntaje} labelClass={dim.nivel.labelClass} /></td>
                              <td className="py-2.5 px-3"><NivelBadge nivel={dim.nivel.nivel} labelClass={dim.nivel.labelClass} /></td>
                              <td className="py-2.5 px-3 text-right text-slate-400 text-xs">{dim.totalReactivos}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ── Dominios ── */}
            {data.dominios.length > 0 && queryParams.showDominio && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Layers className="w-4 h-4 text-purple-500" />
                    Dominios Evaluados
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100">
                          <th className="text-left py-2 px-3 text-slate-500 font-medium">Dominio</th>
                          <th className="text-left py-2 px-3 text-slate-500 font-medium">Puntaje</th>
                          <th className="text-left py-2 px-3 text-slate-500 font-medium">Nivel</th>
                          <th className="text-right py-2 px-3 text-slate-500 font-medium">Dimensiones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.dominios.map((dom) => (
                          <tr key={dom.nombre} className="border-b border-slate-50 hover:bg-slate-50">
                            <td className="py-2.5 px-3 font-medium text-slate-800">{dom.nombre}</td>
                            <td className="py-2.5 px-3"><ScoreBar puntaje={dom.puntaje} labelClass={dom.nivel.labelClass} /></td>
                            <td className="py-2.5 px-3"><NivelBadge nivel={dom.nivel.nivel} labelClass={dom.nivel.labelClass} /></td>
                            <td className="py-2.5 px-3 text-right text-slate-400 text-xs">{dom.totalDimensiones}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ── Recomendaciones ── */}
            {data.recomendaciones.length > 0 && queryParams.showRecomendaciones && (
              <Card className="border-indigo-200 bg-indigo-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-indigo-800">
                    <Lightbulb className="w-4 h-4 text-indigo-500" />
                    Recomendaciones basadas en NOM-035
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {data.recomendaciones.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-indigo-800">
                        <span className="mt-0.5 text-indigo-400">•</span>{rec}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* ── Plan de trabajo ── */}
            {data.planTrabajo && queryParams.showPlanTrabajo && (
              <Card className="border-orange-200 bg-orange-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2 text-orange-800">
                    <ClipboardList className="w-4 h-4 text-orange-500" />
                    Plan de trabajo sugerido (NOM-035, numeral 8.4)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: "Nivel 1 — Acción inmediata",         value: data.planTrabajo.nivel1 },
                    { label: "Nivel 2 — Intervención organizacional",value: data.planTrabajo.nivel2 },
                    { label: "Nivel 3 — Seguimiento",              value: data.planTrabajo.nivel3 },
                    { label: "Comité de seguridad",                 value: data.planTrabajo.comite },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-white rounded-lg p-3 border border-orange-200">
                      <p className="text-xs font-bold text-orange-700 uppercase tracking-wide mb-1">{label}</p>
                      <p className="text-sm text-slate-700">{value}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* ── Aviso normativo ── */}
            {data.requierePlanObligatorio && !queryParams.showPlanTrabajo && (
              <div className="flex items-start gap-3 bg-amber-50 border border-amber-300 rounded-lg p-4">
                <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-amber-800">Aviso normativo</p>
                  <p className="text-sm text-amber-700 mt-0.5">
                    Se detectaron niveles <strong>Alto</strong> o <strong>Muy Alto</strong>. La NOM-035 obliga a un plan de intervención (numeral 8.4).
                  </p>
                </div>
              </div>
            )}

            <p className="text-xs text-center text-slate-400 pt-2">
              NOM-035-STPS-2018 — Niveles: Nulo (0–5%), Bajo (6–40%), Medio (41–60%), Alto (61–85%), Muy Alto (86–100%)
            </p>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
