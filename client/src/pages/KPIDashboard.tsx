import { useState } from "react";
import * as XLSX from "xlsx";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, FileDown } from "lucide-react";
import {
  Users, BookOpen, Calendar, AlertTriangle, Mail, Brain,
  TrendingUp, TrendingDown, Minus, RefreshCw, BarChart3,
  UserCheck, UserX, Activity,
} from "lucide-react";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine,
} from "recharts";

// ─── Colores de la paleta ─────────────────────────────────────────────────────
const COLORS = {
  primary:  "#3b82f6",
  success:  "#22c55e",
  warning:  "#f59e0b",
  danger:   "#ef4444",
  purple:   "#8b5cf6",
  cyan:     "#06b6d4",
  slate:    "#64748b",
};

// ─── Componente: tarjeta KPI ──────────────────────────────────────────────────
function KPICard({
  title, value, subtitle, icon: Icon, color, trend, trendLabel,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
  trend?: "up" | "down" | "neutral";
  trendLabel?: string;
}) {
  const TrendIcon = trend === "up" ? TrendingUp : trend === "down" ? TrendingDown : Minus;
  const trendColor =
    trend === "up" ? "text-emerald-600" :
    trend === "down" ? "text-red-500" :
    "text-slate-400";

  return (
    <Card className="border-slate-200 hover:shadow-md transition-shadow">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide truncate">{title}</p>
            <p className="text-3xl font-bold mt-1" style={{ color }}>{value}</p>
            {subtitle && <p className="text-xs text-slate-400 mt-0.5 truncate">{subtitle}</p>}
            {trendLabel && (
              <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trendColor}`}>
                <TrendIcon className="w-3 h-3" />
                {trendLabel}
              </div>
            )}
          </div>
          <div className="ml-3 p-2.5 rounded-xl flex-shrink-0" style={{ background: `${color}18` }}>
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
          <span className="w-2 h-2 rounded-full inline-block" style={{ background: p.color }} />
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
  const [selectedDeptId, setSelectedDeptId] = useState<number | undefined>(undefined);
  const [comparativaYear, setComparativaYear] = useState<number | undefined>(undefined);
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - i);

  const { data: deptList } = trpc.departments.list.useQuery(
    { page: 1, pageSize: 100, isActive: true },
    { retry: false }
  );

  const { data: kpis, isLoading: loadingKPIs, refetch: refetchKPIs } =
    trpc.executiveReport.getKPIs.useQuery(
      { departmentId: selectedDeptId },
      { retry: false }
    );

  const { data: trends, isLoading: loadingTrends } =
    trpc.executiveReport.getTrends.useQuery({ months: trendMonths }, { retry: false });

  const { data: comparativaDepts, isLoading: loadingComparativa } =
    trpc.executiveReport.getComparativaDepts.useQuery({ year: comparativaYear }, { retry: false });

  const isLoading = loadingKPIs || loadingTrends;

  // ── Exportar comparativa a Excel ─────────────────────────────────────────────
  function exportComparativaXLSX() {
    if (!comparativaDepts || comparativaDepts.length === 0) return;

    const now = new Date();
    const fechaStr = now.toLocaleDateString("es-MX", { year: "numeric", month: "2-digit", day: "2-digit" }).replace(/\//g, "-");

    // Hoja 1: Datos por departamento
    const rows = comparativaDepts.map((d) => ({
      "Departamento": d.deptName,
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
      "Departamento": "PROMEDIO GENERAL",
      "Total Empleados": Math.round(comparativaDepts.reduce((s, d) => s + d.totalEmployees, 0) / n),
      "Rotación %": Math.round(comparativaDepts.reduce((s, d) => s + d.turnoverRate, 0) / n),
      "% Personal Capacitado": Math.round(comparativaDepts.reduce((s, d) => s + d.trainingRate, 0) / n),
      "Puntaje NOM-035": Math.round(comparativaDepts.reduce((s, d) => s + d.nom035Score, 0) / n),
      "Vacaciones Pendientes": comparativaDepts.reduce((s, d) => s + d.pendingVacations, 0),
      "Riesgo Psicométrico Alto": comparativaDepts.reduce((s, d) => s + d.highRiskPsycho, 0),
    });

    const ws1 = XLSX.utils.json_to_sheet(rows);
    ws1["!cols"] = [{ wch: 30 }, { wch: 16 }, { wch: 12 }, { wch: 22 }, { wch: 18 }, { wch: 22 }, { wch: 24 }];

    // Hoja 2: Referencia NOM-035
    const ref = [
      { "Indicador": "Rotación %", "Nivel Bajo": "< 8%", "Nivel Medio": "8% – 15%", "Nivel Alto": "> 15%", "Referencia": "NOM-035-STPS-2018" },
      { "Indicador": "% Personal Capacitado", "Nivel Bajo": "< 50%", "Nivel Medio": "50% – 80%", "Nivel Alto": "> 80%", "Referencia": "NOM-035-STPS-2018" },
      { "Indicador": "Puntaje NOM-035", "Nivel Bajo": "< 60", "Nivel Medio": "60 – 80", "Nivel Alto": "> 80", "Referencia": "NOM-035-STPS-2018" },
      { "Indicador": "Riesgo Psicométrico", "Nivel Bajo": "0", "Nivel Medio": "1 – 3", "Nivel Alto": "> 3", "Referencia": "NOM-035-STPS-2018" },
    ];
    const ws2 = XLSX.utils.json_to_sheet(ref);
    ws2["!cols"] = [{ wch: 28 }, { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 22 }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws1, "Comparativa Departamentos");
    XLSX.utils.book_append_sheet(wb, ws2, "Referencia NOM-035");
    XLSX.writeFile(wb, `Comparativa_Departamentos_${fechaStr}.xlsx`);
  }

  // ── Preparar datos de tendencia para Recharts ─────────────────────────────
  const trendData = trends?.labels?.map((label: string, i: number) => ({
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
              Métricas clave de talento, capacitación, bienestar y cumplimiento NOM-035.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Selector de departamento */}
            <div className="flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-slate-500" />
              <Select
                value={selectedDeptId !== undefined ? String(selectedDeptId) : "all"}
                onValueChange={(val) => setSelectedDeptId(val === "all" ? undefined : Number(val))}
              >
                <SelectTrigger className="w-52 h-8 text-xs">
                  <SelectValue placeholder="Todos los departamentos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los departamentos</SelectItem>
                  {deptList?.data?.map((d: { id: number; name: string }) => (
                    <SelectItem key={d.id} value={String(d.id)}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {kpis?.departmentFilter && (
              <Badge className="text-xs bg-blue-100 text-blue-800 border-blue-300">
                <Building2 className="w-3 h-3 mr-1" />
                {kpis.departmentFilter.name}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs border-blue-300 text-blue-700 bg-blue-50">
              Tiempo real
            </Badge>
            <Button
              size="sm"
              variant="outline"
              onClick={() => refetchKPIs()}
              className="gap-1.5"
              disabled={isLoading}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
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
                  subtitle="Últimos 12 meses"
                  icon={Activity}
                  color={kpis.employees.turnoverRate > 15 ? COLORS.danger : kpis.employees.turnoverRate > 8 ? COLORS.warning : COLORS.success}
                  trend={kpis.employees.turnoverRate > 15 ? "up" : kpis.employees.turnoverRate > 8 ? "neutral" : "down"}
                  trendLabel={kpis.employees.turnoverRate > 15 ? "Rotación alta" : kpis.employees.turnoverRate > 8 ? "Rotación moderada" : "Rotación baja"}
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
                  color={kpis.training.completionRate >= 80 ? COLORS.success : kpis.training.completionRate >= 50 ? COLORS.warning : COLORS.danger}
                  trend={kpis.training.completionRate >= 80 ? "up" : kpis.training.completionRate >= 50 ? "neutral" : "down"}
                  trendLabel={kpis.training.completionRate >= 80 ? "Meta alcanzada" : "Por debajo de meta"}
                />
                <KPICard
                  title="Vacaciones Pendientes"
                  value={kpis.vacations.pending}
                  subtitle={`${kpis.vacations.approved} aprobadas`}
                  icon={Calendar}
                  color={kpis.vacations.pending > 10 ? COLORS.warning : COLORS.success}
                />
              </div>
            </div>

            {/* Sección: Bienestar y Cumplimiento */}
            <div>
              <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Brain className="w-3.5 h-3.5" /> Bienestar y Cumplimiento NOM-035
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <KPICard
                  title="Casos NOM-035"
                  value={kpis.cases.total}
                  subtitle={`${kpis.cases.open} abiertos`}
                  icon={AlertTriangle}
                  color={kpis.cases.open > 5 ? COLORS.danger : kpis.cases.open > 2 ? COLORS.warning : COLORS.success}
                  trend={kpis.cases.open > 5 ? "up" : "neutral"}
                  trendLabel={kpis.cases.open > 0 ? `${kpis.cases.open} requieren atención` : "Sin casos pendientes"}
                />
                <KPICard
                  title="Casos de Alto Riesgo"
                  value={kpis.cases.highRisk}
                  subtitle="Prioridad alta/crítica"
                  icon={AlertTriangle}
                  color={kpis.cases.highRisk > 0 ? COLORS.danger : COLORS.success}
                  trend={kpis.cases.highRisk > 0 ? "up" : "neutral"}
                />
                <KPICard
                  title="Riesgo Psicométrico Alto"
                  value={kpis.psychometric.highRisk}
                  subtitle={`de ${kpis.psychometric.total} evaluados`}
                  icon={Brain}
                  color={kpis.psychometric.highRisk > 0 ? COLORS.warning : COLORS.success}
                />
                <KPICard
                  title="Mensajes Pendientes"
                  value={kpis.mailbox.pending}
                  subtitle={`de ${kpis.mailbox.total} totales`}
                  icon={Mail}
                  color={kpis.mailbox.pending > 20 ? COLORS.warning : COLORS.success}
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
              {[3, 6, 12].map((m) => (
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
                      <LineChart data={trendData} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Line type="monotone" dataKey="casos" name="Casos NOM-035" stroke={COLORS.danger} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                        <Line type="monotone" dataKey="capacitacion" name="Capacitaciones" stroke={COLORS.success} strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
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
                      <BarChart data={trendData} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="salidas" name="Salidas" fill={COLORS.warning} radius={[3, 3, 0, 0]} maxBarSize={28} />
                        <Bar dataKey="psicometria" name="Psicometría" fill={COLORS.purple} radius={[3, 3, 0, 0]} maxBarSize={28} />
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
                      <BarChart data={trendData} margin={{ top: 8, right: 16, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="mes" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                        <Tooltip content={<CustomTooltip />} />
                        <ReferenceLine y={10} stroke={COLORS.warning} strokeDasharray="4 3" label={{ value: "Umbral", fontSize: 10, fill: COLORS.warning }} />
                        <Bar dataKey="mensajes" name="Mensajes" fill={COLORS.cyan} radius={[3, 3, 0, 0]} maxBarSize={36} />
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
                <p className="text-sm">Sin datos de tendencia disponibles para el período seleccionado.</p>
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
                onChange={(e) => setComparativaYear(e.target.value ? Number(e.target.value) : undefined)}
                className="text-xs border border-slate-300 rounded px-2 py-1.5 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Todos los años</option>
                {yearOptions.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              {comparativaDepts && comparativaDepts.length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={exportComparativaXLSX}
                  className="gap-1.5 border-emerald-600 text-emerald-700 hover:bg-emerald-50"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  Exportar XLSX
                </Button>
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
                    <th className="px-4 py-2.5 text-left font-medium">Departamento</th>
                    <th className="px-4 py-2.5 text-center font-medium">Empleados</th>
                    <th className="px-4 py-2.5 text-center font-medium">Rotacion %</th>
                    <th className="px-4 py-2.5 text-center font-medium">% Capacitado</th>
                    <th className="px-4 py-2.5 text-center font-medium">Puntaje NOM-035</th>
                    <th className="px-4 py-2.5 text-center font-medium">Vac. Pendientes</th>
                    <th className="px-4 py-2.5 text-center font-medium">Riesgo Psico.</th>
                  </tr>
                </thead>
                <tbody>
                  {comparativaDepts.map((dept, idx) => {
                    const rotCls = dept.turnoverRate >= 20 ? "text-red-600 font-bold" : dept.turnoverRate >= 10 ? "text-amber-600 font-semibold" : "text-emerald-600";
                    const capCls = dept.trainingRate >= 80 ? "text-emerald-600 font-bold" : dept.trainingRate >= 50 ? "text-amber-600 font-semibold" : "text-red-600";
                    const nomCls = dept.nom035Score >= 80 ? "text-emerald-600 font-bold" : dept.nom035Score >= 60 ? "text-amber-600 font-semibold" : "text-red-600";
                    return (
                      <tr key={dept.deptId} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50"}>
                        <td className="px-4 py-2.5 font-medium text-slate-800">{dept.deptName}</td>
                        <td className="px-4 py-2.5 text-center text-slate-600">{dept.totalEmployees}</td>
                        <td className={`px-4 py-2.5 text-center ${rotCls}`}>{dept.turnoverRate}%</td>
                        <td className={`px-4 py-2.5 text-center ${capCls}`}>{dept.trainingRate}%</td>
                        <td className={`px-4 py-2.5 text-center ${nomCls}`}>{dept.nom035Score}</td>
                        <td className="px-4 py-2.5 text-center text-slate-600">{dept.pendingVacations}</td>
                        <td className="px-4 py-2.5 text-center">
                          {dept.highRiskPsycho > 0
                            ? <span className="text-red-600 font-semibold">{dept.highRiskPsycho}</span>
                            : <span className="text-emerald-600">0</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 border-t border-slate-200 font-semibold">
                    <td className="px-4 py-2 text-slate-700">Promedio general</td>
                    <td className="px-4 py-2 text-center text-slate-600">{Math.round(comparativaDepts.reduce((s, d) => s + d.totalEmployees, 0) / comparativaDepts.length)}</td>
                    <td className="px-4 py-2 text-center text-slate-600">{Math.round(comparativaDepts.reduce((s, d) => s + d.turnoverRate, 0) / comparativaDepts.length)}%</td>
                    <td className="px-4 py-2 text-center text-slate-600">{Math.round(comparativaDepts.reduce((s, d) => s + d.trainingRate, 0) / comparativaDepts.length)}%</td>
                    <td className="px-4 py-2 text-center text-slate-600">{Math.round(comparativaDepts.reduce((s, d) => s + d.nom035Score, 0) / comparativaDepts.length)}</td>
                    <td className="px-4 py-2 text-center text-slate-600">{comparativaDepts.reduce((s, d) => s + d.pendingVacations, 0)}</td>
                    <td className="px-4 py-2 text-center text-slate-600">{comparativaDepts.reduce((s, d) => s + d.highRiskPsycho, 0)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="text-center text-slate-400 py-8 border border-dashed border-slate-300 rounded-lg">
              <p className="text-sm">No hay departamentos con empleados registrados.</p>
            </div>
          )}
        </div>

        {/* ── Pie de página ── */}
        {kpis && (
          <p className="text-xs text-slate-400 text-right">
            Última actualización: {new Date(kpis.generatedAt).toLocaleString("es-MX")}
          </p>
        )}
      </div>
    </DashboardLayout>
  );
}
