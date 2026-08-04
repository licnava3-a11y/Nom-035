import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase, AlertTriangle, TrendingUp, Plus, FileText,
  Search, ArrowUpDown, Users, ArrowUp, ArrowDown, X,
  ChevronUp, ChevronDown, LayoutGrid, Table2, Download,
  ChevronUpSquare, ChevronDownSquare, ImageDown, Building2,
  Eye, RefreshCw
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { JobAnalysisDialog } from "@/components/JobAnalysisDialog";
import { JobEditDialog } from "@/components/JobEditDialog";
import { Breadcrumb } from "@/components/Breadcrumb";
import Chart from "chart.js/auto";
import { jsPDF } from "jspdf";

type SortKey = "employees_desc" | "employees_asc" | "risk" | "name";
type RiskFilter = "all" | "bajo" | "medio" | "alto";
type DeptFilter = string;
type ViewMode = "cards" | "table";

// ── Colores de riesgo ──────────────────────────────────────────────────────────
const RISK_ORDER: Record<string, number> = { alto: 0, medio: 1, bajo: 2 };

const RISK_COLORS: Record<string, string> = {
  bajo: "#16a34a",
  medio: "#d97706",
  alto: "#dc2626",
};

// ── Intensidad del badge de empleados ─────────────────────────────────────────
function employeeBadgeClass(count: number) {
  if (count >= 30) return "bg-blue-600 text-white";
  if (count >= 10) return "bg-blue-500 text-white";
  if (count >= 5)  return "bg-blue-400 text-white";
  return "bg-blue-100 text-blue-700";
}

