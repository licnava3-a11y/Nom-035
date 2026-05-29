/**
 * Nom035ComplianceDashboard.tsx
 * Dashboard de Cumplimiento NOM-035 — semáforos, KPIs, gráficos Chart.js y tablas de seguimiento.
 */
import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckCircle2, AlertTriangle, XCircle, Clock, FileText,
  TrendingUp, BarChart3, RefreshCw, ExternalLink, AlertCircle,
  ShieldCheck, Activity, Target, Layers, Download
} from "lucide-react";
import { toast } from "sonner";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Filler,
} from "chart.js";
import { Doughnut, Bar, Line } from "react-chartjs-2";

ChartJS.register(
  ArcElement, Tooltip, Legend, CategoryScale, LinearScale,
  BarElement, LineElement, PointElement, Filler
);

// ── Helpers ───────────────────────────────────────────────────────────────────

const TIPO_PLAN_LABELS: Record<string, string> = {
  intervencion: "Intervención de Riesgos",
  violencia_laboral: "Violencia Laboral",
  no_discriminacion: "No Discriminación",
  consolidado: "Consolidado",
};

const NIVEL_LABELS: Record<string, string> = {
  organizacional: "Organizacional",
  grupal: "Grupal",
  individual: "Individual",
};

const PRIORIDAD_COLORS: Record<string, string> = {
  alta: "bg-red-100 text-red-700 border-red-200",
  media: "bg-yellow-100 text-yellow-700 border-yellow-200",
  baja: "bg-green-100 text-green-700 border-green-200",
};

// ── Componente: Círculo de semáforo animado ───────────────────────────────────
function SemaforoCircle({ value, size = 120 }: { value: number; size?: number }) {
  const color = value >= 80 ? "#16a34a" : value >= 50 ? "#d97706" : "#dc2626";
  const label = value >= 80 ? "Óptimo" : value >= 50 ? "En riesgo" : "Crítico";
  const radius = (size / 2) - 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth={10} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={10}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
        <text
          x={size / 2} y={size / 2 + 2}
          textAnchor="middle" dominantBaseline="middle"
          style={{
            transform: `rotate(90deg)`,
            transformOrigin: `${size / 2}px ${size / 2}px`,
            fill: color,
            fontSize: size * 0.22,
            fontWeight: 700,
          }}
        >
          {value}%
        </text>
      </svg>
      <span className="text-xs font-semibold" style={{ color }}>{label}</span>
    </div>
  );
}

// ── Componente: Badge de semáforo ─────────────────────────────────────────────
function SemaforoBadge({ semaforo }: { semaforo: "verde" | "amarillo" | "rojo" }) {
  if (semaforo === "verde") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700 border border-green-200">
      <CheckCircle2 className="w-3 h-3" /> Óptimo
    </span>
  );
  if (semaforo === "amarillo") return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 text-yellow-700 border border-yellow-200">
      <AlertTriangle className="w-3 h-3" /> En riesgo
    </span>
  );
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
      <XCircle className="w-3 h-3" /> Crítico
    </span>
  );
}

