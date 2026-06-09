/**
 * DC3Dashboard
 *
 * Panel de estadísticas de constancias DC-3 con:
 *  - 4 tarjetas KPI: Total, Emitidas, Borradores, Canceladas + Tasa de emisión
 *  - Gráfica de barras apiladas por mes (Chart.js)
 *  - Gráfica de dona por estado (Chart.js)
 *  - Gráfica de barras horizontales por empresa (top 10)
 *  - Gráfica de barras horizontales por área temática (top 10)
 *  - Filtros de período: mes actual, trimestre, semana, año, rango personalizado
 */
import { useState, useEffect, useRef, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  TrendingUp,
  BarChart3,
  Loader2,
  RefreshCw,
} from "lucide-react";
import {
  Chart,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  type ChartData,
  type ChartOptions,
} from "chart.js";
import { Bar, Doughnut } from "react-chartjs-2";

// Registrar componentes Chart.js
Chart.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

// ─── Helpers de período ───────────────────────────────────────────────────────

type PeriodKey = "week" | "month" | "quarter" | "year" | "custom";

function getPeriodRange(key: PeriodKey): { from: number; to: number } {
  const now = new Date();
  switch (key) {
    case "week": {
      const d = new Date(now);
      d.setDate(d.getDate() - 6);
      d.setHours(0, 0, 0, 0);
      return { from: d.getTime(), to: now.getTime() };
    }
    case "month": {
      return {
        from: new Date(now.getFullYear(), now.getMonth(), 1).getTime(),
        to: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).getTime(),
      };
    }
    case "quarter": {
      const q = Math.floor(now.getMonth() / 3);
      return {
        from: new Date(now.getFullYear(), q * 3, 1).getTime(),
        to: new Date(now.getFullYear(), q * 3 + 3, 0, 23, 59, 59).getTime(),
      };
    }
    case "year":
    default: {
      return {
        from: new Date(now.getFullYear(), 0, 1).getTime(),
        to: new Date(now.getFullYear(), 11, 31, 23, 59, 59).getTime(),
      };
    }
  }
}

function formatMonthLabel(yyyymm: string): string {
  const [y, m] = yyyymm.split("-");
  const months = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
  return `${months[parseInt(m, 10) - 1]} ${y}`;
}

