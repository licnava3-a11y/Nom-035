/**
 * Dashboard de Análisis Predictivo de Rotación
 * Visualiza predicciones de rotación basadas en análisis de sentimiento, casos y encuestas NOM-035
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { TrendingUp, TrendingDown, Users, AlertTriangle, Lightbulb, Target, Clock, BarChart3, FileDown, Loader2 } from "lucide-react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function PredictiveTurnoverDashboard() {
  const [selectedDepartment, setSelectedDepartment] = useState<number | undefined>(undefined);
  const [showRecommendations, setShowRecommendations] = useState(false);

  // Mutation: generar reporte PDF
  const generatePDF = trpc.predictiveReports.generatePredictivePDF.useMutation({
    onSuccess: (data) => {
      toast.success("Reporte PDF generado exitosamente");
      window.open(data.pdfUrl, "_blank");
    },
    onError: (error) => {
      toast.error(error.message || "Error al generar reporte PDF");
    },
  });

  const utils = trpc.useUtils();

  // Query: métricas predictivas
  const { data: metrics = [], isLoading: metricsLoading } = trpc.predictiveTurnoverDashboard.getPredictiveMetrics.useQuery({
    departmentId: selectedDepartment,
  });

  // Query: empleados en riesgo alto
  const { data: highRiskEmployees = [], isLoading: employeesLoading } = trpc.predictiveTurnoverDashboard.getHighRiskEmployees.useQuery({
    departmentId: selectedDepartment,
    limit: 20,
  });

  // Mutation: generar recomendaciones
  const generateRecommendations = trpc.predictiveTurnoverDashboard.generateRetentionRecommendations.useMutation({
    onSuccess: (data) => {
      setRecommendationsData(data);
      setShowRecommendations(true);
      toast.success("Recomendaciones generadas exitosamente");
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const [recommendationsData, setRecommendationsData] = useState<any>(null);

  // Determinar color por nivel de riesgo
  const getRiskColor = (riskLevel: string) => {
    switch (riskLevel) {
      case "critical":
        return { bg: "bg-red-100", text: "text-red-800", border: "border-red-300" };
      case "high":
        return { bg: "bg-orange-100", text: "text-orange-800", border: "border-orange-300" };
      case "medium":
        return { bg: "bg-yellow-100", text: "text-yellow-800", border: "border-yellow-300" };
      default:
        return { bg: "bg-green-100", text: "text-green-800", border: "border-green-300" };
    }
  };

  // Datos para gráfico de probabilidad de rotación
  const barChartData = {
    labels: metrics.map(m => m.departmentName),
    datasets: [
      {
        label: "Probabilidad de Rotación (%)",
        data: metrics.map(m => m.turnoverProbability),
        backgroundColor: metrics.map(m => {
          if (m.riskLevel === "critical") return "rgba(239, 68, 68, 0.8)";
          if (m.riskLevel === "high") return "rgba(249, 115, 22, 0.8)";
          if (m.riskLevel === "medium") return "rgba(234, 179, 8, 0.8)";
          return "rgba(34, 197, 94, 0.8)";
        }),
        borderColor: metrics.map(m => {
          if (m.riskLevel === "critical") return "rgba(239, 68, 68, 1)";
          if (m.riskLevel === "high") return "rgba(249, 115, 22, 1)";
          if (m.riskLevel === "medium") return "rgba(234, 179, 8, 1)";
          return "rgba(34, 197, 94, 1)";
        }),
        borderWidth: 2,
      },
    ],
  };

  const barChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (context: any) => {
            const metric = metrics[context.dataIndex];
            return [
              `Probabilidad: ${context.parsed.y}%`,
              `Empleados: ${metric.totalEmployees}`,
              `Comentarios críticos: ${metric.criticalComments}`,
              `Casos abiertos: ${metric.openCases}`,
              `Encuestas de riesgo: ${metric.highRiskSurveys}`,
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
          callback: (value: any) => `${value}%`,
        },
      },
    },
  };

  // Calcular estadísticas globales
  const totalEmployees = metrics.reduce((sum, m) => sum + m.totalEmployees, 0);
  const avgTurnoverProbability = metrics.length > 0
    ? Math.round(metrics.reduce((sum, m) => sum + m.turnoverProbability, 0) / metrics.length)
    : 0;
  const criticalDepartments = metrics.filter(m => m.riskLevel === "critical" || m.riskLevel === "high").length;

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Análisis Predictivo de Rotación</h1>
          <p className="text-muted-foreground mt-1">
            Predicciones basadas en análisis de sentimiento, casos y encuestas NOM-035
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => generatePDF.mutate({ includeConfusionMatrix: true, includeEvolution: true, includeRecommendations: true })}
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
          <Select
            value={selectedDepartment?.toString() || "all"}
            onValueChange={(value) => setSelectedDepartment(value === "all" ? undefined : parseInt(value))}
          >
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Todos los departamentos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los departamentos</SelectItem>
              {metrics.map((metric) => (
                <SelectItem key={metric.departmentId} value={metric.departmentId.toString()}>
                  {metric.departmentName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Cards de Estadísticas Globales */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Total Empleados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalEmployees}</div>
            <p className="text-xs text-muted-foreground mt-1">
              En {metrics.length} departamento{metrics.length !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Probabilidad Promedio
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgTurnoverProbability}%</div>
            <p className="text-xs text-muted-foreground mt-1">
              {avgTurnoverProbability >= 50 ? "Riesgo alto" : avgTurnoverProbability >= 25 ? "Riesgo medio" : "Riesgo bajo"}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Departamentos Críticos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{criticalDepartments}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Con riesgo alto o crítico
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Probabilidad de Rotación por Departamento */}
      {metrics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Probabilidad de Rotación por Departamento</CardTitle>
            <CardDescription>
              Predicción basada en comentarios críticos, casos abiertos y encuestas de riesgo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px]">
              <Bar data={barChartData} options={barChartOptions} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabla de Empleados en Riesgo Alto */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Empleados en Riesgo Alto de Rotación</CardTitle>
              <CardDescription>
                Empleados con 2+ comentarios críticos en los últimos 90 días
              </CardDescription>
            </div>
            <Badge variant="destructive">{highRiskEmployees.length} empleados</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {employeesLoading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando empleados...</div>
          ) : highRiskEmployees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay empleados en riesgo alto en este momento</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Nombre</th>
                    <th className="text-left p-3 font-medium">Departamento</th>
                    <th className="text-center p-3 font-medium">Comentarios Críticos</th>
                    <th className="text-center p-3 font-medium">Último Nivel de Riesgo NOM-035</th>
                    <th className="text-center p-3 font-medium">Puntuación de Riesgo</th>
                  </tr>
                </thead>
                <tbody>
                  {highRiskEmployees.map((employee) => (
                    <tr key={employee.userId} className="border-b hover:bg-muted/50">
                      <td className="p-3">
                        <div>
                          <p className="font-medium">{employee.userName}</p>
                          <p className="text-xs text-muted-foreground">{employee.userEmail}</p>
                        </div>
                      </td>
                      <td className="p-3">{employee.departmentName}</td>
                      <td className="p-3 text-center">
                        <Badge variant="destructive">{employee.criticalCommentsCount}</Badge>
                      </td>
                      <td className="p-3 text-center">
                        <Badge
                          className={
                            employee.lastSurveyRiskLevel === "Muy alto" || employee.lastSurveyRiskLevel === "Alto"
                              ? "bg-red-100 text-red-800"
                              : "bg-gray-100 text-gray-800"
                          }
                        >
                          {employee.lastSurveyRiskLevel}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <span className="font-bold">{employee.riskScore}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sección de Recomendaciones de Retención */}
      {selectedDepartment && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Lightbulb className="h-5 w-5" />
                  Recomendaciones de Retención
                </CardTitle>
                <CardDescription>
                  Generadas por IA basadas en análisis de datos del departamento
                </CardDescription>
              </div>
              <Button
                onClick={() => generateRecommendations.mutate({ departmentId: selectedDepartment })}
                disabled={generateRecommendations.isPending}
              >
                {generateRecommendations.isPending ? "Generando..." : "Generar Recomendaciones"}
              </Button>
            </div>
          </CardHeader>
          {showRecommendations && recommendationsData && (
            <CardContent className="space-y-6">
              {/* Problemas Principales */}
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  Problemas Principales Identificados
                </h3>
                <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                  {recommendationsData.mainIssues.map((issue: string, index: number) => (
                    <li key={index}>{issue}</li>
                  ))}
                </ul>
              </div>

              {/* Recomendaciones */}
              <div>
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  Recomendaciones Accionables
                </h3>
                <div className="space-y-4">
                  {recommendationsData.recommendations.map((rec: any, index: number) => (
                    <Card key={index} className="border-l-4 border-l-blue-600">
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-base">{rec.title}</CardTitle>
                          <div className="flex gap-2">
                            <Badge
                              className={
                                rec.expectedImpact === "Alto"
                                  ? "bg-green-100 text-green-800"
                                  : rec.expectedImpact === "Medio"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-gray-100 text-gray-800"
                              }
                            >
                              {rec.expectedImpact}
                            </Badge>
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {rec.timeline}
                            </Badge>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-sm text-muted-foreground">{rec.description}</p>
                        <div>
                          <p className="text-sm font-medium mb-2">Métricas de Éxito:</p>
                          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                            {rec.successMetrics.map((metric: string, idx: number) => (
                              <li key={idx}>{metric}</li>
                            ))}
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
