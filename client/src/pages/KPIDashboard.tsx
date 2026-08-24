import { useState } from "react";
import { loadXlsx } from "@/lib/loadXlsx";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Building2,
  FileDown,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  FileText,
  Printer,
} from "lucide-react";
import { toast } from "sonner";
import {
  Users,
  BookOpen,
  Calendar,
  AlertTriangle,
  Mail,
  Brain,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
  BarChart3,
  UserCheck,
  UserX,
  Activity,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";

// ─── Colores de la paleta ─────────────────────────────────────────────────────
const COLORS = {
  primary: "#3b82f6",
  success: "#22c55e",
  warning: "#f59e0b",
  danger: "#ef4444",
  purple: "#8b5cf6",
  cyan: "#06b6d4",
  slate: "#64748b",
};

// ─── Componente: tarjeta KPI ──────────────────────────────────────────────────
function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  trend,
  trendLabel,
}: {
  title: string;
  value: string | number;
  subtitle?: string | React.ReactNode;
  icon: React.ElementType;
  color: string;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
}) {
  const TrendIcon =
    trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor =
    trend === "up"
      ? "text-emerald-600"
      : trend === "down"
        ? "text-red-500"
        : "text-slate-400";

  return (
    <Card className="border-slate-200 hover:shadow-md transition-shadow">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide truncate">
              {title}
            </p>
            <p className="text-3xl font-bold mt-1" style={{ color }}>
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-slate-400 mt-0.5 truncate">
                {subtitle}
              </p>
            )}
            {trendLabel && (
              <div
                className={`flex items-center gap-1 mt-2 text-xs font-medium ${trendColor}`}
              >
                <TrendIcon className="w-3 h-3" />
                {trendLabel}
              </div>
            )}
          </div>
          <div
            className="ml-3 p-2.5 rounded-xl flex-shrink-0"
            style={{ background: `${color}18` }}
          >
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Tooltip personalizado ────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-lg shadow-lg p-3 text-sm">
      <p className="font-semibold text-slate-700 mb-2">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full inline-block"
            style={{ background: p.color }}
          />
          <span className="text-slate-600">{p.name}:</span>
          <span className="font-semibold text-slate-900">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function KPIDashboard() {
  const [trendMonths, setTrendMonths] = useState(6);
  const [selectedDeptId, setSelectedDeptId] = useState<number | undefined>(
    undefined
  );
  const [selectedBranchId, setSelectedBranchId] = useState<number | undefined>(
    undefined
  );
  const [comparativaYear, setComparativaYear] = useState<number | undefined>(
    undefined
  );
  const [sortKey, setSortKey] = useState<string>("deptName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [heatmapBranchId, setHeatmapBranchId] = useState<number | undefined>(
    undefined
  );

  function handleSort(key: string) {
    if (sortKey === key) setSortDir(d => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function SortIcon({ col }: { col: string }) {
    if (sortKey !== col)
      return <ChevronsUpDown className="w-3 h-3 ml-1 opacity-50 inline" />;
    return sortDir === "asc" ? (
      <ChevronUp className="w-3 h-3 ml-1 inline" />
    ) : (
      <ChevronDown className="w-3 h-3 ml-1 inline" />
    );
  }

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const { data: deptList } = trpc.departments.list.useQuery(
    { page: 1, pageSize: 100, isActive: true },
    { retry: false }
  );

  const { data: branchList } = trpc.branches.list.useQuery(undefined, {
    retry: false,
  });

  const {
    data: kpis,
    isLoading: loadingKPIs,
    refetch: refetchKPIs,
  } = trpc.executiveReport.getKPIs.useQuery(
    { departmentId: selectedDeptId, branchId: selectedBranchId },
    { retry: false }
  );

  const { data: trends, isLoading: loadingTrends } =
    trpc.executiveReport.getTrends.useQuery(
      { months: trendMonths },
      { retry: false }
    );

  const { data: comparativaDepts, isLoading: loadingComparativa } =
    trpc.executiveReport.getComparativaDepts.useQuery(
      { year: comparativaYear },
      { retry: false }
    );
  const { data: heatmapDepts, isLoading: loadingHeatmap } =
    trpc.executiveReport.getComparativaDepts.useQuery(
      { year: undefined },
      { retry: false }
    );

  const isLoading = loadingKPIs || loadingTrends;
  const sortedDepts = comparativaDepts
    ? [...comparativaDepts].sort((a, b) => {
        const dir = sortDir === "asc" ? 1 : -1;
        const av = (a as any)[sortKey];
        const bv = (b as any)[sortKey];
        if (typeof av === "string") return av.localeCompare(bv) * dir;
        return ((av ?? 0) - (bv ?? 0)) * dir;
      })
    : [];

  // ── Exportar comparativa a Excel ─────────────────────────────────────────────
  async function exportComparativaXLSX() {
    if (!comparativaDepts || comparativaDepts.length === 0) return;
    const XLSX = await loadXlsx();

    const now = new Date();
    const fechaStr = now
      .toLocaleDateString("es-MX", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      })
      .replace(/\//g, "-");

    // Hoja 1: Datos por departamento
    const rows = comparativaDepts.map(d => ({
      Departamento: d.deptName,
      "Total Empleados": d.totalEmployees,
      "Rotación %": d.turnoverRate,
      "% Personal Capacitado": d.trainingRate,
      "Puntaje NOM-035": d.nom035Score,
      "Vacaciones Pendientes": d.pendingVacations,
      "Riesgo Psicométrico Alto": d.highRiskPsycho,
    }));

    // Fila de promedios
    const n = comparativaDepts.length;
    rows.push({
      Departamento: "PROMEDIO GENERAL",
      "Total Empleados": Math.round(
        comparativaDepts.reduce((s, d) => s + d.totalEmployees, 0) / n
      ),
      "Rotación %": Math.round(
        comparativaDepts.reduce((s, d) => s + d.turnoverRate, 0) / n
      ),
      "% Personal Capacitado": Math.round(
        comparativaDepts.reduce((s, d) => s + d.trainingRate, 0) / n
      ),
      "Puntaje NOM-035": Math.round(
        comparativaDepts.reduce((s, d) => s + d.nom035Score, 0) / n
      ),
      "Vacaciones Pendientes": comparativaDepts.reduce(
        (s, d) => s + d.pendingVacations,
        0
      ),
      "Riesgo Psicométrico Alto": comparativaDepts.reduce(
        (s, d) => s + d.highRiskPsycho,
        0
      ),
    });

    const ws1 = XLSX.utils.json_to_sheet(rows);
    ws1["!cols"] = [
      { wch: 30 },
      { wch: 16 },
      { wch: 12 },
      { wch: 22 },
      { wch: 18 },
      { wch: 22 },
      { wch: 24 },
    ];

    // Hoja 2: Referencia NOM-035
    const ref = [
      {
        Indicador: "Rotación %",
        "Nivel Bajo": "< 8%",
        "Nivel Medio": "8% – 15%",
        "Nivel Alto": "> 15%",
        Referencia: "NOM-035-STPS-2018",
      },
      {
        Indicador: "% Personal Capacitado",
        "Nivel Bajo": "< 50%",
        "Nivel Medio": "50% – 80%",
        "Nivel Alto": "> 80%",
        Referencia: "NOM-035-STPS-2018",
      },
      {
        Indicador: "Puntaje NOM-035",
        "Nivel Bajo": "< 60",
        "Nivel Medio": "60 – 80",
        "Nivel Alto": "> 80",
        Referencia: "NOM-035-STPS-2018",
      },
      {
        Indicador: "Riesgo Psicométrico",
        "Nivel Bajo": "0",
        "Nivel Medio": "1 – 3",
        "Nivel Alto": "> 3",
        Referencia: "NOM-035-STPS-2018",
      },
    ];
    const ws2 = XLSX.utils.json_to_sheet(ref);
    ws2["!cols"] = [
      { wch: 28 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 22 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, "Comparativa Departamentos");
    XLSX.utils.book_append_sheet(wb, ws2, "Referencia NOM-035");
    XLSX.writeFile(wb, `Comparativa_Departamentos_${fechaStr}.xlsx`);
  }

  // ── Preparar datos de tendencia para Recharts ─────────────────────────────
  const trendData =
    trends?.labels?.map((label: string, i: number) => ({
      mes: label,
      label,
      casos: trends.cases?.[i] ?? 0,
      capacitacion: trends.trainingCompletions?.[i] ?? 0,
      salidas: trends.employeeExits?.[i] ?? 0,
      psicometria: trends.psychometricAssessments?.[i] ?? 0,
      mensajes: trends.mailboxMessages?.[i] ?? 0,
    })) ?? [];

  return (
    <DashboardLayout>
      <div className="p-6 max-w-7xl mx-auto space-y-6">
        {/* ── Encabezado ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-blue-600" />
              Panel de KPIs Ejecutivos
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Métricas clave de talento, capacitación, bienestar y cumplimiento
              NOM-035.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Selector de sucursal */}
            <div className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-slate-500" />
              <Select
                value={
                  selectedBranchId !== undefined
                    ? String(selectedBranchId)
                    : "all"
                }
                onValueChange={val =>
                  setSelectedBranchId(val === "all" ? undefined : Number(val))
                }
              >
                <SelectTrigger className="w-44 h-8 text-xs">
                  <SelectValue placeholder="Todas las sucursales" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las sucursales</SelectItem>
                  {branchList?.map((b: { id: number; name: string }) => (
                    <SelectItem key={b.id} value={String(b.id)}>
                      {b.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Selector de departamento */}
            <div className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-slate-500" />
              <Select
                value={
                  selectedDeptId !== undefined ? String(selectedDeptId) : "all"
                }
                onValueChange={val =>
                  setSelectedDeptId(val === "all" ? undefined : Number(val))
                }
              >
                <SelectTrigger className="w-52 h-8 text-xs">
                  <SelectValue placeholder="Todos los departamentos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los departamentos</SelectItem>
                  {deptList?.data?.map((d: { id: number; name: string }) => (
                    <SelectItem key={d.id} value={String(d.id)}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {selectedBranchId !== undefined && branchList && (
              <Badge className="text-xs bg-emerald-100 text-emerald-800 border-emerald-300">
                <Building2 className="w-3 h-3 mr-1" />
                {branchList.find(
                  (b: { id: number }) => b.id === selectedBranchId
                )?.name ?? "Sucursal"}
              </Badge>
            )}
            {kpis?.departmentFilter && (
              <Badge className="text-xs bg-blue-100 text-blue-800 border-blue-300">
                <Building2 className="w-3 h-3 mr-1" />
                {kpis.departmentFilter.name}
              </Badge>
            )}
            <Badge
              variant="outline"
              className="text-xs border-blue-300 text-blue-700 bg-blue-50"
            >
              Tiempo real
            </Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={() => refetchKPIs()}
              className="gap-1.5"
              disabled={isLoading}
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`}
              />
              Actualizar
            </Button>
          </div>
        </div>

        {/* ── Skeleton / Loading ── */}
        {isLoading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="border-slate-200 animate-pulse">
                <CardContent className="pt-5 pb-4">
                  <div className="h-3 bg-slate-100 rounded w-2/3 mb-3" />
                  <div className="h-8 bg-slate-100 rounded w-1/2 mb-2" />
                  <div className="h-2 bg-slate-100 rounded w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* ── Grid de KPIs ── */}
        {!isLoading && kpis && (
          <>
            {/* Sección: Personal */}
            <div>
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Users className="w-3.5 h-3.5" /> Personal
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPICard
                  title="Total Empleados"
                  value={kpis.employees.total}
                  subtitle={`${kpis.employees.active} activos · ${kpis.employees.inactive} inactivos`}
                  icon={Users}
                  color={COLORS.primary}
                />
                <KPICard
                  title="Empleados Activos"
                  value={kpis.employees.active}
                  subtitle={`${Math.round((kpis.employees.active / Math.max(kpis.employees.total, 1)) * 100)}% de la plantilla`}
                  icon={UserCheck}
                  color={COLORS.success}
                  trend="neutral"
                />
                <KPICard
                  title="Empleados Inactivos"
                  value={kpis.employees.inactive}
                  icon={UserX}
                  color={COLORS.slate}
                />
                <KPICard
                  title="Índice de Rotación"
                  value={`${kpis.employees.turnoverRate ?? 0}%`}
                  subtitle={
                    <span className="flex items-center gap-1.5 flex-wrap">
                      <span>12 meses</span>
                      {(kpis.employees as any).turnoverChange !== undefined && (
                        <span
                          className={`inline-flex items-center gap-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                            (kpis.employees as any).turnoverChange > 0
                              ? "bg-red-100 text-red-700"
                              : (kpis.employees as any).turnoverChange < 0
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {(kpis.employees as any).turnoverChange > 0
                            ? "▲"
                            : (kpis.employees as any).turnoverChange < 0
                              ? "▼"
                              : "—"}
                          {Math.abs((kpis.employees as any).turnoverChange)}% vs
                          año ant.
                        </span>
                      )}
                    </span>
                  }
                  icon={Activity}
                  color={
                    kpis.employees.turnoverRate > 15
                      ? COLORS.danger
                      : kpis.employees.turnoverRate > 8
                        ? COLORS.warning
                        : COLORS.success
                  }
                  trend={
                    kpis.employees.turnoverRate > 15
                      ? "up"
                      : kpis.employees.turnoverRate > 8
                        ? "neutral"
                        : "down"
                  }
                  trendLabel={
                    kpis.employees.turnoverRate > 15
                      ? "Rotación alta"
                      : kpis.employees.turnoverRate > 8
                        ? "Rotación moderada"
                        : "Rotación baja"
                  }
                />
              </div>
            </div>

            {/* Sección: Capacitación */}
            <div>
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <BookOpen className="w-3.5 h-3.5" /> Capacitación
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPICard
                  title="Cursos Activos"
                  value={kpis.training.totalCourses}
                  icon={BookOpen}
                  color={COLORS.purple}
                />
                <KPICard
                  title="Asignaciones Totales"
                  value={kpis.training.totalAssignments}
                  subtitle={`${kpis.training.completedAssignments} completadas`}
                  icon={BookOpen}
                  color={COLORS.primary}
                />
                <KPICard
                  title="% Personal Capacitado"
                  value={`${kpis.training.completionRate}%`}
                  subtitle="Tasa de completación"
                  icon={TrendingUp}
                  color={
                    kpis.training.completionRate >= 80
                      ? COLORS.success
                      : kpis.training.completionRate >= 50
                        ? COLORS.warning
                        : COLORS.danger
                  }
                  trend={
                    kpis.training.completionRate >= 80
                      ? "up"
                      : kpis.training.completionRate >= 50
                        ? "neutral"
                        : "down"
                  }
                  trendLabel={
                    kpis.training.completionRate >= 80
                      ? "Meta alcanzada"
                      : "Por debajo de meta"
                  }
                />
                <KPICard
                  title="Vacaciones Pendientes"
                  value={kpis.vacations.pending}
                  subtitle={`${kpis.vacations.approved} aprobadas`}
                  icon={Calendar}
                  color={
                    kpis.vacations.pending > 10
                      ? COLORS.warning
                      : COLORS.success
                  }
                />
              </div>
            </div>

            {/* Sección: Bienestar y Cumplimiento */}
            <div>
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Brain className="w-3.5 h-3.5" /> Bienestar y Cumplimiento
                NOM-035
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPICard
                  title="Casos NOM-035"
                  value={kpis.cases.total}
                  subtitle={`${kpis.cases.open} abiertos`}
                  icon={AlertTriangle}
                  color={
                    kpis.cases.open > 5
                      ? COLORS.danger
                      : kpis.cases.open > 2
                        ? COLORS.warning
                        : COLORS.success
                  }
                  trend={kpis.cases.open > 5 ? "up" : "neutral"}
                  trendLabel={
                    kpis.cases.open > 0
                      ? `${kpis.cases.open} requieren atención`
                      : "Sin casos pendientes"
                  }
                />
                <KPICard
                  title="Casos de Alto Riesgo"
                  value={kpis.cases.highRisk}
                  subtitle="Prioridad alta/crítica"
                  icon={AlertTriangle}
                  color={
                    kpis.cases.highRisk > 0 ? COLORS.danger : COLORS.success
                  }
                  trend={kpis.cases.highRisk > 0 ? "up" : "neutral"}
                />
                <KPICard
                  title="Riesgo Psicométrico Alto"
                  value={kpis.psychometric.highRisk}
                  subtitle={`de ${kpis.psychometric.total} evaluados`}
                  icon={Brain}
                  color={
                    kpis.psychometric.highRisk > 0
                      ? COLORS.warning
                      : COLORS.success
                  }
                />
                <KPICard
                  title="Mensajes Pendientes"
                  value={kpis.mailbox.pending}
                  subtitle={`de ${kpis.mailbox.total} totales`}
                  icon={Mail}
                  color={
                    kpis.mailbox.pending > 20 ? COLORS.warning : COLORS.success
                  }
                />
              </div>
            </div>
          </>
        )}

        {/* ── Gráficas de Tendencia ── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <TrendingUp className="w-3.5 h-3.5" /> Tendencias Históricas
            </h2>
            <div className="flex gap-1">
              {[3, 6, 12].map(m => (
                <button
                  key={m}
                  onClick={() => setTrendMonths(m)}
                  className={`px-3 py-1 text-xs rounded-full font-medium transition-colors ${
                    trendMonths === m
                      ? "bg-blue-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {m} meses
                </button>
              ))}
            </div>
          </div>

          {trendData.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Gráfica 1: Casos NOM-035 y Capacitación */}
              <Card className="border-slate-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-700">
                    Casos NOM-035 vs. Capacitaciones Completadas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div style={{ height: 240 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={trendData}
                        margin={{ top: 8, right: 16, left: -10, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis
                          dataKey="mes"
                          tick={{ fontSize: 11, fill: "#94a3b8" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: "#94a3b8" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Line
                          type="monotone"
                          dataKey="casos"
                          name="Casos NOM-035"
                          stroke={COLORS.danger}
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          activeDot={{ r: 5 }}
                        />
                        <Line
                          type="monotone"
                          dataKey="capacitacion"
                          name="Capacitaciones"
                          stroke={COLORS.success}
                          strokeWidth={2}
                          dot={{ r: 3 }}
                          activeDot={{ r: 5 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Gráfica 2: Salidas y Psicometría */}
              <Card className="border-slate-200">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-700">
                    Salidas de Personal y Evaluaciones Psicométricas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div style={{ height: 240 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={trendData}
                        margin={{ top: 8, right: 16, left: -10, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis
                          dataKey="mes"
                          tick={{ fontSize: 11, fill: "#94a3b8" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: "#94a3b8" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar
                          dataKey="salidas"
                          name="Salidas"
                          fill={COLORS.warning}
                          radius={[3, 3, 0, 0]}
                          maxBarSize={28}
                        />
                        <Bar
                          dataKey="psicometria"
                          name="Psicometría"
                          fill={COLORS.purple}
                          radius={[3, 3, 0, 0]}
                          maxBarSize={28}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Gráfica 3: Mensajes internos (ancho completo) */}
              <Card className="border-slate-200 lg:col-span-2">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-semibold text-slate-700">
                    Actividad del Buzón Interno (mensajes por mes)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div style={{ height: 200 }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={trendData}
                        margin={{ top: 8, right: 16, left: -10, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis
                          dataKey="mes"
                          tick={{ fontSize: 11, fill: "#94a3b8" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 11, fill: "#94a3b8" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <ReferenceLine
                          y={10}
                          stroke={COLORS.warning}
                          strokeDasharray="4 3"
                          label={{
                            value: "Umbral",
                            fontSize: 10,
                            fill: COLORS.warning,
                          }}
                        />
                        <Bar
                          dataKey="mensajes"
                          name="Mensajes"
                          fill={COLORS.cyan}
                          radius={[3, 3, 0, 0]}
                          maxBarSize={36}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="border-dashed border-slate-300">
              <CardContent className="py-10 text-center text-slate-400">
                <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">
                  Sin datos de tendencia disponibles para el período
                  seleccionado.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Tabla Comparativa de Departamentos */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              Comparativa de Departamentos
            </h2>
            <div className="flex items-center gap-2">
              <select
                value={comparativaYear ?? ""}
                onChange={e =>
                  setComparativaYear(
                    e.target.value ? Number(e.target.value) : undefined
                  )
                }
                className="text-xs border border-slate-300 rounded px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos los años</option>
                {yearOptions.map(y => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              {comparativaDepts && comparativaDepts.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={exportComparativaXLSX}
                    className="gap-1.5 border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                    XLSX
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 border-blue-600 text-blue-700 hover:bg-blue-50"
                    onClick={async () => {
                      try {
                        const {
                          Document,
                          Packer,
                          Paragraph,
                          TextRun,
                          Table,
                          TableRow,
                          TableCell,
                          WidthType,
                          HeadingLevel,
                        } = await import("docx");
                        const mc = (t: string, bold = false) =>
                          new TableCell({
                            children: [
                              new Paragraph({
                                children: [
                                  new TextRun({ text: String(t), bold }),
                                ],
                              }),
                            ],
                          });
                        const hRow = new TableRow({
                          children: [
                            "Departamento",
                            "Empleados",
                            "Rotaci\u00f3n %",
                            "% Capacitado",
                            "NOM-035",
                            "Vac. Pend.",
                            "Riesgo Alto",
                          ].map(h => mc(h, true)),
                        });
                        const dRows = (comparativaDepts ?? []).map(
                          d =>
                            new TableRow({
                              children: [
                                d.deptName,
                                String(d.totalEmployees),
                                `${d.turnoverRate}%`,
                                `${d.trainingRate}%`,
                                String(d.nom035Score),
                                String(d.pendingVacations),
                                String(d.highRiskPsycho),
                              ].map(v => mc(v)),
                            })
                        );
                        const doc = new Document({
                          sections: [
                            {
                              children: [
                                new Paragraph({
                                  text: "Comparativa de Departamentos NOM-035",
                                  heading: HeadingLevel.HEADING_1,
                                }),
                                new Paragraph({
                                  children: [
                                    new TextRun({
                                      text: `Generado: ${new Date().toLocaleString("es-MX")}`,
                                    }),
                                  ],
                                }),
                                new Paragraph({ text: "" }),
                                new Table({
                                  width: {
                                    size: 100,
                                    type: WidthType.PERCENTAGE,
                                  },
                                  rows: [hRow, ...dRows],
                                }),
                              ],
                            },
                          ],
                        });
                        const blob = await Packer.toBlob(doc);
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `comparativa-departamentos-${new Date().toISOString().slice(0, 10)}.docx`;
                        a.click();
                        URL.revokeObjectURL(url);
                        toast.success("Archivo Word generado");
                      } catch {
                        toast.error("Error al exportar a Word");
                      }
                    }}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Word
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.print()}
                    className="gap-1.5 border-slate-600 text-slate-700 hover:bg-slate-50"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    PDF
                  </Button>
                </div>
              )}
            </div>
          </div>
          {loadingComparativa ? (
            <div className="flex items-center justify-center h-24">
              <div className="animate-spin w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full" />
            </div>
          ) : comparativaDepts && comparativaDepts.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-800 text-white">
                    {(
                      [
                        {
                          key: "deptName",
                          label: "Departamento",
                          align: "left",
                        },
                        {
                          key: "totalEmployees",
                          label: "Empleados",
                          align: "center",
                        },
                        {
                          key: "turnoverRate",
                          label: "Rotación %",
                          align: "center",
                        },
                        {
                          key: "trainingRate",
                          label: "% Capacitado",
                          align: "center",
                        },
                        {
                          key: "nom035Score",
                          label: "Puntaje NOM-035",
                          align: "center",
                        },
                        {
                          key: "pendingVacations",
                          label: "Vac. Pendientes",
                          align: "center",
                        },
                        {
                          key: "highRiskPsycho",
                          label: "Riesgo Psico.",
                          align: "center",
                        },
                      ] as { key: string; label: string; align: string }[]
                    ).map(({ key, label, align }) => (
                      <th
                        key={key}
                        className={`px-4 py-2.5 font-medium cursor-pointer select-none hover:bg-slate-700 transition-colors text-${align}`}
                        onClick={() => handleSort(key)}
                      >
                        {label}
                        <SortIcon col={key} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedDepts.map((dept, idx) => {
                    const rotCls =
                      dept.turnoverRate >= 20
                        ? "text-red-600 font-bold"
                        : dept.turnoverRate >= 10
                          ? "text-amber-600 font-semibold"
                          : "text-emerald-600";
                    const capCls =
                      dept.trainingRate >= 80
                        ? "text-emerald-600 font-bold"
                        : dept.trainingRate >= 50
                          ? "text-amber-600 font-semibold"
                          : "text-red-600";
                    const nomCls =
                      dept.nom035Score >= 80
                        ? "text-emerald-600 font-bold"
                        : dept.nom035Score >= 60
                          ? "text-amber-600 font-semibold"
                          : "text-red-600";
                    return (
                      <tr
                        key={dept.deptId}
                        className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}
                      >
                        <td className="px-4 py-2.5 font-medium text-slate-800">
                          {dept.deptName}
                        </td>
                        <td className="px-4 py-2.5 text-center text-slate-600">
                          {dept.totalEmployees}
                        </td>
                        <td className={`px-4 py-2.5 text-center ${rotCls}`}>
                          {dept.turnoverRate}%
                        </td>
                        <td className={`px-4 py-2.5 text-center ${capCls}`}>
                          {dept.trainingRate}%
                        </td>
                        <td className={`px-4 py-2.5 text-center ${nomCls}`}>
                          {dept.nom035Score}
                        </td>
                        <td className="px-4 py-2.5 text-center text-slate-600">
                          {dept.pendingVacations}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          {dept.highRiskPsycho > 0 ? (
                            <span className="text-red-600 font-semibold">
                              {dept.highRiskPsycho}
                            </span>
                          ) : (
                            <span className="text-emerald-600">0</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 border-t border-slate-200 font-semibold">
                    <td className="px-4 py-2 text-slate-700">
                      Promedio general
                    </td>
                    <td className="px-4 py-2 text-center text-slate-600">
                      {Math.round(
                        comparativaDepts.reduce(
                          (s, d) => s + d.totalEmployees,
                          0
                        ) / comparativaDepts.length
                      )}
                    </td>
                    <td className="px-4 py-2 text-center text-slate-600">
                      {Math.round(
                        comparativaDepts.reduce(
                          (s, d) => s + d.turnoverRate,
                          0
                        ) / comparativaDepts.length
                      )}
                      %
                    </td>
                    <td className="px-4 py-2 text-center text-slate-600">
                      {Math.round(
                        comparativaDepts.reduce(
                          (s, d) => s + d.trainingRate,
                          0
                        ) / comparativaDepts.length
                      )}
                      %
                    </td>
                    <td className="px-4 py-2 text-center text-slate-600">
                      {Math.round(
                        comparativaDepts.reduce(
                          (s, d) => s + d.nom035Score,
                          0
                        ) / comparativaDepts.length
                      )}
                    </td>
                    <td className="px-4 py-2 text-center text-slate-600">
                      {comparativaDepts.reduce(
                        (s, d) => s + d.pendingVacations,
                        0
                      )}
                    </td>
                    <td className="px-4 py-2 text-center text-slate-600">
                      {comparativaDepts.reduce(
                        (s, d) => s + d.highRiskPsycho,
                        0
                      )}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="text-center text-slate-400 py-8 border border-dashed border-slate-300 rounded-lg">
              <p className="text-sm">
                No hay departamentos con empleados registrados.
              </p>
            </div>
          )}
        </div>

        {/* ── Mapa de Calor NOM-035 por Departamento ── */}
        <div className="mt-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-600" />
                Mapa de Calor NOM-035 por Departamento
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Semáforo de riesgo por indicador — verde = bajo, amarillo =
                medio, rojo = alto
              </p>
            </div>
            <select
              value={heatmapBranchId ?? ""}
              onChange={e =>
                setHeatmapBranchId(
                  e.target.value ? Number(e.target.value) : undefined
                )
              }
              className="text-xs border border-slate-300 rounded px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Todas las sucursales</option>
              {branchList?.map((b: { id: number; name: string }) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
          {loadingHeatmap ? (
            <div className="flex items-center justify-center h-24">
              <div className="animate-spin w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full" />
            </div>
          ) : heatmapDepts && heatmapDepts.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <div className="flex items-center gap-5 px-4 py-2 bg-slate-50 border-b border-slate-200 text-xs text-slate-600">
                <span className="font-semibold text-slate-700">Leyenda:</span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded bg-emerald-500"></span>
                  Bajo riesgo
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded bg-amber-400"></span>
                  Riesgo medio
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="inline-block w-3 h-3 rounded bg-red-500"></span>
                  Alto riesgo
                </span>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-700 text-white">
                    <th className="px-3 py-2.5 text-left font-medium">
                      Departamento
                    </th>
                    <th className="px-3 py-2.5 text-center font-medium">
                      Rotación %
                    </th>
                    <th className="px-3 py-2.5 text-center font-medium">
                      % Capacitado
                    </th>
                    <th className="px-3 py-2.5 text-center font-medium">
                      Puntaje NOM-035
                    </th>
                    <th className="px-3 py-2.5 text-center font-medium">
                      Vac. Pendientes
                    </th>
                    <th className="px-3 py-2.5 text-center font-medium">
                      Riesgo Psico.
                    </th>
                    <th className="px-3 py-2.5 text-center font-medium">
                      Nivel Global
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {heatmapDepts.map((dept, idx) => {
                    const rotRisk =
                      dept.turnoverRate >= 20
                        ? 2
                        : dept.turnoverRate >= 10
                          ? 1
                          : 0;
                    const capRisk =
                      dept.trainingRate < 50
                        ? 2
                        : dept.trainingRate < 80
                          ? 1
                          : 0;
                    const nomRisk =
                      dept.nom035Score < 60 ? 2 : dept.nom035Score < 80 ? 1 : 0;
                    const vacRisk =
                      dept.pendingVacations >= 5
                        ? 2
                        : dept.pendingVacations >= 2
                          ? 1
                          : 0;
                    const psyRisk =
                      dept.highRiskPsycho >= 3
                        ? 2
                        : dept.highRiskPsycho >= 1
                          ? 1
                          : 0;
                    const globalRisk = Math.round(
                      (rotRisk + capRisk + nomRisk + vacRisk + psyRisk) / 5
                    );
                    const cellBg = (risk: number) =>
                      risk === 2
                        ? "bg-red-100 text-red-700 font-semibold"
                        : risk === 1
                          ? "bg-amber-100 text-amber-700 font-semibold"
                          : "bg-emerald-100 text-emerald-700";
                    const globalBadge =
                      globalRisk === 2
                        ? "bg-red-500 text-white"
                        : globalRisk === 1
                          ? "bg-amber-400 text-white"
                          : "bg-emerald-500 text-white";
                    const globalLabel =
                      globalRisk === 2
                        ? "Alto"
                        : globalRisk === 1
                          ? "Medio"
                          : "Bajo";
                    return (
                      <tr
                        key={dept.deptId}
                        className={
                          idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"
                        }
                      >
                        <td
                          className="px-3 py-2 font-medium text-slate-800 max-w-[160px] truncate"
                          title={dept.deptName}
                        >
                          {dept.deptName}
                        </td>
                        <td
                          className={`px-3 py-2 text-center ${cellBg(rotRisk)}`}
                        >
                          {dept.turnoverRate}%
                        </td>
                        <td
                          className={`px-3 py-2 text-center ${cellBg(capRisk)}`}
                        >
                          {dept.trainingRate}%
                        </td>
                        <td
                          className={`px-3 py-2 text-center ${cellBg(nomRisk)}`}
                        >
                          {dept.nom035Score}
                        </td>
                        <td
                          className={`px-3 py-2 text-center ${cellBg(vacRisk)}`}
                        >
                          {dept.pendingVacations}
                        </td>
                        <td
                          className={`px-3 py-2 text-center ${cellBg(psyRisk)}`}
                        >
                          {dept.highRiskPsycho}
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${globalBadge}`}
                          >
                            {globalLabel}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center text-slate-400 py-8 border border-dashed border-slate-300 rounded-lg">
              <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">
                No hay datos de departamentos para mostrar el mapa de calor.
              </p>
            </div>
          )}
        </div>

        {/* ── Pie de página ── */}
        {kpis && (
          <p className="text-xs text-slate-400 text-right">
            Última actualización:{" "}
            {new Date(kpis.generatedAt).toLocaleString("es-MX")}
          </p>
        )}
      </div>
    </DashboardLayout>
  );
}
