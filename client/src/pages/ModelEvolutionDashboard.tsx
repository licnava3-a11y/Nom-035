import { useState } from "react";
import { trpc } from "../lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  FileDown,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function ModelEvolutionDashboard() {
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
  });

  // Mutation: generar reporte PDF
  const generatePDF = trpc.predictiveReports.generatePredictivePDF.useMutation({
    onSuccess: data => {
      toast.success("Reporte PDF generado exitosamente");
      window.open(data.pdfUrl, "_blank");
    },
    onError: error => {
      toast.error(error.message || "Error al generar reporte PDF");
    },
  });

  const { data, isLoading } = trpc.modelEvolution.getMetricsByMonth.useQuery({
    startDate: dateRange.startDate || undefined,
    endDate: dateRange.endDate || undefined,
  });

  if (isLoading) {
    return (
      <div className="container py-8">
        <p>Cargando evolución del modelo...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="container py-8">
        <p>No hay datos disponibles</p>
      </div>
    );
  }

  const { metricsByMonth, trend, summary } = data;

  // Preparar datos para gráficos
  const labels = metricsByMonth.map((m: any) => m.month);
  const precisionData = metricsByMonth.map((m: any) => m.precision);
  const recallData = metricsByMonth.map((m: any) => m.recall);
  const f1ScoreData = metricsByMonth.map((m: any) => m.f1Score);

  const chartData = {
    labels,
    datasets: [
      {
        label: "Precisión (%)",
        data: precisionData,
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.5)",
        tension: 0.3,
      },
      {
        label: "Recall (%)",
        data: recallData,
        borderColor: "rgb(16, 185, 129)",
        backgroundColor: "rgba(16, 185, 129, 0.5)",
        tension: 0.3,
      },
      {
        label: "F1-Score (%)",
        data: f1ScoreData,
        borderColor: "rgb(251, 146, 60)",
        backgroundColor: "rgba(251, 146, 60, 0.5)",
        tension: 0.3,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: true,
        text: "Evolución Temporal de Métricas del Modelo Predictivo",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: function (value: number | string) {
            return value + "%";
          },
        },
      },
    },
  };

  const getTrendIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (value < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  const getTrendColor = (value: number) => {
    if (value > 0) return "text-green-600";
    if (value < 0) return "text-red-600";
    return "text-gray-600";
  };

  return (
    <div className="container py-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            Evolución del Modelo Predictivo
          </h1>
          <p className="text-muted-foreground">
            Análisis temporal de precisión, recall y F1-score
          </p>
        </div>
        <Button
          onClick={() =>
            generatePDF.mutate({
              includeConfusionMatrix: true,
              includeEvolution: true,
              includeRecommendations: true,
            })
          }
          disabled={generatePDF.isPending}
          variant="outline"
        >
          {generatePDF.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generando...
            </>
          ) : (
            <>
              <FileDown className="mr-2 h-4 w-4" />
              Exportar a PDF
            </>
          )}
        </Button>
      </div>

      {/* Filtros de fecha */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Fecha Inicio
              </label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={e =>
                  setDateRange({ ...dateRange, startDate: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">
                Fecha Fin
              </label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={e =>
                  setDateRange({ ...dateRange, endDate: e.target.value })
                }
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards de resumen y tendencia */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Precisión Promedio</CardTitle>
            <CardDescription>Últimos 3 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-3xl font-bold">{summary.avgPrecision}%</p>
              <div className="flex items-center gap-2">
                {getTrendIcon(trend.precision)}
                <span
                  className={`text-sm font-medium ${getTrendColor(trend.precision)}`}
                >
                  {trend.precision > 0 ? "+" : ""}
                  {trend.precision}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recall Promedio</CardTitle>
            <CardDescription>Últimos 3 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-3xl font-bold">{summary.avgRecall}%</p>
              <div className="flex items-center gap-2">
                {getTrendIcon(trend.recall)}
                <span
                  className={`text-sm font-medium ${getTrendColor(trend.recall)}`}
                >
                  {trend.recall > 0 ? "+" : ""}
                  {trend.recall}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">F1-Score Promedio</CardTitle>
            <CardDescription>Últimos 3 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-3xl font-bold">{summary.avgF1Score}%</p>
              <div className="flex items-center gap-2">
                {getTrendIcon(trend.f1Score)}
                <span
                  className={`text-sm font-medium ${getTrendColor(trend.f1Score)}`}
                >
                  {trend.f1Score > 0 ? "+" : ""}
                  {trend.f1Score}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de línea */}
      <Card>
        <CardHeader>
          <CardTitle>Evolución Mensual de Métricas</CardTitle>
          <CardDescription>
            Comparación de precisión, recall y F1-score a lo largo del tiempo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div style={{ height: "400px" }}>
            <Line data={chartData} options={chartOptions} />
          </div>
        </CardContent>
      </Card>

      {/* Tabla de datos mensuales */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Datos Mensuales</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Mes</th>
                  <th className="text-right p-2">Precisión (%)</th>
                  <th className="text-right p-2">Recall (%)</th>
                  <th className="text-right p-2">F1-Score (%)</th>
                  <th className="text-right p-2">Total Rotación</th>
                </tr>
              </thead>
              <tbody>
                {metricsByMonth.map((row, idx) => (
                  <tr key={idx} className="border-b hover:bg-gray-50">
                    <td className="p-2">{row.month}</td>
                    <td className="text-right p-2">{row.precision}%</td>
                    <td className="text-right p-2">{row.recall}%</td>
                    <td className="text-right p-2">{row.f1Score}%</td>
                    <td className="text-right p-2">{row.totalTurnover}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
