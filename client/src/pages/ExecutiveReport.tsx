import { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, Calendar, AlertTriangle, MessageSquare, ClipboardCheck, TrendingUp, TrendingDown, Printer, BarChart2, FileSpreadsheet, ArrowUp, ArrowDown, Minus, FileText } from "lucide-react";
import { toast } from "sonner";

// Chart.js loaded from CDN via useEffect
declare const Chart: any;

function TrendChart({
  id,
  labels,
  datasets,
  title,
}: {
  id: string;
  labels: string[];
  datasets: { label: string; data: number[]; color: string }[];
  title: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    if (!canvasRef.current || typeof Chart === "undefined") return;
    if (chartRef.current) {
      chartRef.current.destroy();
    }
    chartRef.current = new Chart(canvasRef.current, {
      type: "line",
      data: {
        labels,
        datasets: datasets.map(ds => ({
          label: ds.label,
          data: ds.data,
          borderColor: ds.color,
          backgroundColor: ds.color + "22",
          borderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.3,
          fill: true,
        })),
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 11 } } },
          title: { display: false },
          tooltip: { mode: "index", intersect: false },
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 11 } } },
          y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 11 } }, grid: { color: "#f0f0f0" } },
        },
      },
    });
    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [labels, datasets]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <BarChart2 className="h-4 w-4 text-indigo-500" />{title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height: "220px" }}>
          <canvas ref={canvasRef} id={id} />
        </div>
      </CardContent>
    </Card>
  );
}