// ─── Componente KPI Card ──────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  icon: Icon,
  color,
  sub,
}: {
  label: string;
  value: number | string;
  icon: React.ElementType;
  color: string;
  sub?: string;
}) {
  return (
    <Card>
      <CardContent className="pt-5 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={`p-3 rounded-full bg-muted/60`}>
            <Icon className={`w-6 h-6 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function DC3Dashboard() {
  const [period, setPeriod] = useState<PeriodKey>("year");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const range = useMemo(() => {
    if (period === "custom" && customFrom && customTo) {
      return {
        from: new Date(customFrom).getTime(),
        to: new Date(customTo + "T23:59:59").getTime(),
      };
    }
    if (period !== "custom") return getPeriodRange(period);
    return getPeriodRange("year");
  }, [period, customFrom, customTo]);

  const { data, isLoading, refetch } = trpc.dc3.getDashboardStats.useQuery(
    { dateFrom: range.from, dateTo: range.to },
    { enabled: true }
  );

  // ── Gráfica 1: Barras apiladas por mes ──────────────────────────────────────
  const barMonthData: ChartData<"bar"> = useMemo(() => ({
    labels: (data?.byMonth ?? []).map((m) => formatMonthLabel(m.month)),
    datasets: [
      {
        label: "Emitidas",
        data: (data?.byMonth ?? []).map((m) => m.issued ?? 0),
        backgroundColor: "#16a34a",
        borderRadius: 3,
      },
      {
        label: "Borradores",
        data: (data?.byMonth ?? []).map((m) => m.draft ?? 0),
        backgroundColor: "#2563eb",
        borderRadius: 3,
      },
      {
        label: "Canceladas",
        data: (data?.byMonth ?? []).map((m) => m.cancelled ?? 0),
        backgroundColor: "#dc2626",
        borderRadius: 3,
      },
    ],
  }), [data]);

  const barMonthOptions: ChartOptions<"bar"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "top" },
      title: { display: false },
    },
    scales: {
      x: { stacked: true },
      y: { stacked: true, beginAtZero: true, ticks: { stepSize: 1 } },
    },
  };

  // ── Gráfica 2: Dona por estado ───────────────────────────────────────────────
  const donutData: ChartData<"doughnut"> = useMemo(() => ({
    labels: ["Emitidas", "Borradores", "Canceladas"],
    datasets: [{
      data: [
        data?.kpis.issued ?? 0,
        data?.kpis.draft ?? 0,
        data?.kpis.cancelled ?? 0,
      ],
      backgroundColor: ["#16a34a", "#2563eb", "#dc2626"],
      borderWidth: 2,
      borderColor: "#ffffff",
    }],
  }), [data]);

  const donutOptions: ChartOptions<"doughnut"> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: "bottom" },
    },
    cutout: "65%",
  };

  // ── Gráfica 3: Barras horizontales por empresa ───────────────────────────────
  const barCompanyData: ChartData<"bar"> = useMemo(() => ({
    labels: (data?.byCompany ?? []).map((c) =>
      c.company.length > 30 ? c.company.slice(0, 28) + "…" : c.company
    ),
    datasets: [{
      label: "Constancias",
      data: (data?.byCompany ?? []).map((c) => c.count),
      backgroundColor: "#7c3aed",
      borderRadius: 3,
    }],
  }), [data]);

  const barCompanyOptions: ChartOptions<"bar"> = {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { beginAtZero: true, ticks: { stepSize: 1 } },
      y: { ticks: { font: { size: 11 } } },
    },
  };

  // ── Gráfica 4: Barras horizontales por área temática ─────────────────────────
  const barAreaData: ChartData<"bar"> = useMemo(() => ({
    labels: (data?.byThematicArea ?? []).map((a) =>
      a.area.length > 35 ? a.area.slice(0, 33) + "…" : a.area
    ),
    datasets: [{
      label: "Constancias",
      data: (data?.byThematicArea ?? []).map((a) => a.count),
      backgroundColor: "#0891b2",
      borderRadius: 3,
    }],
  }), [data]);

  const barAreaOptions: ChartOptions<"bar"> = {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { beginAtZero: true, ticks: { stepSize: 1 } },
      y: { ticks: { font: { size: 11 } } },
    },
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Encabezado */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-primary" />
              Dashboard DC-3
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Estadísticas de constancias de competencias laborales
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
            <RefreshCw className="w-4 h-4" />
            Actualizar
          </Button>
        </div>

        {/* Filtros de período */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium whitespace-nowrap">Período:</Label>
                <Select value={period} onValueChange={(v) => setPeriod(v as PeriodKey)}>
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">Última semana</SelectItem>
                    <SelectItem value="month">Mes actual</SelectItem>
                    <SelectItem value="quarter">Trimestre actual</SelectItem>
                    <SelectItem value="year">Año actual</SelectItem>
                    <SelectItem value="custom">Rango personalizado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {period === "custom" && (
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <Label className="text-sm whitespace-nowrap">Desde:</Label>
                    <Input
                      type="date"
                      value={customFrom}
                      onChange={(e) => setCustomFrom(e.target.value)}
                      className="w-36"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Label className="text-sm whitespace-nowrap">Hasta:</Label>
                    <Input
                      type="date"
                      value={customTo}
                      onChange={(e) => setCustomTo(e.target.value)}
                      className="w-36"
                    />
                  </div>
                </div>
              )}
              {isLoading && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Cargando...
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* KPIs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Total constancias"
            value={data?.kpis.total ?? 0}
            icon={FileText}
            color="text-foreground"
            sub="En el período seleccionado"
          />
          <KpiCard
            label="Emitidas"
            value={data?.kpis.issued ?? 0}
            icon={CheckCircle2}
            color="text-green-600"
            sub={`${data?.kpis.issueRate ?? 0}% tasa de emisión`}
          />
          <KpiCard
            label="Borradores"
            value={data?.kpis.draft ?? 0}
            icon={Clock}
            color="text-blue-600"
            sub="Pendientes de emitir"
          />
          <KpiCard
            label="Canceladas"
            value={data?.kpis.cancelled ?? 0}
            icon={XCircle}
            color="text-red-600"
          />
        </div>

        {/* Fila 1: Barras por mes + Dona por estado */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Constancias por mes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ height: 260 }}>
                {(data?.byMonth?.length ?? 0) > 0 ? (
                  <Bar data={barMonthData} options={barMonthOptions} />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    Sin datos en el período seleccionado
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Distribución por estado
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ height: 260 }}>
                {(data?.kpis.total ?? 0) > 0 ? (
                  <Doughnut data={donutData} options={donutOptions} />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    Sin datos
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Fila 2: Por empresa + Por área temática */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Top 10 empresas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ height: Math.max(200, (data?.byCompany?.length ?? 0) * 32 + 40) }}>
                {(data?.byCompany?.length ?? 0) > 0 ? (
                  <Bar data={barCompanyData} options={barCompanyOptions} />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    Sin datos
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Top 10 áreas temáticas
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div style={{ height: Math.max(200, (data?.byThematicArea?.length ?? 0) * 32 + 40) }}>
                {(data?.byThematicArea?.length ?? 0) > 0 ? (
                  <Bar data={barAreaData} options={barAreaOptions} />
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    Sin datos
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
