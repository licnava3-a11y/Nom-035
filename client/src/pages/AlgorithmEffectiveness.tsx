import { useState } from "react";
// DashboardLayout is already wrapped by App.tsx route
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import { trpc } from "@/lib/trpc";
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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function AlgorithmEffectiveness() {
  const [months] = useState(12);

  // Queries
  const accuracyMetricsQuery = trpc.algorithmEffectiveness.getAccuracyMetrics.useQuery({});
  const trendsQuery = trpc.algorithmEffectiveness.getPredictionTrends.useQuery({ months });
  const historyQuery = trpc.algorithmEffectiveness.getPredictionHistory.useQuery({
    page: 1,
    pageSize: 10,
  });

  const accuracyMetrics = accuracyMetricsQuery.data;
  const trends = trendsQuery.data || [];
  const history = historyQuery.data;

  // Preparar datos para gráfico de tendencias
  const trendsChartData = {
    labels: trends.map((t) => t.month),
    datasets: [
      {
        label: "Tasa Predicha (%)",
        data: trends.map((t) => t.avgPredictedRate),
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        tension: 0.4,
      },
      {
        label: "Tasa Real (%)",
        data: trends.map((t) => t.avgActualRate),
        borderColor: "rgb(239, 68, 68)",
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        tension: 0.4,
      },
      {
        label: "Precisión (%)",
        data: trends.map((t) => t.avgAccuracy),
        borderColor: "rgb(34, 197, 94)",
        backgroundColor: "rgba(34, 197, 94, 0.1)",
        tension: 0.4,
      },
    ],
  };

  const trendsChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
      title: {
        display: false,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
      },
    },
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Efectividad del Algoritmo Predictivo</h1>
          <p className="text-muted-foreground">
            Análisis de precisión y comparativa entre predicciones y rotación real
          </p>
        </div>

        {/* Métricas de Precisión */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Predicciones
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{accuracyMetrics?.totalPredictions || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">Evaluadas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Precisión Promedio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {accuracyMetrics?.averageAccuracy.toFixed(1) || 0}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">Del algoritmo</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Error Promedio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">
                {accuracyMetrics?.averageError.toFixed(1) || 0}%
              </div>
              <p className="text-xs text-muted-foreground mt-1">Desviación</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Alta Precisión
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{accuracyMetrics?.highAccuracyCount || 0}</div>
              <p className="text-xs text-muted-foreground mt-1">≥80% precisión</p>
            </CardContent>
          </Card>
        </div>

        {/* Gráfico de Tendencias */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Tendencias de Predicción vs Realidad</CardTitle>
            <CardDescription>
              Comparación mensual de tasas predichas, reales y precisión del algoritmo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div style={{ height: "400px" }}>
              {trends.length > 0 ? (
                <Line data={trendsChartData} options={trendsChartOptions} />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No hay datos de tendencias disponibles
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabla de Histórico */}
        <Card>
          <CardHeader>
            <CardTitle>Histórico de Predicciones</CardTitle>
            <CardDescription>Últimas 10 predicciones realizadas por el algoritmo</CardDescription>
          </CardHeader>
          <CardContent>
            {history && history.predictions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4">Departamento</th>
                      <th className="text-left py-3 px-4">Fecha Predicción</th>
                      <th className="text-right py-3 px-4">Score Riesgo</th>
                      <th className="text-right py-3 px-4">Tasa Predicha</th>
                      <th className="text-right py-3 px-4">Tasa Real</th>
                      <th className="text-right py-3 px-4">Precisión</th>
                      <th className="text-center py-3 px-4">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.predictions.map((pred) => (
                      <tr key={pred.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4">{pred.departmentName}</td>
                        <td className="py-3 px-4">
                          {new Date(pred.predictionDate).toLocaleDateString("es-MX")}
                        </td>
                        <td className="text-right py-3 px-4">
                          <span
                            className={`font-semibold ${
                              pred.predictedRiskScore >= 60
                                ? "text-red-600"
                                : pred.predictedRiskScore >= 30
                                ? "text-yellow-600"
                                : "text-green-600"
                            }`}
                          >
                            {pred.predictedRiskScore}
                          </span>
                        </td>
                        <td className="text-right py-3 px-4">
                          {pred.predictedTurnoverRate
                            ? `${Number(pred.predictedTurnoverRate).toFixed(1)}%`
                            : "-"}
                        </td>
                        <td className="text-right py-3 px-4">
                          {pred.actualTurnoverRate
                            ? `${Number(pred.actualTurnoverRate).toFixed(1)}%`
                            : "-"}
                        </td>
                        <td className="text-right py-3 px-4">
                          {pred.accuracyScore ? `${Number(pred.accuracyScore).toFixed(1)}%` : "-"}
                        </td>
                        <td className="text-center py-3 px-4">
                          <span
                            className={`px-2 py-1 rounded-full text-xs ${
                              pred.status === "evaluated"
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {pred.status === "evaluated" ? "Evaluado" : "Pendiente"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No hay predicciones registradas
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