// ── Componente: Tarjeta KPI ───────────────────────────────────────────────────
function KpiCard({ icon: Icon, label, value, sub, color, bgColor }: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  sub?: string;
  color: string;
  bgColor: string;
}) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">{label}</p>
            <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
            {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
          </div>
          <div className={`p-2.5 rounded-xl ${bgColor}`}>
            <Icon className={`w-5 h-5 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function Nom035ComplianceDashboard() {
  const [periodoMeses, setPeriodoMeses] = useState(6);
  const [tipoPlanFilter, setTipoPlanFilter] = useState<string>("all");

  const generatePdfMutation = trpc.nom035Matrix.generateCompliancePdf.useMutation({
    onSuccess: (result) => {
      const byteChars = atob(result.pdfBase64);
      const byteNums = new Array(byteChars.length).fill(0).map((_, i) => byteChars.charCodeAt(i));
      const blob = new Blob([new Uint8Array(byteNums)], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `NOM035-Cumplimiento-${new Date().toISOString().split("T")[0]}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("PDF generado y descargado correctamente");
    },
    onError: (err) => toast.error("Error al generar el PDF: " + err.message),
  });

  const { data, isLoading, refetch, isFetching } = trpc.nom035Matrix.getComplianceDashboard.useQuery(
    { periodoMeses },
    { refetchOnWindowFocus: false }
  );

  // ── Skeleton de carga ─────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-72" />
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-64" />)}
        </div>
      </div>
    );
  }

  if (!data) return (
    <div className="p-6 text-center text-muted-foreground">
      No se pudieron cargar los datos del dashboard.
    </div>
  );

  const { kpis, byTipoPlan, byNivel, byPrioridad, planes, proximasAVencer, accionesVencidas, tendenciaMeses } = data;

  // Filtrar planes
  const planesFiltrados = tipoPlanFilter === "all"
    ? planes
    : planes.filter((p: any) => p.tipoPlan === tipoPlanFilter);

  // ── Datos para gráficos ───────────────────────────────────────────────────

  const doughnutData = {
    labels: ["Cumplidas", "En proceso", "No iniciadas", "Vencidas", "Canceladas"],
    datasets: [{
      data: [kpis.cumplidas, kpis.enProceso, kpis.noIniciadas, kpis.vencidas, kpis.canceladas],
      backgroundColor: ["#16a34a", "#2563eb", "#94a3b8", "#dc2626", "#6b7280"],
      borderWidth: 2,
      borderColor: "#fff",
    }],
  };

  const barTipoData = {
    labels: byTipoPlan.map((r: any) => TIPO_PLAN_LABELS[r.tipoPlan] || r.tipoPlan),
    datasets: [
      { label: "Cumplidas", data: byTipoPlan.map((r: any) => r.cumplidas), backgroundColor: "#16a34a", borderRadius: 4 },
      { label: "En proceso", data: byTipoPlan.map((r: any) => r.enProceso), backgroundColor: "#2563eb", borderRadius: 4 },
      { label: "Vencidas", data: byTipoPlan.map((r: any) => r.vencidas), backgroundColor: "#dc2626", borderRadius: 4 },
      { label: "No iniciadas", data: byTipoPlan.map((r: any) => r.noIniciadas), backgroundColor: "#94a3b8", borderRadius: 4 },
    ],
  };

  const lineData = {
    labels: tendenciaMeses.map((m: any) => m.mes),
    datasets: [
      {
        label: "Cumplidas",
        data: tendenciaMeses.map((m: any) => m.cumplidas),
        borderColor: "#16a34a",
        backgroundColor: "rgba(22,163,74,0.08)",
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: "#16a34a",
      },
      {
        label: "Vencidas",
        data: tendenciaMeses.map((m: any) => m.vencidas),
        borderColor: "#dc2626",
        backgroundColor: "rgba(220,38,38,0.06)",
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: "#dc2626",
      },
      {
        label: "Total creadas",
        data: tendenciaMeses.map((m: any) => m.total),
        borderColor: "#6366f1",
        backgroundColor: "transparent",
        fill: false,
        tension: 0.4,
        pointRadius: 3,
        borderDash: [4, 4],
      },
    ],
  };

  const barPrioridadData = {
    labels: byPrioridad.map((r: any) => r.prioridad.charAt(0).toUpperCase() + r.prioridad.slice(1)),
    datasets: [
      { label: "Cumplidas", data: byPrioridad.map((r: any) => r.cumplidas), backgroundColor: "#16a34a", borderRadius: 4 },
      { label: "Vencidas", data: byPrioridad.map((r: any) => r.vencidas), backgroundColor: "#dc2626", borderRadius: 4 },
      { label: "Pendientes", data: byPrioridad.map((r: any) => r.total - r.cumplidas - r.vencidas), backgroundColor: "#94a3b8", borderRadius: 4 },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: "bottom" as const, labels: { font: { size: 10 }, boxWidth: 10 } } },
    scales: {
      x: { stacked: true, grid: { display: false }, ticks: { font: { size: 10 } } },
      y: { stacked: true, beginAtZero: true, ticks: { font: { size: 10 } } },
    },
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: "bottom" as const, labels: { font: { size: 10 }, boxWidth: 10 } } },
    scales: {
      x: { grid: { display: false }, ticks: { font: { size: 10 } } },
      y: { beginAtZero: true, ticks: { font: { size: 10 } } },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "65%",
    plugins: { legend: { position: "bottom" as const, labels: { font: { size: 10 }, boxWidth: 10, padding: 8 } } },
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 space-y-6 max-w-[1400px] mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary" />
            Dashboard de Cumplimiento NOM-035
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Monitoreo integral del avance de planes de acción y evidencias
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={String(periodoMeses)} onValueChange={v => setPeriodoMeses(Number(v))}>
            <SelectTrigger className="w-40 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3">Últimos 3 meses</SelectItem>
              <SelectItem value="6">Últimos 6 meses</SelectItem>
              <SelectItem value="12">Últimos 12 meses</SelectItem>
              <SelectItem value="24">Últimos 24 meses</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching} className="gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Actualizar
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => generatePdfMutation.mutate({ periodoMeses })}
            disabled={generatePdfMutation.isPending}
          >
            {generatePdfMutation.isPending
              ? <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              : <Download className="w-3.5 h-3.5" />}
            {generatePdfMutation.isPending ? "Generando..." : "Exportar PDF"}
          </Button>
          <Button asChild size="sm" className="gap-1.5">
            <Link href="/nom035-matrix">
              <Layers className="w-3.5 h-3.5" />
              Ver Matriz
            </Link>
          </Button>
        </div>
      </div>

      {/* Semáforo global + KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-sm lg:col-span-1">
          <CardContent className="pt-6 pb-5 flex flex-col items-center gap-3">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide text-center">
              Cumplimiento Global
            </p>
            <SemaforoCircle value={kpis.porcentajeCumplimiento} size={140} />
            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                {kpis.cumplidas} de {kpis.total} acciones cumplidas
              </p>
              {kpis.altaVencida > 0 && (
                <p className="text-xs text-red-600 font-medium mt-1">
                  ⚠ {kpis.altaVencida} acciones de alta prioridad vencidas
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
          <KpiCard icon={Target} label="Total Acciones" value={kpis.total} color="text-slate-700" bgColor="bg-slate-100" />
          <KpiCard icon={CheckCircle2} label="Cumplidas" value={kpis.cumplidas} sub={`${kpis.porcentajeCumplimiento}% del total`} color="text-green-600" bgColor="bg-green-100" />
          <KpiCard icon={Activity} label="En Proceso" value={kpis.enProceso} color="text-blue-600" bgColor="bg-blue-100" />
          <KpiCard icon={Clock} label="No Iniciadas" value={kpis.noIniciadas} color="text-slate-500" bgColor="bg-slate-100" />
          <KpiCard icon={XCircle} label="Vencidas" value={kpis.vencidas} sub={kpis.vencidas > 0 ? "Requieren atención" : "Sin vencidas"} color={kpis.vencidas > 0 ? "text-red-600" : "text-green-600"} bgColor={kpis.vencidas > 0 ? "bg-red-100" : "bg-green-100"} />
          <KpiCard icon={FileText} label="Con Evidencia" value={kpis.conEvidencia} sub={`de ${kpis.total} acciones`} color="text-indigo-600" bgColor="bg-indigo-100" />
        </div>
      </div>

      {/* Gráficos principales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Distribución por Estado
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div style={{ height: 220 }}>
              <Doughnut data={doughnutData} options={doughnutOptions} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Acciones por Tipo de Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div style={{ height: 220 }}>
              {byTipoPlan.length > 0
                ? <Bar data={barTipoData} options={barOptions} />
                : <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Sin datos</div>
              }
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-primary" />
              Acciones por Prioridad
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div style={{ height: 220 }}>
              {byPrioridad.length > 0
                ? <Bar data={barPrioridadData} options={barOptions} />
                : <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Sin datos</div>
              }
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tendencia mensual */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2 pt-4 px-4">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            Tendencia de Cumplimiento — Últimos {periodoMeses} meses
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          <div style={{ height: 200 }}>
            <Line data={lineData} options={lineOptions} />
          </div>
        </CardContent>
      </Card>

      {/* Tabla de planes con semáforo */}
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-2 pt-4 px-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              Semáforo por Plan de Acción
            </CardTitle>
            <Select value={tipoPlanFilter} onValueChange={setTipoPlanFilter}>
              <SelectTrigger className="w-44 h-8 text-xs">
                <SelectValue placeholder="Todos los tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tipos</SelectItem>
                <SelectItem value="intervencion">Intervención</SelectItem>
                <SelectItem value="violencia_laboral">Violencia Laboral</SelectItem>
                <SelectItem value="no_discriminacion">No Discriminación</SelectItem>
                <SelectItem value="consolidado">Consolidado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          {planesFiltrados.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              <ShieldCheck className="w-10 h-10 mx-auto mb-3 opacity-30" />
              No hay planes registrados. Crea tu primer plan desde la{" "}
              <Link href="/nom035-matrix" className="text-primary underline">Matriz de Acciones</Link>.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-2.5 font-medium text-xs text-muted-foreground">Plan</th>
                    <th className="text-left px-4 py-2.5 font-medium text-xs text-muted-foreground">Tipo</th>
                    <th className="text-left px-4 py-2.5 font-medium text-xs text-muted-foreground">Nivel</th>
                    <th className="text-center px-4 py-2.5 font-medium text-xs text-muted-foreground">Total</th>
                    <th className="text-center px-4 py-2.5 font-medium text-xs text-muted-foreground">Cumplidas</th>
                    <th className="text-center px-4 py-2.5 font-medium text-xs text-muted-foreground">Vencidas</th>
                    <th className="text-center px-4 py-2.5 font-medium text-xs text-muted-foreground">Evidencias</th>
                    <th className="text-center px-4 py-2.5 font-medium text-xs text-muted-foreground">% Avance</th>
                    <th className="text-center px-4 py-2.5 font-medium text-xs text-muted-foreground">Semáforo</th>
                    <th className="px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {planesFiltrados.map((plan: any, idx: number) => (
                    <tr
                      key={plan.id}
                      className={`border-b transition-colors hover:bg-muted/30 ${idx % 2 === 0 ? "" : "bg-muted/10"}`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{plan.identificadorNivel}</div>
                        {plan.centroTrabajo && (
                          <div className="text-xs text-muted-foreground">{plan.centroTrabajo}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {TIPO_PLAN_LABELS[plan.tipoPlan] || plan.tipoPlan}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {NIVEL_LABELS[plan.nivelAplicacion] || plan.nivelAplicacion}
                      </td>
                      <td className="px-4 py-3 text-center font-semibold">{plan.totalAcciones}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-green-600 font-semibold">{plan.cumplidas}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {plan.vencidas > 0
                          ? <span className="text-red-600 font-semibold">{plan.vencidas}</span>
                          : <span className="text-muted-foreground text-xs">—</span>
                        }
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-indigo-600 font-semibold">{plan.conEvidencia}</span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-20 bg-gray-200 rounded-full h-2">
                            <div
                              className="h-2 rounded-full transition-all"
                              style={{
                                width: `${plan.porcentajeCumplimiento}%`,
                                backgroundColor:
                                  plan.semaforo === "verde" ? "#16a34a"
                                  : plan.semaforo === "amarillo" ? "#d97706"
                                  : "#dc2626",
                              }}
                            />
                          </div>
                          <span className="text-xs font-semibold w-8 text-right">
                            {plan.porcentajeCumplimiento}%
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <SemaforoBadge semaforo={plan.semaforo} />
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button asChild variant="ghost" size="sm" className="h-7 px-2 text-xs gap-1">
                          <Link href={`/nom035-matrix?planId=${plan.id}`}>
                            <ExternalLink className="w-3 h-3" />
                            Ver
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Alertas: próximas a vencer + vencidas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* Próximas a vencer */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-yellow-700">
              <AlertCircle className="w-4 h-4" />
              Próximas a Vencer (14 días)
              {proximasAVencer.length > 0 && (
                <Badge variant="outline" className="ml-auto text-yellow-700 border-yellow-300 bg-yellow-50 text-xs">
                  {proximasAVencer.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {proximasAVencer.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500 opacity-60" />
                No hay acciones próximas a vencer
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {proximasAVencer.map((a: any) => (
                  <div key={a.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-yellow-50 border border-yellow-100">
                    <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-yellow-800">{a.accionId}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded border ${PRIORIDAD_COLORS[a.prioridad]}`}>
                          {a.prioridad}
                        </span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          Vence: {a.plazo ? new Date(a.plazo).toLocaleDateString("es-MX") : "—"}
                        </span>
                      </div>
                      <p className="text-xs text-foreground mt-0.5 truncate">{a.objetivo}</p>
                      {a.responsable && (
                        <p className="text-xs text-muted-foreground">Resp: {a.responsable}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Acciones vencidas */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2 text-red-700">
              <XCircle className="w-4 h-4" />
              Acciones Vencidas
              {accionesVencidas.length > 0 && (
                <Badge variant="outline" className="ml-auto text-red-700 border-red-300 bg-red-50 text-xs">
                  {accionesVencidas.length}
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            {accionesVencidas.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-sm">
                <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500 opacity-60" />
                No hay acciones vencidas
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {accionesVencidas.map((a: any) => (
                  <div key={a.id} className="flex items-start gap-3 p-2.5 rounded-lg bg-red-50 border border-red-100">
                    <XCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-red-800">{a.accionId}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded border ${PRIORIDAD_COLORS[a.prioridad]}`}>
                          {a.prioridad}
                        </span>
                        <span className="text-xs text-muted-foreground ml-auto">
                          Venció: {a.plazo ? new Date(a.plazo).toLocaleDateString("es-MX") : "—"}
                        </span>
                      </div>
                      <p className="text-xs text-foreground mt-0.5 truncate">{a.objetivo}</p>
                      {a.responsable && (
                        <p className="text-xs text-muted-foreground">Resp: {a.responsable}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Distribución por nivel */}
      {byNivel.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              Cumplimiento por Nivel de Aplicación
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {byNivel.map((n: any) => (
                <div key={n.nivelAplicacion} className="flex flex-col items-center gap-2 p-4 rounded-xl bg-muted/30">
                  <p className="text-sm font-semibold">{NIVEL_LABELS[n.nivelAplicacion] || n.nivelAplicacion}</p>
                  <SemaforoCircle value={n.porcentaje} size={100} />
                  <div className="text-xs text-muted-foreground text-center">
                    {n.cumplidas}/{n.total} cumplidas · {n.vencidas} vencidas
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

    </div>
  );
}
