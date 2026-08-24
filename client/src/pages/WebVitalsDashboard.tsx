import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  Zap,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
  RefreshCw,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";

const METRIC_INFO: Record<
  string,
  {
    label: string;
    unit: string;
    description: string;
    goodThreshold: number;
    poorThreshold: number;
  }
> = {
  LCP: {
    label: "LCP",
    unit: "ms",
    description:
      "Largest Contentful Paint — tiempo en renderizar el elemento más grande",
    goodThreshold: 2500,
    poorThreshold: 4000,
  },
  CLS: {
    label: "CLS",
    unit: "",
    description: "Cumulative Layout Shift — estabilidad visual de la página",
    goodThreshold: 0.1,
    poorThreshold: 0.25,
  },
  INP: {
    label: "INP",
    unit: "ms",
    description:
      "Interaction to Next Paint — respuesta a interacciones del usuario",
    goodThreshold: 200,
    poorThreshold: 500,
  },
  FCP: {
    label: "FCP",
    unit: "ms",
    description:
      "First Contentful Paint — tiempo hasta el primer contenido visible",
    goodThreshold: 1800,
    poorThreshold: 3000,
  },
  TTFB: {
    label: "TTFB",
    unit: "ms",
    description: "Time to First Byte — tiempo de respuesta del servidor",
    goodThreshold: 800,
    poorThreshold: 1800,
  },
};

function RatingBadge({ rating }: { rating: string }) {
  if (rating === "good")
    return (
      <Badge className="bg-green-100 text-green-800 border-green-300">
        Bueno
      </Badge>
    );
  if (rating === "needs-improvement")
    return (
      <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
        Mejorar
      </Badge>
    );
  return (
    <Badge className="bg-red-100 text-red-800 border-red-300">Deficiente</Badge>
  );
}

