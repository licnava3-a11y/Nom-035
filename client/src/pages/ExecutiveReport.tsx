import { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, Calendar, AlertTriangle, MessageSquare, ClipboardCheck, TrendingUp, Printer, BarChart2, FileSpreadsheet } from "lucide-react";

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

export default function ExecutiveReport() {
  const [trendMonths, setTrendMonths] = useState(6);
  const [chartJsLoaded, setChartJsLoaded] = useState(false);
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | undefined>(undefined);

  const { data: kpis, isLoading, refetch } = trpc.executiveReport.getKPIs.useQuery({});
  const { data: trends, isLoading: trendsLoading } = trpc.executiveReport.getTrends.useQuery({ months: trendMonths });
  const { data: deptRisk = [] } = trpc.psychometric.getRiskByDepartment.useQuery(
    selectedCompanyId !== undefined ? { companyId: selectedCompanyId } : undefined
  );
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