function RiskComparisonChart({ data }: { data: any }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<any>(null);

  useEffect(() => {
    if (!canvasRef.current || !data || typeof Chart === "undefined") return;
    if (chartRef.current) chartRef.current.destroy();
    const labels = data.comparison.map((r: any) => r.departmentName);
    const prevData = data.comparison.map((r: any) => r.previous.avgScore > 0 ? parseFloat(r.previous.avgScore.toFixed(1)) : 0);
    const currData = data.comparison.map((r: any) => r.current.avgScore > 0 ? parseFloat(r.current.avgScore.toFixed(1)) : 0);
    chartRef.current = new Chart(canvasRef.current, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: data.previousMonthLabel,
            data: prevData,
            backgroundColor: "rgba(99, 102, 241, 0.65)",
            borderColor: "rgba(99, 102, 241, 1)",
            borderWidth: 1,
            borderRadius: 4,
          },
          {
            label: data.currentMonthLabel,
            data: currData,
            backgroundColor: "rgba(239, 68, 68, 0.65)",
            borderColor: "rgba(239, 68, 68, 1)",
            borderWidth: 1,
            borderRadius: 4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: "bottom", labels: { boxWidth: 12, font: { size: 11 } } },
          tooltip: {
            mode: "index",
            intersect: false,
            callbacks: {
              label: (ctx: any) => `${ctx.dataset.label}: ${ctx.parsed.y.toFixed(1)}/140`,
            },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 }, maxRotation: 30 } },
          y: {
            beginAtZero: true,
            max: 140,
            ticks: { font: { size: 10 }, stepSize: 20 },
            grid: { color: "#f0f0f0" },
            title: { display: true, text: "Puntaje NOM-035 (0–140)", font: { size: 10 } },
          },
        },
      },
    });
    return () => { if (chartRef.current) chartRef.current.destroy(); };
  }, [data]);

  const exportAsPNG = () => {
    if (!canvasRef.current) return;
    const link = document.createElement("a");
    link.download = `comparativa-psicometrica-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };
  if (!data || data.comparison.length === 0) return null;
  return (
    <div className="relative">
      <button
        onClick={exportAsPNG}
        className="absolute top-0 right-0 z-10 text-xs bg-white border rounded px-2 py-1 shadow-sm hover:bg-slate-50 flex items-center gap-1"
        title="Descargar gráfica como imagen PNG"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        PNG
      </button>
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}

export default function ExecutiveReport() {
  const [trendMonths, setTrendMonths] = useState(6);
  const [chartJsLoaded, setChartJsLoaded] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | undefined>(undefined);
  const [compareMonthsAgo, setCompareMonthsAgo] = useState(1);

  const { data: kpis, isLoading, refetch } = trpc.executiveReport.getKPIs.useQuery({});
  const { data: trends, isLoading: trendsLoading } = trpc.executiveReport.getTrends.useQuery({ months: trendMonths });
  const { data: deptRisk = [] } = trpc.psychometric.getRiskByDepartment.useQuery(
    selectedCompanyId !== undefined ? { companyId: selectedCompanyId } : undefined
  );
  const { data: riskComparison } = trpc.psychometric.getRiskComparison.useQuery(
    { companyId: selectedCompanyId, compareMonthsAgo }
  );

  const exportRiskComparisonToExcel = async () => {
    if (!riskComparison || riskComparison.comparison.length === 0) return;
    try {
      const { utils, writeFile } = await import("xlsx");
      const trendLabel = (t: string) => t === "up" ? "Sube" : t === "down" ? "Baja" : "Estable";
      const rows = riskComparison.comparison.map((row: any) => ({
        "Departamento": row.departmentName,
        [`Puntaje ${riskComparison.previousMonthLabel}`]: row.previous.avgScore > 0 ? row.previous.avgScore.toFixed(1) : "Sin datos",
        [`Puntaje ${riskComparison.currentMonthLabel}`]: row.current.avgScore > 0 ? row.current.avgScore.toFixed(1) : "Sin datos",
        "Δ Puntaje": row.deltaScore !== 0 ? (row.deltaScore > 0 ? `+${row.deltaScore.toFixed(1)}` : row.deltaScore.toFixed(1)) : "0",
        "Empleados evaluados (actual)": row.current.totalAssessed,
        "Alto riesgo (actual)": row.current.highRiskCount,
        "Δ Alto riesgo": row.deltaHighRisk !== 0 ? (row.deltaHighRisk > 0 ? `+${row.deltaHighRisk}` : row.deltaHighRisk) : "0",
        "Tendencia": trendLabel(row.trend),
      }));
      const ws = utils.json_to_sheet(rows);
      const wb = utils.book_new();
      utils.book_append_sheet(wb, ws, "Comparativa Psicométrica");
      // Metadata sheet
      const meta = utils.json_to_sheet([
        { "Campo": "Período actual", "Valor": riskComparison.currentMonthLabel },
        { "Campo": "Período anterior", "Valor": riskComparison.previousMonthLabel },
        { "Campo": "Generado el", "Valor": new Date().toLocaleString("es-MX") },
        { "Campo": "Escala puntaje", "Valor": "0–140 (NOM-035 STPS 2018)" },
        { "Campo": "Umbral tendencia", "Valor": "±2 puntos" },
        { "Campo": "Riesgo bajo", "Valor": "0–24" },
        { "Campo": "Riesgo medio", "Valor": "25–49" },
        { "Campo": "Riesgo alto", "Valor": "50–79" },
        { "Campo": "Riesgo muy alto", "Valor": "80–140" },
      ]);
      utils.book_append_sheet(wb, meta, "Referencia NOM-035");
      const dateStr = new Date().toISOString().slice(0, 10);
      writeFile(wb, `comparativa_psicometrica_NOM035_${dateStr}.xlsx`);
      toast.success(`${rows.length} departamentos exportados a Excel`);
    } catch {
      toast.error("Error al exportar la comparativa");
    }
  };
  const { data: companiesList = [] } = trpc.superAdmin.listCompaniesSimple.useQuery();

  function exportToExcel() {
    const wb = XLSX.utils.book_new();

    // Sheet 1: KPIs Globales
    if (kpis) {
      const kpiRows = [
        ["KPI", "Valor", "Descripción"],
        ["Total Empleados", kpis.employees.total, "Total de empleados en el sistema"],
        ["Empleados Activos", kpis.employees.active, "Empleados activos"],
        ["Tasa de Rotación", `${kpis.employees.turnoverRate}%`, "Porcentaje de rotación"],
        ["Cursos Totales", kpis.training.totalCourses, "Cursos registrados"],
        ["Capacitaciones Completadas", kpis.training.completedAssignments, "Asignaciones completadas"],
        ["Tasa de Completación", `${kpis.training.completionRate}%`, "Porcentaje de completación"],
        ["Vacaciones Pendientes", kpis.vacations.pending, "Solicitudes pendientes de aprobación"],
        ["Vacaciones Aprobadas", kpis.vacations.approved, "Solicitudes aprobadas"],
        ["Casos NOM-035 Abiertos", kpis.cases.open, "Casos abiertos de riesgo psicosocial"],
        ["Casos de Alto Riesgo", kpis.cases.highRisk, "Casos con prioridad alta o crítica"],
        ["Mensajes Buzón Interno", kpis.mailbox.total, "Total de mensajes en el buzón"],
        ["Mensajes Pendientes", kpis.mailbox.pending, "Mensajes sin resolver"],
        ["Evaluaciones Psicométricas", kpis.psychometric.total, "Total de evaluaciones realizadas"],
        ["Alto Riesgo Psicométrico", kpis.psychometric.highRisk, "Evaluaciones con riesgo alto o muy alto"],
      ];
      const wsKPIs = XLSX.utils.aoa_to_sheet(kpiRows);
      wsKPIs["!cols"] = [{ wch: 35 }, { wch: 15 }, { wch: 45 }];
      XLSX.utils.book_append_sheet(wb, wsKPIs, "KPIs Globales");
    }

    // Sheet 2: Tendencias Mensuales
    if (trends && trends.labels && trends.cases) {
      const trendHeader = ["Mes", "Casos NOM-035", "Capacitaciones Completadas", "Buzón Interno", "Salidas", "Psicométricas"];
      const trendRows = trends.labels.map((label: string, i: number) => [
        label,
        trends.cases?.[i] ?? 0,
        trends.trainingCompletions?.[i] ?? 0,
        trends.mailboxMessages?.[i] ?? 0,
        trends.employeeExits?.[i] ?? 0,
        trends.psychometricAssessments?.[i] ?? 0,
      ]);
      const wsTrends = XLSX.utils.aoa_to_sheet([trendHeader, ...trendRows]);
      wsTrends["!cols"] = [{ wch: 15 }, { wch: 18 }, { wch: 18 }, { wch: 18 }];
      XLSX.utils.book_append_sheet(wb, wsTrends, "Tendencias Mensuales");
    }

    // Sheet 3: Metadata
    const metaRows = [
      ["Reporte Ejecutivo Consolidado NOM-035 STPS"],
      ["Generado el", new Date().toLocaleString("es-MX")],
      ["Período de tendencias", `${trendMonths} meses`],
    ];
    const wsMeta = XLSX.utils.aoa_to_sheet(metaRows);
    XLSX.utils.book_append_sheet(wb, wsMeta, "Metadatos");

    XLSX.writeFile(wb, `Reporte_Ejecutivo_NOM035_${new Date().toISOString().slice(0, 10)}.xlsx`);
  }

  const exportToWord = async () => {
    try {
      const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel } = await import("docx");
      const makeCell = (text: string, bold = false) =>
        new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(text), bold })] })] });
      const kpiTableRows = kpis ? [
        new TableRow({ children: [makeCell("KPI", true), makeCell("Valor", true)] }),
        new TableRow({ children: [makeCell("Total Empleados"), makeCell(String(kpis.employees.total))] }),
        new TableRow({ children: [makeCell("Empleados Activos"), makeCell(String(kpis.employees.active))] }),
        new TableRow({ children: [makeCell("Tasa de Rotaci\u00f3n"), makeCell(`${kpis.employees.turnoverRate}%`)] }),
        new TableRow({ children: [makeCell("Cursos Totales"), makeCell(String(kpis.training.totalCourses))] }),
        new TableRow({ children: [makeCell("Tasa de Completaci\u00f3n"), makeCell(`${kpis.training.completionRate}%`)] }),
        new TableRow({ children: [makeCell("Vacaciones Pendientes"), makeCell(String(kpis.vacations.pending))] }),
        new TableRow({ children: [makeCell("Casos NOM-035 Abiertos"), makeCell(String(kpis.cases.open))] }),
        new TableRow({ children: [makeCell("Casos Alto Riesgo"), makeCell(String(kpis.cases.highRisk))] }),
      ] : [];
      const doc = new Document({
        sections: [{
          children: [
            new Paragraph({ text: "Reporte Ejecutivo Consolidado NOM-035 STPS", heading: HeadingLevel.HEADING_1 }),
            new Paragraph({ children: [new TextRun({ text: `Generado: ${new Date().toLocaleString("es-MX")}` })] }),
            new Paragraph({ text: "" }),
            new Paragraph({ text: "KPIs Globales", heading: HeadingLevel.HEADING_2 }),
            ...(kpiTableRows.length > 0 ? [new Table({ width: { size: 60, type: WidthType.PERCENTAGE }, rows: kpiTableRows })] : []),
          ],
        }],
      });
      const blob = await Packer.toBlob(doc);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reporte-ejecutivo-nom035-${new Date().toISOString().slice(0, 10)}.docx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Archivo Word generado correctamente");
    } catch {
      toast.error("Error al exportar a Word");
    }
  };

  // Load Chart.js from CDN
  useEffect(() => {
    if (typeof Chart !== "undefined") { setChartJsLoaded(true); return; }
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js";
    script.onload = () => setChartJsLoaded(true);
    document.head.appendChild(script);
  }, []);

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6 flex items-center justify-center h-64">
          <div className="text-center text-muted-foreground">
            <TrendingUp className="h-12 w-12 mx-auto mb-3 animate-pulse" />
            <p>Generando reporte ejecutivo...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6 print:p-4">
        {/* Header */}
        <div className="flex items-center justify-between print:hidden">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-indigo-600" />
              Reporte Ejecutivo Consolidado
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              KPIs globales NOM-035 STPS — {new Date().toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => refetch()}>Actualizar</Button>
            <Button variant="outline" onClick={exportToExcel} className="border-green-600 text-green-700 hover:bg-green-50">
              <FileSpreadsheet className="h-4 w-4 mr-2" />Exportar Excel
            </Button>
            <Button variant="outline" onClick={exportToWord} className="border-blue-600 text-blue-700 hover:bg-blue-50">
              <FileText className="h-4 w-4 mr-2" />Word
            </Button>
            <Button onClick={() => window.print()} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <Printer className="h-4 w-4 mr-2" />Imprimir / PDF
            </Button>
          </div>
        </div>

        {/* Print header */}
        <div className="hidden print:block border-b pb-4 mb-4">
          <h1 className="text-2xl font-bold">Reporte Ejecutivo Consolidado NOM-035 STPS</h1>
          <p className="text-sm text-gray-600">Fecha: {new Date().toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })}</p>
        </div>

        {kpis && (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {[
                { label: "Empleados Activos",      value: kpis.employees.active,             total: kpis.employees.total,   icon: <Users className="h-5 w-5 text-blue-600" />,          color: "text-blue-700",   bg: "bg-blue-50" },
                { label: "Cursos Disponibles",     value: kpis.training.totalCourses,         total: null,                   icon: <BookOpen className="h-5 w-5 text-purple-600" />,      color: "text-purple-700", bg: "bg-purple-50" },
                { label: "Tasa Capacitación",      value: `${kpis.training.completionRate}%`, total: null,                   icon: <ClipboardCheck className="h-5 w-5 text-green-600" />, color: "text-green-700",  bg: "bg-green-50" },
                { label: "Vacaciones Pendientes",  value: kpis.vacations.pending,             total: kpis.vacations.total,   icon: <Calendar className="h-5 w-5 text-orange-600" />,      color: "text-orange-700", bg: "bg-orange-50" },
                { label: "Casos Abiertos NOM-035", value: kpis.cases.open,                   total: kpis.cases.total,       icon: <AlertTriangle className="h-5 w-5 text-red-600" />,    color: "text-red-700",    bg: "bg-red-50" },
                { label: "Mensajes Pendientes",    value: kpis.mailbox.pending,               total: kpis.mailbox.total,     icon: <MessageSquare className="h-5 w-5 text-teal-600" />,   color: "text-teal-700",   bg: "bg-teal-50" },
              ].map(kpi => (
                <Card key={kpi.label} className={`${kpi.bg} border-0`}>
                  <CardContent className="pt-4 pb-3">
                    <div className="mb-2">{kpi.icon}</div>
                    <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
                    {kpi.total !== null && <p className="text-xs text-muted-foreground">de {kpi.total} total</p>}
                    <p className="text-xs font-medium mt-1">{kpi.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Trend Charts Section */}
            <div className="print:hidden">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  <BarChart2 className="h-5 w-5 text-indigo-600" />
                  Tendencias Mensuales
                </h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Período:</span>
                  {[3, 6, 9, 12].map(m => (
                    <button key={m} onClick={() => setTrendMonths(m)}
                      className={`text-xs px-3 py-1 rounded-full border transition-all ${trendMonths === m ? "bg-indigo-600 text-white border-indigo-600" : "border-muted hover:border-indigo-400"}`}>
                      {m} meses
                    </button>
                  ))}
                </div>
              </div>

              {trendsLoading || !chartJsLoaded ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2].map(i => (
                    <Card key={i}><CardContent className="h-64 flex items-center justify-center text-muted-foreground text-sm">
                      Cargando gráfica...
                    </CardContent></Card>
                  ))}
                </div>
              ) : trends && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TrendChart
                    id="chart-cases-training"
                    title="Casos NOM-035 vs Capacitaciones Completadas"
                    labels={trends.labels}
                    datasets={[
                      { label: "Casos NOM-035", data: trends.cases, color: "#dc2626" },
                      { label: "Capacitaciones completadas", data: trends.trainingCompletions, color: "#16a34a" },
                    ]}
                  />
                  <TrendChart
                    id="chart-exits-psycho"
                    title="Rotación de Personal vs Evaluaciones Psicométricas"
                    labels={trends.labels}
                    datasets={[
                      { label: "Salidas de empleados", data: trends.employeeExits, color: "#1d4ed8" },
                      { label: "Evaluaciones psicométricas", data: trends.psychometricAssessments, color: "#7c3aed" },
                    ]}
                  />
                  <TrendChart
                    id="chart-mailbox"
                    title="Mensajes en Buzón Interno por Mes"
                    labels={trends.labels}
                    datasets={[
                      { label: "Mensajes recibidos", data: trends.mailboxMessages, color: "#0891b2" },
                    ]}
                  />
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-orange-500" />Resumen del Período ({trendMonths} meses)
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {[
                        { label: "Total casos NOM-035",          value: trends.cases.reduce((a, b) => a + b, 0),                    color: "text-red-600" },
                        { label: "Capacitaciones completadas",   value: trends.trainingCompletions.reduce((a, b) => a + b, 0),      color: "text-green-600" },
                        { label: "Salidas de empleados",         value: trends.employeeExits.reduce((a, b) => a + b, 0),            color: "text-blue-600" },
                        { label: "Evaluaciones psicométricas",   value: trends.psychometricAssessments.reduce((a, b) => a + b, 0),  color: "text-purple-600" },
                        { label: "Mensajes en buzón",            value: trends.mailboxMessages.reduce((a, b) => a + b, 0),          color: "text-teal-600" },
                      ].map(row => (
                        <div key={row.label} className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">{row.label}</span>
                          <span className={`text-sm font-bold ${row.color}`}>{row.value}</span>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>

            {/* Detail cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Users className="h-4 w-4 text-blue-600" />Fuerza Laboral
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: "Total de empleados",  value: kpis.employees.total },
                    { label: "Empleados activos",   value: `${kpis.employees.active} (${kpis.employees.total > 0 ? Math.round((kpis.employees.active / kpis.employees.total) * 100) : 0}%)` },
                    { label: "Empleados inactivos", value: `${kpis.employees.inactive} (${kpis.employees.total > 0 ? Math.round((kpis.employees.inactive / kpis.employees.total) * 100) : 0}%)` },
                    { label: "Tasa de rotación",    value: `${kpis.employees.turnoverRate}%` },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{row.label}</span>
                      <span className="text-sm font-semibold">{row.value}</span>
                    </div>
                  ))}
                  {kpis.employees.total > 0 && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Activos</span><span>{Math.round((kpis.employees.active / kpis.employees.total) * 100)}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-2 bg-blue-500 rounded-full" style={{ width: `${(kpis.employees.active / kpis.employees.total) * 100}%` }} />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-purple-600" />Capacitación y Desarrollo
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: "Cursos disponibles",        value: kpis.training.totalCourses },
                    { label: "Asignaciones totales",      value: kpis.training.totalAssignments },
                    { label: "Asignaciones completadas",  value: kpis.training.completedAssignments },
                    { label: "Tasa de completación",      value: `${kpis.training.completionRate}%` },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{row.label}</span>
                      <span className="text-sm font-semibold">{row.value}</span>
                    </div>
                  ))}
                  {kpis.training.totalAssignments > 0 && (
                    <div className="mt-2">
                      <div className="flex justify-between text-xs text-muted-foreground mb-1">
                        <span>Completadas</span><span>{kpis.training.completionRate}%</span>
                      </div>
                      <div className="h-2 bg-muted rounded-full overflow-hidden">
                        <div className="h-2 bg-purple-500 rounded-full" style={{ width: `${kpis.training.completionRate}%` }} />
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />Casos NOM-035 y Riesgo Psicosocial
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: "Total de casos",              value: kpis.cases.total,           alert: false },
                    { label: "Casos abiertos",              value: kpis.cases.open,            alert: kpis.cases.open > 0 },
                    { label: "Casos de alto riesgo",        value: kpis.cases.highRisk,        alert: kpis.cases.highRisk > 0 },
                    { label: "Evaluaciones psicométricas",  value: kpis.psychometric.total,    alert: false },
                    { label: "Riesgo alto/muy alto",        value: kpis.psychometric.highRisk, alert: kpis.psychometric.highRisk > 0 },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{row.label}</span>
                      <span className={`text-sm font-semibold ${row.alert ? "text-red-600" : ""}`}>{row.value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <MessageSquare className="h-4 w-4 text-teal-600" />Buzón Interno y Vacaciones
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    { label: "Mensajes totales",          value: kpis.mailbox.total,      alert: false },
                    { label: "Mensajes pendientes",       value: kpis.mailbox.pending,    alert: kpis.mailbox.pending > 0 },
                    { label: "Solicitudes de vacaciones", value: kpis.vacations.total,    alert: false },
                    { label: "Vacaciones pendientes",     value: kpis.vacations.pending,  alert: kpis.vacations.pending > 0 },
                    { label: "Vacaciones aprobadas",      value: kpis.vacations.approved, alert: false },
                  ].map(row => (
                    <div key={row.label} className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">{row.label}</span>
                      <span className={`text-sm font-semibold ${row.alert ? "text-orange-600" : ""}`}>{row.value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Mapa de calor psicométrico por departamento */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <ClipboardCheck className="h-4 w-4 text-purple-600" />
                      Riesgo Psicométrico por Departamento
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">Basado en la última evaluación NOM-035 Guía III de cada empleado activo</p>
                  </div>
                  {(companiesList as any[]).length > 0 && (
                    <div className="flex items-center gap-2 print:hidden">
                      <span className="text-xs text-muted-foreground whitespace-nowrap">Empresa:</span>
                      <select
                        className="text-xs border rounded px-2 py-1 bg-background"
                        value={selectedCompanyId ?? ""}
                        onChange={e => setSelectedCompanyId(e.target.value ? Number(e.target.value) : undefined)}
                      >
                        <option value="">Todas</option>
                        {(companiesList as any[]).map((c: any) => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {(deptRisk as any[]).length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Sin datos de evaluaciones psicométricas aún</p>
                ) : (
                  <div className="space-y-2">
                    {(deptRisk as any[]).map((dept: any) => {
                      const avg = parseFloat(dept.avgScore) || 0;
                      const total = parseInt(dept.totalAssessed) || 0;
                      const highRisk = parseInt(dept.highRiskCount) || 0;
                      const pct = total > 0 ? Math.round((highRisk / total) * 100) : 0;
                      const riskColor = avg >= 80 ? "bg-red-500" : avg >= 50 ? "bg-orange-400" : avg >= 25 ? "bg-yellow-400" : "bg-green-400";
                      const textColor = avg >= 80 ? "text-red-700" : avg >= 50 ? "text-orange-700" : avg >= 25 ? "text-yellow-700" : "text-green-700";
                      const bgColor = avg >= 80 ? "bg-red-50" : avg >= 50 ? "bg-orange-50" : avg >= 25 ? "bg-yellow-50" : "bg-green-50";
                      return (
                        <div key={dept.departmentId} className={`flex items-center gap-3 p-2 rounded-lg ${bgColor}`}>
                          <div className="w-36 text-xs font-medium truncate" title={dept.departmentName}>{dept.departmentName || "Sin departamento"}</div>
                          <div className="flex-1 bg-gray-200 rounded-full h-3 overflow-hidden">
                            <div className={`h-3 rounded-full transition-all ${riskColor}`} style={{ width: `${Math.min((avg / 140) * 100, 100)}%` }} />
                          </div>
                          <div className="w-16 text-right">
                            <span className={`text-xs font-bold ${textColor}`}>{avg.toFixed(1)}</span>
                            <span className="text-xs text-muted-foreground">/140</span>
                          </div>
                          <div className="w-20 text-right text-xs">
                            {total > 0 ? (
                              <span className={highRisk > 0 ? "text-red-600 font-semibold" : "text-muted-foreground"}>
                                {highRisk > 0 ? `⚠ ${pct}% riesgo` : `${total} eval.`}
                              </span>
                            ) : <span className="text-gray-400">Sin datos</span>}
                          </div>
                        </div>
                      );
                    })}
                    <div className="flex flex-wrap items-center gap-4 pt-2 text-xs text-muted-foreground border-t">
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-green-400 inline-block" /> Bajo (0–24)</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-400 inline-block" /> Medio (25–49)</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-400 inline-block" /> Alto (50–79)</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-red-500 inline-block" /> Muy alto (80+)</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Dashboard comparativo psicométrico: mes actual vs. mes anterior */}
            {riskComparison && riskComparison.comparison.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <CardTitle className="text-base flex items-center gap-2">
                        <TrendingDown className="h-4 w-4 text-indigo-600" />
                        Comparativa de Riesgo Psicométrico por Período
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-1">
                        Tendencia por departamento: <span className="font-semibold">{riskComparison.currentMonthLabel}</span> vs. <span className="font-semibold">{riskComparison.previousMonthLabel}</span>
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground print:hidden">
                      <span className="flex items-center gap-1"><ArrowUp className="h-3 w-3 text-red-500" /> Riesgo aumentó</span>
                      <span className="flex items-center gap-1"><ArrowDown className="h-3 w-3 text-green-500" /> Riesgo bajó</span>
                      <span className="flex items-center gap-1"><Minus className="h-3 w-3 text-gray-400" /> Sin cambio</span>
                      <div className="flex items-center gap-1 ml-1 border-l pl-2">
                        <span className="text-muted-foreground font-medium">Comparar con:</span>
                        <select
                          value={compareMonthsAgo}
                          onChange={e => setCompareMonthsAgo(Number(e.target.value))}
                          className="text-xs border rounded px-1.5 py-0.5 bg-background text-foreground h-6 cursor-pointer"
                          title="Seleccionar período histórico a comparar contra el mes actual"
                        >
                          <option value={1}>Mes anterior</option>
                          <option value={2}>Hace 2 meses</option>
                          <option value={3}>Hace 3 meses</option>
                          <option value={6}>Hace 6 meses</option>
                          <option value={12}>Hace 12 meses</option>
                        </select>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs border-green-600 text-green-700 hover:bg-green-50"
                        onClick={exportRiskComparisonToExcel}
                        title="Exportar comparativa a Excel para auditoría STPS"
                      >
                        <FileSpreadsheet className="h-3.5 w-3.5 mr-1" />Excel STPS
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-xs text-muted-foreground">
                          <th className="text-left py-2 pr-4 font-medium">Departamento</th>
                          <th className="text-right py-2 px-3 font-medium">{riskComparison.previousMonthLabel}</th>
                          <th className="text-right py-2 px-3 font-medium">{riskComparison.currentMonthLabel}</th>
                          <th className="text-right py-2 px-3 font-medium">Δ Puntaje</th>
                          <th className="text-right py-2 px-3 font-medium">Alto Riesgo</th>
                          <th className="text-center py-2 pl-3 font-medium">Tendencia</th>
                        </tr>
                      </thead>
                      <tbody>
                        {riskComparison.comparison.map((row: any) => {
                          const currAvg = row.current.avgScore;
                          const prevAvg = row.previous.avgScore;
                          const riskColor = currAvg >= 80 ? "text-red-700" : currAvg >= 50 ? "text-orange-600" : currAvg >= 25 ? "text-yellow-600" : "text-green-600";
                          const deltaColor = row.deltaScore > 2 ? "text-red-600" : row.deltaScore < -2 ? "text-green-600" : "text-gray-500";
                          const deltaHighRiskColor = row.deltaHighRisk > 0 ? "text-red-600" : row.deltaHighRisk < 0 ? "text-green-600" : "text-gray-500";
                          return (
                            <tr key={row.departmentId} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                              <td className="py-2 pr-4">
                                <span className="font-medium truncate block max-w-[160px]" title={row.departmentName}>{row.departmentName}</span>
                                <span className="text-xs text-muted-foreground">{row.current.totalAssessed} eval. actuales</span>
                              </td>
                              <td className="text-right py-2 px-3">
                                <span className="text-muted-foreground">{prevAvg > 0 ? prevAvg.toFixed(1) : "—"}</span>
                                {prevAvg > 0 && <span className="text-xs text-muted-foreground">/140</span>}
                              </td>
                              <td className="text-right py-2 px-3">
                                <span className={`font-semibold ${riskColor}`}>{currAvg > 0 ? currAvg.toFixed(1) : "—"}</span>
                                {currAvg > 0 && <span className="text-xs text-muted-foreground">/140</span>}
                              </td>
                              <td className="text-right py-2 px-3">
                                <span className={`font-semibold ${deltaColor}`}>
                                  {row.deltaScore > 0 ? "+" : ""}{row.deltaScore !== 0 ? row.deltaScore.toFixed(1) : "—"}
                                </span>
                              </td>
                              <td className="text-right py-2 px-3">
                                <span className={`font-semibold ${deltaHighRiskColor}`}>
                                  {row.current.highRiskCount > 0 ? (
                                    <>
                                      {row.current.highRiskCount}
                                      {row.deltaHighRisk !== 0 && (
                                        <span className="text-xs ml-1">({row.deltaHighRisk > 0 ? "+" : ""}{row.deltaHighRisk})</span>
                                      )}
                                    </>
                                  ) : <span className="text-muted-foreground">0</span>}
                                </span>
                              </td>
                              <td className="text-center py-2 pl-3">
                                {row.trend === "up" ? (
                                  <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                                    <ArrowUp className="h-3 w-3" />Sube
                                  </span>
                                ) : row.trend === "down" ? (
                                  <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                                    <ArrowDown className="h-3 w-3" />Baja
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                                    <Minus className="h-3 w-3" />Estable
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 border-t pt-2">
                     Δ Puntaje: diferencia de puntaje promedio NOM-035 (escala 0–140). Valores positivos indican mayor riesgo psicosocial. Umbral de tendencia: ±2 puntos.
                   </p>
                   {/* Grouped bar chart */}
                   <div className="mt-4 border-t pt-4">
                     <p className="text-xs font-semibold text-muted-foreground mb-3">Gráfica comparativa por departamento</p>
                     <div style={{ height: 260 }}>
                       <RiskComparisonChart data={riskComparison} />
                     </div>
                   </div>
                 </CardContent>
               </Card>
             )}

            {/* Print footer */}
            <div className="hidden print:block border-t pt-4 mt-6 text-xs text-gray-500">
              <p>Plataforma de Capacitación NOM-035 STPS 2018 — Reporte generado el {new Date().toLocaleString("es-MX")}</p>
              <p className="mt-1">Documento confidencial — uso exclusivo para auditoría interna y cumplimiento STPS.</p>
            </div>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
