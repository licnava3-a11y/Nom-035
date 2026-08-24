import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bar, Line, Pie } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Clock, CheckCircle, XCircle, TrendingUp } from "lucide-react";

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function ApprovalMetrics() {
  const [period, setPeriod] = useState<"month" | "quarter" | "year">("month");

  const { data: metrics, isLoading } =
    trpc.committeeOperatingRules.getApprovalMetrics.useQuery({
      period,
    });

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Cargando métricas...</div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">No hay datos disponibles</div>
        </div>
      </div>
    );
  }

  // Datos para gráfico de tasa de aprobación/rechazo
  const approvalRateData = {
    labels: ["Aprobadas", "Rechazadas", "Pendientes"],
    datasets: [
      {
        data: [
          metrics.summary.approved,
          metrics.summary.rejected,
          metrics.summary.pending,
        ],
        backgroundColor: ["#10b981", "#ef4444", "#f59e0b"],
        borderColor: ["#059669", "#dc2626", "#d97706"],
        borderWidth: 1,
      },
    ],
  };

  // Datos para gráfico de aprobadores más activos
  const topApproversData = {
    labels: metrics.topApprovers.map((a: any) => a.approverName),
    datasets: [
      {
        label: "Aprobaciones",
        data: metrics.topApprovers.map((a: any) => a.totalApprovals),
        backgroundColor: "#3b82f6",
        borderColor: "#2563eb",
        borderWidth: 1,
      },
    ],
  };

  // Datos para gráfico de tendencia mensual
  const monthlyTrendData = {
    labels: metrics.approvalsByMonth.map((m: any) => {
      const [year, month] = m.month.split("-");
      const monthNames = [
        "Ene",
        "Feb",
        "Mar",
        "Abr",
        "May",
        "Jun",
        "Jul",
        "Ago",
        "Sep",
        "Oct",
        "Nov",
        "Dic",
      ];
      return `${monthNames[parseInt(month) - 1]} ${year}`;
    }),
    datasets: [
      {
        label: "Aprobadas",
        data: metrics.approvalsByMonth.map((m: any) => m.approved),
        borderColor: "#10b981",
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        tension: 0.4,
      },
      {
        label: "Rechazadas",
        data: metrics.approvalsByMonth.map((m: any) => m.rejected),
        borderColor: "#ef4444",
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        tension: 0.4,
      },
      {
        label: "Pendientes",
        data: metrics.approvalsByMonth.map((m: any) => m.pending),
        borderColor: "#f59e0b",
        backgroundColor: "rgba(245, 158, 11, 0.1)",
        tension: 0.4,
      },
    ],
  };

  const getPeriodLabel = () => {
    switch (period) {
      case "month":
        return "Mes Actual";
      case "quarter":
        return "Trimestre Actual";
      case "year":
        return "Año Actual";
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Métricas de Aprobaciones</h1>
          <p className="text-muted-foreground mt-1">
            Análisis de eficiencia del proceso de aprobación de bases de
            funcionamiento
          </p>
        </div>
        <Select value={period} onValueChange={(value: any) => setPeriod(value)}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Seleccionar período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="month">Mes Actual</SelectItem>
            <SelectItem value="quarter">Trimestre Actual</SelectItem>
            <SelectItem value="year">Año Actual</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Cards de resumen */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Total Aprobaciones
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.summary.totalApprovals}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {getPeriodLabel()}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Tiempo Promedio
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metrics.summary.avgApprovalTime.toFixed(1)} días
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Desde solicitud hasta firma
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Tasa de Aprobación
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {metrics.summary.totalApprovals > 0
                ? (
                    (metrics.summary.approved /
                      metrics.summary.totalApprovals) *
                    100
                  ).toFixed(1)
                : 0}
              %
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.summary.approved} de {metrics.summary.totalApprovals}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Tasa de Rechazo
            </CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {metrics.summary.rejectionRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {metrics.summary.rejected} rechazadas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Gráfico de tasa de aprobación/rechazo */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución de Aprobaciones</CardTitle>
            <CardDescription>
              Proporción de aprobaciones, rechazos y pendientes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80 flex items-center justify-center">
              <Pie
                data={approvalRateData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      position: "bottom",
                    },
                  },
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Gráfico de aprobadores más activos */}
        <Card>
          <CardHeader>
            <CardTitle>Aprobadores Más Activos</CardTitle>
            <CardDescription>
              Top 5 miembros con más aprobaciones completadas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <Bar
                data={topApproversData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  indexAxis: "y",
                  plugins: {
                    legend: {
                      display: false,
                    },
                  },
                  scales: {
                    x: {
                      beginAtZero: true,
                      ticks: {
                        stepSize: 1,
                      },
                    },
                  },
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de tendencia mensual */}
      <Card>
        <CardHeader>
          <CardTitle>Tendencia Mensual de Aprobaciones</CardTitle>
          <CardDescription>
            Evolución de aprobaciones, rechazos y pendientes en los últimos 6
            meses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <Line
              data={monthlyTrendData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: "bottom",
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
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