function MetricCard({
  metric,
  data,
}: {
  metric: string;
  data: {
    avg: number;
    p75: number;
    good: number;
    needsImprovement: number;
    poor: number;
    total: number;
  };
}) {
  const info = METRIC_INFO[metric];
  const total = data.total || 1;
  const goodPct = Math.round((data.good / total) * 100);
  const poorPct = Math.round((data.poor / total) * 100);

  let overallRating: "good" | "needs-improvement" | "poor" = "good";
  if (data.p75 > info.poorThreshold) overallRating = "poor";
  else if (data.p75 > info.goodThreshold) overallRating = "needs-improvement";

  const TrendIcon =
    overallRating === "good"
      ? TrendingUp
      : overallRating === "poor"
        ? TrendingDown
        : Minus;
  const trendColor =
    overallRating === "good"
      ? "text-green-600"
      : overallRating === "poor"
        ? "text-red-600"
        : "text-yellow-600";

  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold">{info.label}</CardTitle>
          <div className="flex items-center gap-2">
            <TrendIcon className={`h-4 w-4 ${trendColor}`} />
            <RatingBadge rating={overallRating} />
          </div>
        </div>
        <CardDescription className="text-xs">
          {info.description}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {data.total === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Sin datos en el período
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center p-2 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground">Promedio</p>
                <p className="text-xl font-bold">
                  {data.avg.toFixed(info.unit === "" ? 3 : 0)}
                  <span className="text-xs font-normal ml-1">{info.unit}</span>
                </p>
              </div>
              <div className="text-center p-2 rounded-lg bg-muted">
                <p className="text-xs text-muted-foreground">P75</p>
                <p className="text-xl font-bold">
                  {data.p75.toFixed(info.unit === "" ? 3 : 0)}
                  <span className="text-xs font-normal ml-1">{info.unit}</span>
                </p>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-green-700 font-medium">Bueno</span>
                <span className="text-green-700">
                  {data.good} ({goodPct}%)
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-green-500 h-2 rounded-full"
                  style={{ width: `${goodPct}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-yellow-700 font-medium">
                  Necesita mejora
                </span>
                <span className="text-yellow-700">{data.needsImprovement}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-red-700 font-medium">Deficiente</span>
                <span className="text-red-700">
                  {data.poor} ({poorPct}%)
                </span>
              </div>
              <p className="text-xs text-muted-foreground text-right">
                {data.total} mediciones
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default function WebVitalsDashboard() {
  const [days, setDays] = useState<7 | 14 | 30 | 60>(30);
  const [trendMetric, setTrendMetric] = useState<
    "LCP" | "CLS" | "INP" | "FCP" | "TTFB"
  >("LCP");

  const {
    data: summary,
    isLoading: loadingSummary,
    refetch,
  } = trpc.webVitals.getSummary.useQuery({ days });
  const { data: trend, isLoading: loadingTrend } =
    trpc.webVitals.getTrend.useQuery({ metric: trendMetric, days });
  const { data: recent } = trpc.webVitals.getRecent.useQuery({ limit: 20 });

  const trendData = (trend ?? []).map(d => ({
    fecha: d.day,
    Promedio: Number(d.avg),
    Buenas: Number(d.good),
    Deficientes: Number(d.poor),
  }));

  const info = METRIC_INFO[trendMetric];

  return (
    <div className="container py-6 space-y-6 max-w-7xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Zap className="h-7 w-7 text-yellow-500" />
            Dashboard de Performance
          </h1>
          <p className="text-muted-foreground mt-1">
            Core Web Vitals — métricas de latencia y experiencia de usuario
            recopiladas en tiempo real
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={String(days)}
            onValueChange={v => setDays(Number(v) as 7 | 14 | 30 | 60)}
          >
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 días</SelectItem>
              <SelectItem value="14">Últimos 14 días</SelectItem>
              <SelectItem value="30">Últimos 30 días</SelectItem>
              <SelectItem value="60">Últimos 60 días</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            size="icon"
            onClick={() => refetch()}
            title="Actualizar"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Resumen de métricas */}
      {loadingSummary ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Object.keys(METRIC_INFO).map(m => (
            <Card key={m}>
              <CardContent className="py-8 flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !summary ||
        Object.keys(summary).every(k => summary[k].total === 0) ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Activity className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-lg font-medium">Sin métricas registradas aún</p>
            <p className="text-sm text-muted-foreground mt-2">
              Las métricas se recopilan automáticamente cuando los usuarios
              navegan por la plataforma. Visita algunas páginas para comenzar a
              ver datos aquí.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {Object.entries(METRIC_INFO).map(([metric]) => (
            <MetricCard
              key={metric}
              metric={metric}
              data={
                summary[metric] ?? {
                  avg: 0,
                  p75: 0,
                  good: 0,
                  needsImprovement: 0,
                  poor: 0,
                  total: 0,
                }
              }
            />
          ))}
        </div>
      )}

      {/* Tendencia */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <CardTitle>Tendencia Diaria</CardTitle>
              <CardDescription>
                Evolución del promedio de {info.label} en los últimos {days}{" "}
                días
              </CardDescription>
            </div>
            <Select
              value={trendMetric}
              onValueChange={v => setTrendMetric(v as typeof trendMetric)}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.keys(METRIC_INFO).map(m => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {loadingTrend ? (
            <div className="h-64 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : trendData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-muted-foreground text-sm">
              Sin datos para este período
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="fecha" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} unit={info.unit} />
                  <Tooltip
                    formatter={(v: number) => [
                      `${v.toFixed(info.unit === "" ? 3 : 0)} ${info.unit}`,
                      "Promedio",
                    ]}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="Promedio"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Distribución por calificación */}
      {summary && Object.values(summary).some(s => s.total > 0) && (
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Calificación</CardTitle>
            <CardDescription>
              Número de mediciones buenas, a mejorar y deficientes por métrica
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={Object.entries(summary).map(([metric, d]) => ({
                    metric,
                    Buenas: d.good,
                    "A mejorar": d.needsImprovement,
                    Deficientes: d.poor,
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="metric" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Buenas" fill="#22c55e" />
                  <Bar dataKey="A mejorar" fill="#f59e0b" />
                  <Bar dataKey="Deficientes" fill="#ef4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Últimas mediciones */}
      {recent && recent.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Últimas Mediciones</CardTitle>
            <CardDescription>
              Las 20 métricas más recientes registradas en el sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-2 font-medium">Fecha</th>
                    <th className="text-left p-2 font-medium">Métrica</th>
                    <th className="text-right p-2 font-medium">Valor</th>
                    <th className="text-center p-2 font-medium">
                      Calificación
                    </th>
                    <th className="text-left p-2 font-medium">Página</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map(r => {
                    const mi = METRIC_INFO[r.metricName];
                    return (
                      <tr key={r.id} className="border-b hover:bg-muted/50">
                        <td className="p-2 text-muted-foreground text-xs">
                          {new Date(r.createdAt).toLocaleString("es-MX")}
                        </td>
                        <td className="p-2 font-mono font-bold">
                          {r.metricName}
                        </td>
                        <td className="p-2 text-right font-mono">
                          {Number(r.value).toFixed(mi?.unit === "" ? 3 : 0)}
                          {mi?.unit}
                        </td>
                        <td className="p-2 text-center">
                          <RatingBadge rating={r.rating} />
                        </td>
                        <td className="p-2 text-muted-foreground text-xs truncate max-w-[200px]">
                          {r.page ?? "/"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Leyenda de umbrales */}
      <Card className="bg-slate-50 dark:bg-slate-900">
        <CardHeader>
          <CardTitle className="text-sm">
            Umbrales de Referencia (Google)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
            {Object.entries(METRIC_INFO).map(([metric, minfo]) => (
              <div key={metric} className="space-y-1">
                <p className="font-bold">{metric}</p>
                <p className="text-green-700">
                  ✓ Bueno: ≤ {minfo.goodThreshold}
                  {minfo.unit}
                </p>
                <p className="text-yellow-700">
                  ⚠ Mejorar: ≤ {minfo.poorThreshold}
                  {minfo.unit}
                </p>
                <p className="text-red-700">
                  ✗ Deficiente: &gt; {minfo.poorThreshold}
                  {minfo.unit}
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
