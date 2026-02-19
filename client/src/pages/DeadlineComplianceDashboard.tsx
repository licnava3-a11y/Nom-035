import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  Users,
  FileText,
  AlertCircle,
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import { Breadcrumb } from "@/components/Breadcrumb";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function DeadlineComplianceDashboard() {
  const [period, setPeriod] = useState<number>(90);

  const { data: metrics, isLoading } = trpc.committeeOperatingRules.getDeadlineComplianceMetrics.useQuery({
    days: period,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Cargando métricas de cumplimiento...</p>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="container mx-auto py-6">
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No hay datos disponibles</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Configuración de gráfico de tendencias mensuales
  const monthlyTrendsData = {
    labels: metrics.monthlyTrends.map((t) => t.month),
    datasets: [
      {
        label: "Tasa de Cumplimiento (%)",
        data: metrics.monthlyTrends.map((t) => t.rate),
        borderColor: "rgb(34, 197, 94)",
        backgroundColor: "rgba(34, 197, 94, 0.1)",
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const monthlyTrendsOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            const dataIndex = context.dataIndex;
            const trend = metrics.monthlyTrends[dataIndex];
            return [
              `Tasa: ${trend.rate.toFixed(1)}%`,
              `A tiempo: ${trend.compliant}/${trend.total}`,
            ];
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: function (value: any) {
            return value + "%";
          },
        },
      },
    },
  };

  // Configuración de gráfico de distribución de tiempos
  const responseDistData = {
    labels: ["< 24 horas", "1-3 días", "3-7 días", "> 7 días"],
    datasets: [
      {
        label: "Cantidad de Aprobaciones",
        data: [
          metrics.responseDistribution.lessThan24h,
          metrics.responseDistribution.between1And3Days,
          metrics.responseDistribution.between3And7Days,
          metrics.responseDistribution.moreThan7Days,
        ],
        backgroundColor: [
          "rgba(34, 197, 94, 0.8)",
          "rgba(59, 130, 246, 0.8)",
          "rgba(251, 191, 36, 0.8)",
          "rgba(239, 68, 68, 0.8)",
        ],
      },
    ],
  };

  const responseDistOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
  };

  // Configuración de gráfico de ranking de aprobadores
  const approverRankingData = {
    labels: metrics.approverRanking.map((a) => a.name),
    datasets: [
      {
        label: "Tiempo Promedio (horas)",
        data: metrics.approverRanking.map((a) => a.avgResponseTime),
        backgroundColor: metrics.approverRanking.map((a) =>
          a.avgResponseTime > 168 ? "rgba(239, 68, 68, 0.8)" : "rgba(59, 130, 246, 0.8)"
        ),
      },
    ],
  };

  const approverRankingOptions = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: "y" as const,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: function (context: any) {
            const dataIndex = context.dataIndex;
            const approver = metrics.approverRanking[dataIndex];
            return [
              `Tiempo promedio: ${approver.avgResponseTime.toFixed(1)} horas`,
              `Tasa a tiempo: ${approver.onTimeRate.toFixed(1)}%`,
              `Total aprobaciones: ${approver.totalApprovals}`,
            ];
          },
        },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Breadcrumb items={[
        { label: "Comité", href: "/committee" },
        { label: "Cumplimiento de Plazos" }
      ]} />
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard de Cumplimiento de Plazos</h1>
          <p className="text-muted-foreground mt-1">
            Análisis de eficiencia y cuellos de botella en aprobaciones
          </p>
        </div>
        <Select value={period.toString()} onValueChange={(value) => setPeriod(parseInt(value))}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30">Últimos 30 días</SelectItem>
            <SelectItem value="90">Últimos 90 días</SelectItem>
            <SelectItem value="180">Últimos 180 días</SelectItem>
            <SelectItem value="365">Último año</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Métricas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Cumplimiento</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {metrics.summary.complianceRate}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.summary.completedOnTime} de {metrics.summary.totalWithDeadline} a tiempo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tiempo Promedio de Respuesta</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {metrics.summary.avgResponseTime.toFixed(1)}h
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {(metrics.summary.avgResponseTime / 24).toFixed(1)} días promedio
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aprobaciones Vencidas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {metrics.summary.overdue}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.summary.overdueRate.toFixed(1)}% del total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total con Deadline</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.summary.totalWithDeadline}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.summary.completed} completadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aprobadores Activos</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics.approverRanking.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.bottlenecks.length} con retrasos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tendencia</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.monthlyTrends.length > 0
                ? metrics.monthlyTrends[metrics.monthlyTrends.length - 1].rate.toFixed(1)
                : "0"}
              %
            </div>
            <p className="text-xs text-muted-foreground mt-1">Mes actual</p>
          </CardContent>
        </Card>
      </div>

      {/* Alertas de cuellos de botella */}
      {metrics.bottlenecks.length > 0 && (
        <Card className="border-red-200 bg-red-50 dark:bg-red-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
              <AlertCircle className="h-5 w-5" />
              Cuellos de Botella Detectados
            </CardTitle>
            <CardDescription>
              Los siguientes aprobadores tienen un tiempo promedio de respuesta mayor a 7 días
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {metrics.bottlenecks.map((name, index) => (
                <Badge key={index} variant="destructive">
                  {name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tendencias mensuales */}
        <Card>
          <CardHeader>
            <CardTitle>Tendencias de Cumplimiento</CardTitle>
            <CardDescription>Últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ height: "300px" }}>
              <Line data={monthlyTrendsData} options={monthlyTrendsOptions} />
            </div>
          </CardContent>
        </Card>

        {/* Distribución de tiempos */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución de Tiempos de Respuesta</CardTitle>
            <CardDescription>Aprobaciones completadas por rango de tiempo</CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ height: "300px" }}>
              <Bar data={responseDistData} options={responseDistOptions} />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Ranking de aprobadores */}
      <Card>
        <CardHeader>
          <CardTitle>Ranking de Aprobadores por Velocidad</CardTitle>
          <CardDescription>
            Top 10 aprobadores ordenados por tiempo promedio de respuesta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div style={{ height: "400px" }}>
            <Bar data={approverRankingData} options={approverRankingOptions} />
          </div>
        </CardContent>
      </Card>

      {/* Análisis por rol */}
      <Card>
        <CardHeader>
          <CardTitle>Análisis por Rol</CardTitle>
          <CardDescription>Comparativa de desempeño por rol en el comité</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {metrics.roleAnalysis.map((role) => (
              <div key={role.role} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="font-medium">{role.label}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {role.total} aprobaciones
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Tiempo Promedio</div>
                    <div className="font-medium">
                      {role.avgResponseTime > 0 ? `${role.avgResponseTime.toFixed(1)}h` : "N/A"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Tasa a Tiempo</div>
                    <div className="font-medium">
                      {role.onTimeRate > 0 ? `${role.onTimeRate.toFixed(1)}%` : "N/A"}
                    </div>
                  </div>
                  <Badge
                    variant={
                      role.avgResponseTime > 168
                        ? "destructive"
                        : role.avgResponseTime > 72
                        ? "default"
                        : "secondary"
                    }
                  >
                    {role.avgResponseTime > 168
                      ? "Lento"
                      : role.avgResponseTime > 72
                      ? "Normal"
                      : "Rápido"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Documentos más lentos */}
      <Card>
        <CardHeader>
          <CardTitle>Documentos con Mayor Tiempo de Aprobación</CardTitle>
          <CardDescription>Top 10 aprobaciones que tomaron más tiempo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {metrics.slowestDocuments.length > 0 ? (
              metrics.slowestDocuments.map((doc, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{doc.version}</div>
                    <div className="text-sm text-muted-foreground">{doc.approverName}</div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-medium">
                        {doc.responseTime.toFixed(1)} horas
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {(doc.responseTime / 24).toFixed(1)} días
                      </div>
                    </div>
                    {doc.wasOnTime !== null && (
                      <Badge variant={doc.wasOnTime ? "secondary" : "destructive"}>
                        {doc.wasOnTime ? "A tiempo" : "Vencido"}
                      </Badge>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No hay datos suficientes
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