// ── Componente gráfica de barras horizontales ─────────────────────────────────
type BarChartHandle = { downloadPng: () => void };
const EmployeesBarChart = forwardRef<BarChartHandle, { positions: any[] }>(function EmployeesBarChart({ positions }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartInst = useRef<Chart | null>(null);

  useImperativeHandle(ref, () => ({
    downloadPng() {
      if (!canvasRef.current) return;
      const link = document.createElement("a");
      link.download = `distribucion-empleados-${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvasRef.current.toDataURL("image/png");
      link.click();
    },
  }));

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartInst.current) chartInst.current.destroy();

    const sorted = [...positions].sort((a, b) => b.employees - a.employees).slice(0, 15);

    chartInst.current = new Chart(canvasRef.current, {
      type: "bar",
      data: {
        labels: sorted.map(p => p.title.length > 28 ? p.title.slice(0, 26) + "…" : p.title),
        datasets: [
          {
            label: "Empleados asignados",
            data: sorted.map(p => p.employees),
            backgroundColor: sorted.map(p => RISK_COLORS[p.riskLevel] ?? "#3b82f6"),
            borderRadius: 4,
            borderSkipped: false,
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ` ${ctx.parsed.x} empleado${ctx.parsed.x !== 1 ? "s" : ""}`,
              afterLabel: ctx => {
                const p = sorted[ctx.dataIndex];
                return `Riesgo: ${p.riskLevel.charAt(0).toUpperCase() + p.riskLevel.slice(1)}`;
              },
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: { precision: 0 },
            grid: { color: "rgba(0,0,0,0.06)" },
          },
          y: {
            ticks: { font: { size: 12 } },
            grid: { display: false },
          },
        },
      },
    });

    return () => { chartInst.current?.destroy(); };
  }, [positions]);

  const chartHeight = Math.max(180, Math.min(positions.length, 15) * 36 + 40);

  return (
    <div style={{ height: chartHeight }}>
      <canvas ref={canvasRef} />
    </div>
  );
});
// ── Componente gráfica de tendencia del historial ────────────────────────────
function HistoryTrendChart({ data }: { data: any[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartInst = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current || !data || data.length < 2) return;
    chartInst.current?.destroy();
    const sorted = [...data].sort((a, b) => new Date(a.analyzedAt).getTime() - new Date(b.analyzedAt).getTime());
    const labels = sorted.map((r) => new Date(r.analyzedAt).toLocaleDateString("es-MX", { day: "2-digit", month: "short" }));
    const values = sorted.map((r) => Number(r.riskIndex));
    const pointColors = values.map((v) => v >= 3.5 ? "#dc2626" : v >= 2.5 ? "#d97706" : "#16a34a");
    chartInst.current = new Chart(canvasRef.current, {
      type: "line",
      data: { labels, datasets: [{ label: "Índice de Riesgo", data: values, borderColor: "#6366f1", backgroundColor: "rgba(99,102,241,0.08)", pointBackgroundColor: pointColors, pointBorderColor: pointColors, pointRadius: 5, pointHoverRadius: 7, tension: 0.3, fill: true }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => ` Índice: ${ctx.parsed.y}/5` } } }, scales: { y: { min: 1, max: 5, ticks: { stepSize: 1, font: { size: 11 } }, grid: { color: "rgba(0,0,0,0.06)" } }, x: { ticks: { font: { size: 11 } }, grid: { display: false } } } },
    });
    return () => { chartInst.current?.destroy(); };
  }, [data]);

  return (<div style={{ height: 140 }}><canvas ref={canvasRef} /></div>);
}


// ── Componente principal ───────────────────────────────────────────────────────
export default function JobPositions() {
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("employees_desc");
  const [filterRisk, setFilterRisk] = useState<RiskFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("cards");
  const [showChart, setShowChart] = useState(true);
  const [filterDept, setFilterDept] = useState<DeptFilter>("all");
  const barChartRef = useRef<BarChartHandle>(null);
  // Modal de detalles del puesto
  const [selectedPosition, setSelectedPosition] = useState<any | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  // Modal de edición de puesto
  const [editOpen, setEditOpen] = useState(false);
  const [editPosition, setEditPosition] = useState<any | null>(null);
  // Historial de análisis
  const [histDateFrom, setHistDateFrom] = useState("");
  const [histDateTo, setHistDateTo] = useState("");
  const [showComparative, setShowComparative] = useState(false);
  const historyQuery = trpc.jobPositions.getHistory.useQuery(
    { positionId: selectedPosition?.id ?? 0 },
    { enabled: detailOpen && !!selectedPosition?.id }
  );
  // Historial filtrado por rango de fechas
  const filteredHistory = (historyQuery.data ?? []).filter((row: any) => {
    const d = new Date(row.analyzedAt);
    if (histDateFrom && d < new Date(histDateFrom)) return false;
    if (histDateTo && d > new Date(histDateTo + "T23:59:59")) return false;
    return true;
  });
  // Ordenamiento de tabla: columna + dirección
  const [tableSort, setTableSort] = useState<{ col: string; dir: "asc" | "desc" }>({
    col: "employees",
    dir: "desc",
  });

  const { data: jobPositions = [], refetch } = trpc.jobPositions.list.useQuery();

  // ── Datos de ejemplo ─────────────────────────────────────────────────────────
  const examplePositions = [
    { id: 1, title: "Gerente de Recursos Humanos",  department: "Recursos Humanos", employees: 3,  riskLevel: "bajo",  lastAnalysis: "2026-01-15", factors: { workload: 2, control: 3, leadership: 4, relationships: 4, workEnvironment: 3 } },
    { id: 2, title: "Operador de Producción",        department: "Producción",       employees: 45, riskLevel: "alto",  lastAnalysis: "2026-01-20", factors: { workload: 4, control: 2, leadership: 3, relationships: 3, workEnvironment: 2 } },
    { id: 3, title: "Analista de Sistemas",           department: "Tecnología",       employees: 8,  riskLevel: "medio", lastAnalysis: "2026-01-25", factors: { workload: 3, control: 3, leadership: 3, relationships: 4, workEnvironment: 3 } },
    { id: 4, title: "Supervisor de Calidad",          department: "Calidad",          employees: 12, riskLevel: "medio", lastAnalysis: "2026-02-01", factors: { workload: 3, control: 3, leadership: 3, relationships: 3, workEnvironment: 3 } },
    { id: 5, title: "Auxiliar Administrativo",        department: "Administración",   employees: 6,  riskLevel: "bajo",  lastAnalysis: "2026-02-05", factors: { workload: 2, control: 3, leadership: 3, relationships: 4, workEnvironment: 3 } },
    { id: 6, title: "Técnico de Mantenimiento",       department: "Mantenimiento",    employees: 18, riskLevel: "alto",  lastAnalysis: "2026-02-10", factors: { workload: 4, control: 2, leadership: 3, relationships: 3, workEnvironment: 2 } },
    { id: 7, title: "Coordinador de Logística",       department: "Logística",        employees: 9,  riskLevel: "medio", lastAnalysis: "2026-02-12", factors: { workload: 3, control: 3, leadership: 3, relationships: 3, workEnvironment: 3 } },
  ];

  const rawPositions = jobPositions.length > 0
    ? jobPositions.map(pos => ({
        id: pos.id,
        title: pos.positionName,
        department: pos.department || "Sin departamento",
        employees: (pos as any).employeeCount ?? 0,
        riskLevel:
          pos.riskLevel === "low" ? "bajo"
          : pos.riskLevel === "medium" ? "medio"
          : pos.riskLevel === "high" ? "alto"
          : "muy_alto",
        lastAnalysis: new Date(pos.createdAt).toISOString().split("T")[0],
        factors: (() => {
          try {
            const raw = (pos as any).factors;
            if (raw && typeof raw === "string") return JSON.parse(raw);
            if (raw && typeof raw === "object" && raw !== null) return raw;
          } catch {}
          return { workload: 2, control: 3, leadership: 3, relationships: 3, workEnvironment: 3 };
        })(),
      }))
    : examplePositions;

  // ── Filtrado ─────────────────────────────────────────────────────────────────
  // Lista de departamentos únicos
  const departments = Array.from(new Set(rawPositions.map((p: any) => p.department))).sort() as string[];

  const filteredPositions = rawPositions.filter((p: any) => {
    const matchSearch =
      searchQuery === "" ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.department.toLowerCase().includes(searchQuery.toLowerCase());
    const matchRisk = filterRisk === "all" || p.riskLevel === filterRisk;
    const matchDept = filterDept === "all" || p.department === filterDept;
    return matchSearch && matchRisk && matchDept;
  });

  // ── Ordenamiento para vista tarjetas ─────────────────────────────────────────
  const displayPositions = [...filteredPositions].sort((a: any, b: any) => {
    if (sortBy === "employees_desc") return b.employees - a.employees;
    if (sortBy === "employees_asc")  return a.employees - b.employees;
    if (sortBy === "risk")           return (RISK_ORDER[a.riskLevel] ?? 3) - (RISK_ORDER[b.riskLevel] ?? 3);
    if (sortBy === "name")           return a.title.localeCompare(b.title);
    return 0;
  });

  // ── Ordenamiento para vista tabla ────────────────────────────────────────────
  const tableSortedPositions = [...filteredPositions].sort((a: any, b: any) => {
    const dir = tableSort.dir === "asc" ? 1 : -1;
    switch (tableSort.col) {
      case "title":      return dir * a.title.localeCompare(b.title);
      case "department": return dir * a.department.localeCompare(b.department);
      case "employees":  return dir * (a.employees - b.employees);
      case "risk":       return dir * ((RISK_ORDER[a.riskLevel] ?? 3) - (RISK_ORDER[b.riskLevel] ?? 3));
      case "index":      return dir * (calcIndex(a.factors) - calcIndex(b.factors));
      default:           return 0;
    }
  });

  function calcIndex(factors: any) {
    return Math.round(((factors.workload + factors.control + factors.leadership + factors.relationships + factors.workEnvironment) / 5) * 10) / 10;
  }

  function handleTableSort(col: string) {
    setTableSort(prev => ({
      col,
      dir: prev.col === col && prev.dir === "asc" ? "desc" : "asc",
    }));
  }

  // ── Generar PDF de un puesto ──────────────────────────────────────────────────
  function generatePositionPdf(position: any) {
    try {
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const W = 210;
      const margin = 18;
      // Cabecera azul oscuro
      doc.setFillColor(15, 23, 42);
      doc.rect(0, 0, W, 28, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Reporte de Análisis de Puesto", margin, 12);
      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.text("NOM-035-STPS-2018 — Factores de Riesgo Psicosocial", margin, 20);
      doc.text(`Generado: ${new Date().toLocaleString("es-MX")}`, W - margin, 20, { align: "right" });
      // Datos del puesto
      doc.setTextColor(15, 23, 42);
      let y = 38;
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text(position.title, margin, y);
      y += 7;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 80);
      doc.text(`Departamento: ${position.department}`, margin, y); y += 6;
      doc.text(`Empleados asignados: ${position.employees}`, margin, y); y += 6;
      const riskLabel = position.riskLevel === "alto" ? "Alto" : position.riskLevel === "medio" ? "Medio" : "Bajo";
      doc.text(`Nivel de riesgo: ${riskLabel}`, margin, y); y += 6;
      doc.text(`Índice de riesgo: ${calcIndex(position.factors)}/5`, margin, y); y += 6;
      doc.text(`Último análisis: ${new Date(position.lastAnalysis).toLocaleDateString("es-MX")}`, margin, y); y += 12;
      // Factores psicosociales
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(15, 23, 42);
      doc.text("Factores de Riesgo Psicosocial", margin, y); y += 7;
      const factorList = [
        { label: "Carga de Trabajo", value: position.factors.workload },
        { label: "Control sobre el Trabajo", value: position.factors.control },
        { label: "Liderazgo", value: position.factors.leadership },
        { label: "Relaciones en el Trabajo", value: position.factors.relationships },
        { label: "Ambiente de Trabajo", value: position.factors.workEnvironment },
      ];
      const barW = 100;
      const barH = 5;
      factorList.forEach(({ label, value }) => {
        doc.setFontSize(9);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(60, 60, 60);
        doc.text(label, margin, y + 4);
        doc.setFillColor(230, 230, 230);
        doc.rect(margin + 60, y, barW, barH, "F");
        const r = value >= 4 ? 220 : value >= 3 ? 217 : 22;
        const g = value >= 4 ? 38 : value >= 3 ? 119 : 163;
        const b = value >= 4 ? 38 : value >= 3 ? 6 : 74;
        doc.setFillColor(r, g, b);
        doc.rect(margin + 60, y, (value / 5) * barW, barH, "F");
        doc.setTextColor(15, 23, 42);
        doc.setFont("helvetica", "bold");
        doc.text(`${value}/5`, margin + 60 + barW + 3, y + 4);
        y += 10;
      });
      // Pie
      y += 8;
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, y, W - margin, y);
      y += 6;
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(130, 130, 130);
      doc.text("Este reporte fue generado automáticamente por la Plataforma NOM-035 STPS 2018.", margin, y);
      const filename = `reporte-puesto-${position.title.replace(/\s+/g, "-").toLowerCase()}-${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(filename);
      toast.success(`PDF generado: ${position.title}`);
    } catch (err) {
      console.error(err);
      toast.error("Error al generar el PDF");
    }
  }

  // ── Exportar a Excel ─────────────────────────────────────────────────────────
  async function exportToExcel() {
    try {
      const XLSX = await import("xlsx");
      const rows = displayPositions.map((p: any, i: number) => ({
        "#": i + 1,
        "Puesto": p.title,
        "Departamento": p.department,
        "Empleados": p.employees,
        "Nivel de Riesgo": p.riskLevel.charAt(0).toUpperCase() + p.riskLevel.slice(1),
        "Índice de Riesgo": calcIndex(p.factors),
        "Carga de Trabajo": p.factors.workload,
        "Control": p.factors.control,
        "Liderazgo": p.factors.leadership,
        "Relaciones": p.factors.relationships,
        "Ambiente": p.factors.workEnvironment,
        "Último Análisis": new Date(p.lastAnalysis).toLocaleDateString("es-MX"),
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      // Ancho de columnas
      ws["!cols"] = [
        { wch: 4 }, { wch: 35 }, { wch: 22 }, { wch: 12 },
        { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 10 },
        { wch: 12 }, { wch: 12 }, { wch: 10 }, { wch: 18 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Puestos de Trabajo");

      // Hoja de resumen
      const summary = [
        { "Indicador": "Total de puestos",         "Valor": displayPositions.length },
        { "Indicador": "Total de empleados",        "Valor": displayPositions.reduce((s: number, p: any) => s + p.employees, 0) },
        { "Indicador": "Puestos con riesgo alto",   "Valor": displayPositions.filter((p: any) => p.riskLevel === "alto").length },
        { "Indicador": "Puestos con riesgo medio",  "Valor": displayPositions.filter((p: any) => p.riskLevel === "medio").length },
        { "Indicador": "Puestos con riesgo bajo",   "Valor": displayPositions.filter((p: any) => p.riskLevel === "bajo").length },
        { "Indicador": "Filtro de búsqueda activo", "Valor": searchQuery || "(ninguno)" },
        { "Indicador": "Filtro de riesgo activo",   "Valor": filterRisk === "all" ? "Todos" : filterRisk },
        { "Indicador": "Fecha de exportación",      "Valor": new Date().toLocaleString("es-MX") },
      ];
      const ws2 = XLSX.utils.json_to_sheet(summary);
      ws2["!cols"] = [{ wch: 30 }, { wch: 20 }];
      XLSX.utils.book_append_sheet(wb, ws2, "Resumen");

      XLSX.writeFile(wb, `puestos-trabajo-${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success(`Exportados ${rows.length} puestos a Excel`);
    } catch {
      toast.error("Error al generar el archivo Excel");
    }
  }

  // ── Helpers de UI ─────────────────────────────────────────────────────────────
  const toggleEmployeeSort = () =>
    setSortBy(prev => prev === "employees_desc" ? "employees_asc" : "employees_desc");

  const clearFilters = () => {
    setSearchQuery("");
    setFilterRisk("all");
    setFilterDept("all");
    setSortBy("employees_desc");
  };

  const hasActiveFilters = searchQuery !== "" || filterRisk !== "all" || filterDept !== "all";

  const getRiskBadge = (level: string) => {
    switch (level) {
      case "bajo":  return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Riesgo Bajo</Badge>;
      case "medio": return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Riesgo Medio</Badge>;
      case "alto":  return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">Riesgo Alto</Badge>;
      default:      return null;
    }
  };

  const sortLabel: Record<SortKey, { icon: React.ReactNode; text: string }> = {
    employees_desc: { icon: <ArrowDown className="h-3.5 w-3.5" />, text: "Más empleados primero" },
    employees_asc:  { icon: <ArrowUp className="h-3.5 w-3.5" />,   text: "Menos empleados primero" },
    risk:           { icon: <AlertTriangle className="h-3.5 w-3.5" />, text: "Mayor riesgo primero" },
    name:           { icon: <ArrowUpDown className="h-3.5 w-3.5" />,   text: "Nombre A-Z" },
  };

  // ── Cabecera de columna ordenable (tabla) ─────────────────────────────────────
  function SortableHeader({ col, label }: { col: string; label: string }) {
    const active = tableSort.col === col;
    return (
      <th
        className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer select-none hover:text-foreground transition-colors whitespace-nowrap"
        onClick={() => handleTableSort(col)}
      >
        <span className="inline-flex items-center gap-1">
          {label}
          {active ? (
            tableSort.dir === "asc"
              ? <ChevronUp className="h-3.5 w-3.5 text-primary" />
              : <ChevronDown className="h-3.5 w-3.5 text-primary" />
          ) : (
            <ArrowUpDown className="h-3 w-3 opacity-40" />
          )}
        </span>
      </th>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <Breadcrumb items={[{ label: "Gestión de Talento", href: "/" }, { label: "Puestos" }]} />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Análisis de Puestos</h1>
          <p className="text-muted-foreground mt-1">
            Evaluación de factores de riesgo psicosocial por puesto de trabajo
          </p>
        </div>
        <div className="flex items-center gap-2">
          {(user?.role === "admin" || user?.role === "instructor") && (
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Análisis
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Puestos Analizados</CardTitle>
            <Briefcase className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{displayPositions.length}</div>
            <p className="text-xs text-muted-foreground">Total de puestos</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Riesgo Alto</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">
              {displayPositions.filter((p: any) => p.riskLevel === "alto").length}
            </div>
            <p className="text-xs text-muted-foreground">Requieren atención</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Empleados</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {displayPositions.reduce((acc: number, p: any) => acc + p.employees, 0)}
            </div>
            <p className="text-xs text-muted-foreground">Total evaluados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Riesgo Promedio</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">2.8</div>
            <p className="text-xs text-muted-foreground">Escala de 1 a 5</p>
          </CardContent>
        </Card>
      </div>

      {/* ── Gráfica de barras horizontales ── */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Distribución de Empleados por Puesto</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Color indica nivel de riesgo: <span className="text-green-600 font-medium">verde = bajo</span>,{" "}
                <span className="text-yellow-600 font-medium">amarillo = medio</span>,{" "}
                <span className="text-red-600 font-medium">rojo = alto</span>
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {showChart && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => barChartRef.current?.downloadPng()}
                  title="Descargar gráfica como PNG"
                  className="text-xs"
                >
                  <ImageDown className="h-3.5 w-3.5 mr-1.5" />
                  Descargar PNG
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowChart(v => !v)}
                className="text-muted-foreground"
              >
                {showChart ? <ChevronUpSquare className="h-4 w-4" /> : <ChevronDownSquare className="h-4 w-4" />}
                <span className="ml-1 text-xs">{showChart ? "Ocultar" : "Mostrar"}</span>
              </Button>
            </div>
          </div>
        </CardHeader>
        {showChart && (
          <CardContent className="pt-0">
            <EmployeesBarChart ref={barChartRef} positions={displayPositions} />
          </CardContent>
        )}
      </Card>

      {/* ── Barra de filtros + controles de vista ── */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          {/* Búsqueda */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por puesto o departamento..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Filtro de departamento */}
          <Select value={filterDept} onValueChange={v => setFilterDept(v)}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Departamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los departamentos</SelectItem>
              {departments.map(dept => (
                <SelectItem key={dept} value={dept}>{dept}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filtro de riesgo */}
          <Select value={filterRisk} onValueChange={v => setFilterRisk(v as RiskFilter)}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Nivel de riesgo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los riesgos</SelectItem>
              <SelectItem value="bajo">Riesgo Bajo</SelectItem>
              <SelectItem value="medio">Riesgo Medio</SelectItem>
              <SelectItem value="alto">Riesgo Alto</SelectItem>
            </SelectContent>
          </Select>

          {/* Ordenamiento (solo en vista tarjetas) */}
          {viewMode === "cards" && (
            <Select value={sortBy} onValueChange={v => setSortBy(v as SortKey)}>
              <SelectTrigger className="w-56">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="employees_desc">
                  <span className="flex items-center gap-2"><Users className="h-3.5 w-3.5" />Más empleados primero</span>
                </SelectItem>
                <SelectItem value="employees_asc">
                  <span className="flex items-center gap-2"><Users className="h-3.5 w-3.5" />Menos empleados primero</span>
                </SelectItem>
                <SelectItem value="risk">
                  <span className="flex items-center gap-2"><AlertTriangle className="h-3.5 w-3.5" />Mayor riesgo primero</span>
                </SelectItem>
                <SelectItem value="name">
                  <span className="flex items-center gap-2"><ArrowUpDown className="h-3.5 w-3.5" />Nombre A-Z</span>
                </SelectItem>
              </SelectContent>
            </Select>
          )}

          {/* Toggle vista */}
          <div className="flex items-center border rounded-md overflow-hidden shrink-0">
            <button
              onClick={() => setViewMode("cards")}
              title="Vista de tarjetas"
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
                viewMode === "cards"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              <LayoutGrid className="h-3.5 w-3.5" />
              Tarjetas
            </button>
            <div className="w-px h-5 bg-border" />
            <button
              onClick={() => setViewMode("table")}
              title="Vista de tabla"
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
                viewMode === "table"
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              <Table2 className="h-3.5 w-3.5" />
              Tabla
            </button>
          </div>

          {/* Exportar Excel */}
          <Button variant="outline" size="sm" onClick={exportToExcel} className="shrink-0">
            <Download className="h-4 w-4 mr-1.5" />
            Exportar Excel
          </Button>

          {/* Limpiar filtros */}
          {(hasActiveFilters || sortBy !== "employees_desc") && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-muted-foreground hover:text-foreground shrink-0">
              <X className="h-4 w-4 mr-1" />
              Limpiar
            </Button>
          )}
        </div>

        {/* Indicador del criterio activo (solo tarjetas) + botones rápidos */}
        <div className="flex items-center gap-2 flex-wrap">
          {viewMode === "cards" && (
            <>
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium border border-primary/20">
                {sortLabel[sortBy].icon}
                <span>Ordenado por: {sortLabel[sortBy].text}</span>
              </div>
              <div className="flex items-center gap-1 border rounded-md overflow-hidden">
                <button
                  onClick={() => setSortBy("employees_desc")}
                  title="Más empleados primero"
                  className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium transition-colors ${
                    sortBy === "employees_desc"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Users className="h-3 w-3" /><ChevronDown className="h-3 w-3" />
                </button>
                <div className="w-px h-5 bg-border" />
                <button
                  onClick={() => setSortBy("employees_asc")}
                  title="Menos empleados primero"
                  className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium transition-colors ${
                    sortBy === "employees_asc"
                      ? "bg-primary text-primary-foreground"
                      : "bg-background text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <Users className="h-3 w-3" /><ChevronUp className="h-3 w-3" />
                </button>
              </div>
            </>
          )}
          {viewMode === "table" && (
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs border">
              <Table2 className="h-3.5 w-3.5" />
              <span>Haz clic en los encabezados de columna para ordenar</span>
            </div>
          )}
          <span className="text-xs text-muted-foreground ml-auto">
            {displayPositions.length} puesto{displayPositions.length !== 1 ? "s" : ""}
            {hasActiveFilters ? " encontrado" + (displayPositions.length !== 1 ? "s" : "") : " en total"}
          </span>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════════
          VISTA TARJETAS
      ══════════════════════════════════════════════════════════════════════════ */}
      {viewMode === "cards" && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Puestos de Trabajo</h2>

          {displayPositions.length === 0 && (
            <Card>
              <CardContent className="pt-6">
                <p className="text-center text-muted-foreground">
                  No se encontraron puestos con los filtros aplicados.
                </p>
              </CardContent>
            </Card>
          )}

          {displayPositions.map((position: any, index: number) => (
            <Card key={position.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="p-2 bg-primary/10 rounded-lg mt-1 shrink-0">
                      <Briefcase className="h-6 w-6 text-primary" />
                    </div>
                    <div className="space-y-1 flex-1 min-w-0">
                      <div className="flex items-center gap-3 flex-wrap">
                        <CardTitle className="text-lg">{position.title}</CardTitle>
                        {getRiskBadge(position.riskLevel)}
                      </div>
                      <CardDescription>{position.department}</CardDescription>
                      <div className="flex items-center gap-3 mt-2 flex-wrap">
                        {/* Badge prominente de empleados */}
                        <div
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-semibold ${employeeBadgeClass(position.employees)}`}
                        >
                          <Users className="h-3.5 w-3.5" />
                          <span>{position.employees}</span>
                          <span className="font-normal opacity-90">
                            {position.employees === 1 ? "empleado" : "empleados"}
                          </span>
                        </div>
                        {(sortBy === "employees_desc" || sortBy === "employees_asc") && (
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                            #{index + 1} en ranking
                          </span>
                        )}
                        <span className="text-sm text-muted-foreground">
                          Último análisis: {new Date(position.lastAnalysis).toLocaleDateString("es-MX")}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          Índice: {calcIndex(position.factors)}/5
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={toggleEmployeeSort}
                    title="Cambiar orden por empleados"
                    className="shrink-0 ml-2 p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                  >
                    {sortBy === "employees_desc" ? (
                      <ArrowDown className="h-4 w-4" />
                    ) : sortBy === "employees_asc" ? (
                      <ArrowUp className="h-4 w-4" />
                    ) : (
                      <ArrowUpDown className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-5 gap-4">
                    {[
                      { label: "Carga de Trabajo", value: position.factors.workload },
                      { label: "Control",           value: position.factors.control },
                      { label: "Liderazgo",         value: position.factors.leadership },
                      { label: "Relaciones",        value: position.factors.relationships },
                      { label: "Ambiente",          value: position.factors.workEnvironment },
                    ].map(({ label, value }) => (
                      <div key={label} className="space-y-1">
                        <div className="text-xs text-muted-foreground">{label}</div>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className={`h-full ${value >= 4 ? "bg-red-500" : value >= 3 ? "bg-yellow-500" : "bg-green-500"}`}
                              style={{ width: `${(value / 5) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">{value}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" size="sm" onClick={() => { setSelectedPosition(position); setDetailOpen(true); }}>
                      <Eye className="h-3.5 w-3.5 mr-1" />Ver Detalles
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setDialogOpen(true)}>
                      <RefreshCw className="h-3.5 w-3.5 mr-1" />Actualizar Análisis
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => generatePositionPdf(position)}>
                      <FileText className="h-3.5 w-3.5 mr-1" />Reporte PDF
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════════════
          VISTA TABLA
      ══════════════════════════════════════════════════════════════════════════ */}
      {viewMode === "table" && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Puestos de Trabajo</CardTitle>
            <CardDescription>
              {tableSortedPositions.length} registro{tableSortedPositions.length !== 1 ? "s" : ""} — haz clic en los encabezados para ordenar
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {tableSortedPositions.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No se encontraron puestos con los filtros aplicados.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide w-8">#</th>
                      <SortableHeader col="title"      label="Puesto" />
                      <SortableHeader col="department" label="Departamento" />
                      <SortableHeader col="employees"  label="Empleados" />
                      <SortableHeader col="risk"       label="Nivel de Riesgo" />
                      <SortableHeader col="index"      label="Índice" />
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Último Análisis</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {tableSortedPositions.map((p: any, i: number) => (
                      <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-4 py-3 text-muted-foreground text-xs">{i + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Briefcase className="h-4 w-4 text-primary shrink-0" />
                            <span className="font-medium">{p.title}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{p.department}</td>
                        <td className="px-4 py-3">
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${employeeBadgeClass(p.employees)}`}>
                            <Users className="h-3 w-3" />
                            {p.employees}
                          </div>
                        </td>
                        <td className="px-4 py-3">{getRiskBadge(p.riskLevel)}</td>
                        <td className="px-4 py-3">
                          <span className={`font-semibold ${calcIndex(p.factors) >= 4 ? "text-red-600" : calcIndex(p.factors) >= 3 ? "text-yellow-600" : "text-green-600"}`}>
                            {calcIndex(p.factors)}/5
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">
                          {new Date(p.lastAnalysis).toLocaleDateString("es-MX")}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => { setSelectedPosition(p); setDetailOpen(true); }}>
                              <Eye className="h-3.5 w-3.5 mr-1" />Ver
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => generatePositionPdf(p)}>
                              <FileText className="h-3.5 w-3.5 mr-1" />PDF
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-muted/30 border-t">
                    <tr>
                      <td colSpan={3} className="px-4 py-2 text-xs font-medium text-muted-foreground">
                        Total ({tableSortedPositions.length} puestos)
                      </td>
                      <td className="px-4 py-2">
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white">
                          <Users className="h-3 w-3" />
                          {tableSortedPositions.reduce((s: number, p: any) => s + p.employees, 0)}
                        </div>
                      </td>
                      <td colSpan={4} />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Información sobre factores */}
      <Card>
        <CardHeader>
          <CardTitle>Factores de Riesgo Psicosocial</CardTitle>
          <CardDescription>Categorías evaluadas según la NOM-035-STPS-2018</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <h4 className="font-medium">Carga de Trabajo</h4>
              <p className="text-sm text-muted-foreground">Evaluación de las exigencias que el trabajo impone al trabajador y que exceden su capacidad</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Falta de Control</h4>
              <p className="text-sm text-muted-foreground">Posibilidad del trabajador para influir y tomar decisiones sobre los diversos aspectos que intervienen en su actividad</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Liderazgo Negativo</h4>
              <p className="text-sm text-muted-foreground">Tipo de relación que se establece entre el patrón o sus representantes y los trabajadores</p>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Relaciones Negativas</h4>
              <p className="text-sm text-muted-foreground">Interacción que se establece en el contexto laboral y que puede generar conflictos</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <JobAnalysisDialog open={dialogOpen} onOpenChange={setDialogOpen} onSuccess={refetch} />
      <JobEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        onSuccess={refetch}
        position={editPosition}
      />

      {/* Modal de detalles del puesto */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5 text-primary" />
              {selectedPosition?.title}
            </DialogTitle>
            <DialogDescription>{selectedPosition?.department}</DialogDescription>
          </DialogHeader>
          {selectedPosition && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Empleados asignados</p>
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-semibold ${employeeBadgeClass(selectedPosition.employees)}`}>
                    <Users className="h-3.5 w-3.5" />
                    {selectedPosition.employees} {selectedPosition.employees === 1 ? "empleado" : "empleados"}
                  </div>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Nivel de riesgo</p>
                  {getRiskBadge(selectedPosition.riskLevel)}
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Índice de riesgo</p>
                  <span className={`text-lg font-bold ${calcIndex(selectedPosition.factors) >= 4 ? "text-red-600" : calcIndex(selectedPosition.factors) >= 3 ? "text-yellow-600" : "text-green-600"}`}>
                    {calcIndex(selectedPosition.factors)}/5
                  </span>
                </div>
                <div className="bg-muted/50 rounded-lg p-3">
                  <p className="text-xs text-muted-foreground mb-1">Último análisis</p>
                  <span className="text-sm font-medium">{new Date(selectedPosition.lastAnalysis).toLocaleDateString("es-MX")}</span>
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-2">Factores de riesgo psicosocial</p>
                <div className="space-y-2">
                  {[
                    { label: "Carga de Trabajo",   value: selectedPosition.factors.workload },
                    { label: "Control",             value: selectedPosition.factors.control },
                    { label: "Liderazgo",           value: selectedPosition.factors.leadership },
                    { label: "Relaciones",          value: selectedPosition.factors.relationships },
                    { label: "Ambiente Laboral",    value: selectedPosition.factors.workEnvironment },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground w-36 shrink-0">{label}</span>
                      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                        <div
                          className={`h-full transition-all ${value >= 4 ? "bg-red-500" : value >= 3 ? "bg-yellow-500" : "bg-green-500"}`}
                          style={{ width: `${(value / 5) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-semibold w-6 text-right">{value}/5</span>
                    </div>
                  ))}
                </div>
              </div>
              {/* Historial de análisis */}
              {historyQuery.isLoading && (
                <p className="text-xs text-muted-foreground text-center py-2">Cargando historial...</p>
              )}
              {historyQuery.data && historyQuery.data.length > 0 && (
                <div className="space-y-3">
                  {/* Filtro de rango de fechas */}
                  <div className="flex flex-wrap items-center gap-2 bg-muted/30 rounded-lg p-2">
                    <span className="text-xs text-muted-foreground font-medium">Filtrar por fecha:</span>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">Desde</span>
                      <input
                        type="date"
                        value={histDateFrom}
                        onChange={(e) => setHistDateFrom(e.target.value)}
                        className="text-xs border rounded px-1.5 py-0.5 bg-background h-6"
                      />
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-muted-foreground">Hasta</span>
                      <input
                        type="date"
                        value={histDateTo}
                        onChange={(e) => setHistDateTo(e.target.value)}
                        className="text-xs border rounded px-1.5 py-0.5 bg-background h-6"
                      />
                    </div>
                    {(histDateFrom || histDateTo) && (
                      <button
                        onClick={() => { setHistDateFrom(""); setHistDateTo(""); }}
                        className="text-xs text-muted-foreground hover:text-foreground underline"
                      >Limpiar</button>
                    )}
                    <span className="ml-auto text-xs text-muted-foreground">{filteredHistory.length} de {historyQuery.data.length} registros</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Historial de análisis ({filteredHistory.length})</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 px-2"
                      onClick={() => {
                        if (!selectedPosition || !historyQuery.data) return;
                        import('xlsx').then((XLSX) => {
                          const rows = historyQuery.data.map((row: any) => ({
                            Fecha: new Date(row.analyzedAt).toLocaleDateString('es-MX'),
                            'Índice': row.riskIndex,
                            'Nivel de Riesgo': row.riskLevel === 'very_high' ? 'Muy Alto' : row.riskLevel === 'high' ? 'Alto' : row.riskLevel === 'medium' ? 'Medio' : 'Bajo',
                            Empleados: row.employeeCount,
                            Observaciones: row.notes || '',
                          }));
                          const ws = XLSX.utils.json_to_sheet(rows);
                          const wb = XLSX.utils.book_new();
                          XLSX.utils.book_append_sheet(wb, ws, 'Historial');
                          XLSX.writeFile(wb, `historial_${selectedPosition.title.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0,10)}.xlsx`);
                          toast.success('Historial exportado a Excel');
                        });
                      }}
                    >
                      <Download className="h-3 w-3 mr-1" />Excel
                    </Button>
                  </div>
                  {/* Tabla comparativa: actual vs anterior */}
                  {filteredHistory.length >= 2 && (
                    <div className="border rounded-lg p-3 bg-indigo-50/50 dark:bg-indigo-950/20">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-indigo-700 dark:text-indigo-300">Comparativa: último análisis vs anterior</p>
                        <div className="flex items-center gap-2">
                          {showComparative && (
                            <button
                              onClick={() => {
                                const sorted2 = [...filteredHistory].sort((a: any, b: any) => new Date(b.analyzedAt).getTime() - new Date(a.analyzedAt).getTime());
                                const curr2 = sorted2[0] as any;
                                const prev2 = sorted2[1] as any;
                                const fLabels: Record<string, string> = { workload: 'Carga de Trabajo', control: 'Control', leadership: 'Liderazgo', relationships: 'Relaciones', workEnvironment: 'Ambiente' };
                                const cF = (() => { try { return typeof curr2.factors === 'string' ? JSON.parse(curr2.factors) : (curr2.factors || {}); } catch { return {}; } })();
                                const pF = (() => { try { return typeof prev2.factors === 'string' ? JSON.parse(prev2.factors) : (prev2.factors || {}); } catch { return {}; } })();
                                const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
                                const W = 210; const mg = 15;
                                doc.setFillColor(30, 41, 59);
                                doc.rect(0, 0, W, 28, 'F');
                                doc.setTextColor(255, 255, 255);
                                doc.setFontSize(13);
                                doc.setFont('helvetica', 'bold');
                                doc.text('Reporte Comparativo de Factores Psicosociales', mg, 12);
                                doc.setFontSize(9);
                                doc.setFont('helvetica', 'normal');
                                doc.text(`Puesto: ${selectedPosition?.positionName || selectedPosition?.title || ''}  |  Depto: ${selectedPosition?.department || ''}`, mg, 20);
                                doc.text(`Generado: ${new Date().toLocaleString('es-MX')}`, mg, 26);
                                doc.setTextColor(30, 41, 59);
                                let y2 = 38;
                                doc.setFontSize(10); doc.setFont('helvetica', 'bold');
                                doc.text('Factor', mg, y2);
                                doc.text(new Date(prev2.analyzedAt).toLocaleDateString('es-MX'), 100, y2, { align: 'center' });
                                doc.text(new Date(curr2.analyzedAt).toLocaleDateString('es-MX'), 140, y2, { align: 'center' });
                                doc.text('Δ', 175, y2, { align: 'center' });
                                y2 += 4;
                                doc.setDrawColor(200, 200, 200);
                                doc.line(mg, y2, W - mg, y2);
                                y2 += 6;
                                doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
                                const barW = 35; const barH = 4;
                                Object.keys(fLabels).forEach((key) => {
                                  const cv = cF[key] ?? 0; const pv = pF[key] ?? 0; const dv = cv - pv;
                                  doc.setTextColor(30, 41, 59);
                                  doc.text(fLabels[key], mg, y2);
                                  doc.setFillColor(148, 163, 184);
                                  doc.rect(80, y2 - 3.5, (pv / 5) * barW, barH, 'F');
                                  doc.setFillColor(210, 210, 210);
                                  doc.rect(80 + (pv / 5) * barW, y2 - 3.5, barW - (pv / 5) * barW, barH, 'F');
                                  doc.setTextColor(30, 41, 59); doc.text(`${pv}/5`, 118, y2);
                                  const rg: [number, number, number] = cv <= 2 ? [34, 197, 94] : cv <= 3.5 ? [251, 191, 36] : [239, 68, 68];
                                  doc.setFillColor(...rg);
                                  doc.rect(120, y2 - 3.5, (cv / 5) * barW, barH, 'F');
                                  doc.setFillColor(210, 210, 210);
                                  doc.rect(120 + (cv / 5) * barW, y2 - 3.5, barW - (cv / 5) * barW, barH, 'F');
                                  doc.text(`${cv}/5`, 158, y2);
                                  if (dv > 0) doc.setTextColor(239, 68, 68);
                                  else if (dv < 0) doc.setTextColor(34, 197, 94);
                                  else doc.setTextColor(148, 163, 184);
                                  doc.text(dv > 0 ? `▲ +${dv}` : dv < 0 ? `▼ ${dv}` : '—', 175, y2, { align: 'center' });
                                  y2 += 10;
                                  doc.setDrawColor(230, 230, 230);
                                  doc.line(mg, y2 - 3, W - mg, y2 - 3);
                                });
                                y2 += 2;
                                doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(30, 41, 59);
                                doc.text('Índice Global', mg, y2);
                                doc.text(`${prev2.riskIndex}/5`, 118, y2);
                                doc.text(`${curr2.riskIndex}/5`, 158, y2);
                                const gd = Number(curr2.riskIndex) - Number(prev2.riskIndex);
                                if (gd > 0) doc.setTextColor(239, 68, 68);
                                else if (gd < 0) doc.setTextColor(34, 197, 94);
                                else doc.setTextColor(148, 163, 184);
                                doc.text(gd > 0 ? `▲ +${gd.toFixed(1)}` : gd < 0 ? `▼ ${gd.toFixed(1)}` : '—', 175, y2, { align: 'center' });
                                doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(148, 163, 184);
                                doc.text('NOM-035-STPS-2018 — Reporte generado automáticamente', mg, 285);
                                const fname = `comparativo-${(selectedPosition?.positionName || selectedPosition?.title || 'puesto').replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`;
                                doc.save(fname);
                              }}
                              className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 rounded flex items-center gap-1"
                            >
                              <Download className="h-3 w-3" /> PDF
                            </button>
                          )}
                          <button
                            onClick={() => setShowComparative((v) => !v)}
                            className="text-xs text-indigo-600 hover:text-indigo-800 underline"
                          >{showComparative ? 'Ocultar' : 'Ver comparativa'}</button>
                        </div>
                      </div>
                      {showComparative && (() => {
                        const sorted = [...filteredHistory].sort((a: any, b: any) => new Date(b.analyzedAt).getTime() - new Date(a.analyzedAt).getTime());
                        const curr = sorted[0] as any;
                        const prev = sorted[1] as any;
                        const factorLabels: Record<string, string> = { workload: 'Carga de Trabajo', control: 'Control', leadership: 'Liderazgo', relationships: 'Relaciones', workEnvironment: 'Ambiente' };
                        const currF = (() => { try { return typeof curr.factors === 'string' ? JSON.parse(curr.factors) : curr.factors; } catch { return {}; } })();
                        const prevF = (() => { try { return typeof prev.factors === 'string' ? JSON.parse(prev.factors) : prev.factors; } catch { return {}; } })();
                        return (
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="text-muted-foreground">
                                <th className="text-left py-1 font-medium">Factor</th>
                                <th className="text-center py-1 font-medium">{new Date(prev.analyzedAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}</th>
                                <th className="text-center py-1 font-medium">{new Date(curr.analyzedAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short' })}</th>
                                <th className="text-center py-1 font-medium">Δ</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Object.keys(factorLabels).map((key) => {
                                const c = currF[key] ?? 0;
                                const p = prevF[key] ?? 0;
                                const delta = c - p;
                                return (
                                  <tr key={key} className="border-t">
                                    <td className="py-1 pr-2">{factorLabels[key]}</td>
                                    <td className="text-center py-1">{p}/5</td>
                                    <td className="text-center py-1 font-semibold">{c}/5</td>
                                    <td className="text-center py-1">
                                      {delta > 0 ? (
                                        <span className="text-red-600 font-bold">▲ +{delta}</span>
                                      ) : delta < 0 ? (
                                        <span className="text-green-600 font-bold">▼ {delta}</span>
                                      ) : (
                                        <span className="text-muted-foreground">—</span>
                                      )}
                                    </td>
                                  </tr>
                                );
                              })}
                              <tr className="border-t bg-muted/30">
                                <td className="py-1 font-semibold">Índice Global</td>
                                <td className="text-center py-1">{prev.riskIndex}/5</td>
                                <td className="text-center py-1 font-bold">{curr.riskIndex}/5</td>
                                <td className="text-center py-1">
                                  {(() => { const d = Number(curr.riskIndex) - Number(prev.riskIndex); return d > 0 ? <span className="text-red-600 font-bold">▲ +{d.toFixed(1)}</span> : d < 0 ? <span className="text-green-600 font-bold">▼ {d.toFixed(1)}</span> : <span className="text-muted-foreground">—</span>; })()}
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        );
                      })()}
                    </div>
                  )}
                  {/* Gráfica de tendencia */}
                  {filteredHistory.length >= 2 && (
                    <div className="border rounded-lg p-3 bg-muted/20">
                      <p className="text-xs text-muted-foreground mb-2">Evolución del Índice de Riesgo</p>
                      <HistoryTrendChart data={filteredHistory} />
                    </div>
                  )}
                  <div className="border rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-muted/60">
                        <tr>
                          <th className="text-left px-3 py-2 font-medium">Fecha</th>
                          <th className="text-center px-3 py-2 font-medium">Índice</th>
                          <th className="text-center px-3 py-2 font-medium">Riesgo</th>
                          <th className="text-center px-3 py-2 font-medium">Empleados</th>
                          <th className="text-left px-3 py-2 font-medium">Observaciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredHistory.map((row: any) => (
                          <tr key={row.id} className="border-t hover:bg-muted/30">
                            <td className="px-3 py-2 whitespace-nowrap">{new Date(row.analyzedAt).toLocaleDateString('es-MX')}</td>
                            <td className="px-3 py-2 text-center font-semibold">{row.riskIndex}/5</td>
                            <td className="px-3 py-2 text-center">
                              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                row.riskLevel === 'high' || row.riskLevel === 'very_high' ? 'bg-red-100 text-red-700' :
                                row.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                              }`}>
                                {row.riskLevel === 'very_high' ? 'Muy Alto' : row.riskLevel === 'high' ? 'Alto' : row.riskLevel === 'medium' ? 'Medio' : 'Bajo'}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-center">{row.employeeCount}</td>
                            <td className="px-3 py-2 text-muted-foreground max-w-[120px] truncate" title={row.notes || ''}>{row.notes || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {historyQuery.data?.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">Sin análisis anteriores registrados</p>
              )}
              <div className="flex gap-2 pt-1">
                <Button className="flex-1" onClick={() => {
                  setEditPosition(selectedPosition);
                  setDetailOpen(false);
                  setEditOpen(true);
                }}>
                  <RefreshCw className="h-4 w-4 mr-1.5" />Actualizar Análisis
                </Button>
                <Button variant="outline" onClick={() => { generatePositionPdf(selectedPosition); }}>
                  <FileText className="h-4 w-4 mr-1.5" />Reporte PDF
                </Button>
                <Button variant="outline" onClick={() => setDetailOpen(false)}>Cerrar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
