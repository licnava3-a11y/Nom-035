import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Briefcase, AlertTriangle, TrendingUp, Plus, FileText,
  Search, ArrowUpDown, Users, ArrowUp, ArrowDown, X,
  ChevronUp, ChevronDown, LayoutGrid, Table2, Download,
  ChevronUpSquare, ChevronDownSquare
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { JobAnalysisDialog } from "@/components/JobAnalysisDialog";
import { Breadcrumb } from "@/components/Breadcrumb";
import Chart from "chart.js/auto";

type SortKey = "employees_desc" | "employees_asc" | "risk" | "name";
type RiskFilter = "all" | "bajo" | "medio" | "alto";
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
function EmployeesBarChart({ positions }: { positions: any[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    if (chartRef.current) chartRef.current.destroy();

    const sorted = [...positions].sort((a, b) => b.employees - a.employees).slice(0, 15);

    chartRef.current = new Chart(canvasRef.current, {
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

    return () => { chartRef.current?.destroy(); };
  }, [positions]);

  const chartHeight = Math.max(180, Math.min(positions.length, 15) * 36 + 40);

  return (
    <div style={{ height: chartHeight }}>
      <canvas ref={canvasRef} />
    </div>
  );
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
        factors: { workload: 2, control: 3, leadership: 3, relationships: 3, workEnvironment: 3 },
      }))
    : examplePositions;

  // ── Filtrado ─────────────────────────────────────────────────────────────────
  const filteredPositions = rawPositions.filter((p: any) => {
    const matchSearch =
      searchQuery === "" ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.department.toLowerCase().includes(searchQuery.toLowerCase());
    const matchRisk = filterRisk === "all" || p.riskLevel === filterRisk;
    return matchSearch && matchRisk;
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
    setSortBy("employees_desc");
  };

  const hasActiveFilters = searchQuery !== "" || filterRisk !== "all";

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
        </CardHeader>
        {showChart && (
          <CardContent className="pt-0">
            <EmployeesBarChart positions={displayPositions} />
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
                    <Button variant="outline" size="sm">Ver Detalles</Button>
                    <Button variant="outline" size="sm">Actualizar Análisis</Button>
                    <Button variant="outline" size="sm">Descargar Reporte</Button>
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
                      <td colSpan={3} />
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
    </div>
  );
}
