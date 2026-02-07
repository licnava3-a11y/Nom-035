import { useState } from "react";
import { trpc } from "../lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { BarChart3, TrendingUp, AlertTriangle, CheckCircle2, Users, FileText } from "lucide-react";
import { toast } from "sonner";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

export default function Nom035AdminPanel() {
  const [surveyType, setSurveyType] = useState<"guia_i" | "guia_ii" | "guia_iii">("guia_i");
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | undefined>();
  const [comparisonPeriods, setComparisonPeriods] = useState<number[]>([]);

  // Mutations para exportación
  const exportExcelMutation = trpc.nom035Admin.exportToExcel.useMutation({
    onSuccess: (data: any) => {
      // Crear archivo Excel y descargar usando base64
      const byteCharacters = atob(data.base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Reporte exportado exitosamente');
    },
    onError: (error: any) => {
      toast.error(`Error al exportar: ${error.message}`);
    },
  });

  const exportPDFMutation = trpc.nom035Admin.exportToPDF.useMutation({
    onSuccess: (data: any) => {
      // Crear archivo PDF y descargar usando base64
      const byteCharacters = atob(data.base64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = data.filename;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success('Reporte exportado exitosamente');
    },
    onError: (error: any) => {
      toast.error(`Error al exportar: ${error.message}`);
    },
  });

  // Funciones de exportación
  const handleExportExcel = () => {
    exportExcelMutation.mutate({
      periodId: selectedPeriodId,
      surveyType,
    });
  };

  const handleExportPDF = () => {
    exportPDFMutation.mutate({
      periodId: selectedPeriodId,
      surveyType,
    });
  };

  // Queries
  const { data: periods } = trpc.surveyPeriods.list.useQuery({
    surveyType,
  });

  const { data: stats } = trpc.nom035Admin.getStats.useQuery({
    periodId: selectedPeriodId,
    surveyType,
  });

  const { data: departmentResults } = trpc.nom035Admin.getResultsByDepartment.useQuery({
    periodId: selectedPeriodId,
    surveyType,
  });

  const { data: comparison } = trpc.nom035Admin.comparePeriods.useQuery(
    {
      periodIds: comparisonPeriods,
      surveyType,
    },
    {
      enabled: comparisonPeriods.length >= 2,
    }
  );

  const { data: trends } = trpc.nom035Admin.getTrends.useQuery({
    surveyType,
    limit: 12,
  });

  const { data: recommendations } = trpc.nom035Admin.getRecommendations.useQuery(
    {
      periodId: selectedPeriodId!,
      surveyType,
    },
    {
      enabled: !!selectedPeriodId,
    }
  );

  // Colores para gráficas
  // Colores oficiales según NOM-035-STPS-2018
  const riskColors = {
    "Nulo": "#10b981",      // Verde - Sin riesgo
    "Bajo": "#3b82f6",      // Azul - Riesgo mínimo
    "Medio": "#f59e0b",     // Naranja - Riesgo moderado
    "Alto": "#ef4444",      // Rojo - Riesgo significativo
    "Muy Alto": "#991b1b",  // Rojo oscuro - Riesgo crítico
  };

  // Datos para gráfica de distribución de riesgo
  const riskDistributionData = {
    labels: stats?.riskDistribution.map(r => r.level) || [],
    datasets: [
      {
        data: stats?.riskDistribution.map(r => r.count) || [],
        backgroundColor: stats?.riskDistribution.map(r => riskColors[r.level as keyof typeof riskColors] || "#6b7280") || [],
        borderWidth: 0,
      },
    ],
  };

  // Datos para gráfica de resultados por departamento
  const departmentData = {
    labels: departmentResults?.map(d => d.departamento) || [],
    datasets: [
      {
        label: "Promedio de Puntuación",
        data: departmentResults?.map(d => d.avgScore) || [],
        backgroundColor: "#3b82f6",
        borderRadius: 8,
      },
      {
        label: "% Alto Riesgo",
        data: departmentResults?.map(d => d.highRiskPercentage) || [],
        backgroundColor: "#ef4444",
        borderRadius: 8,
      },
    ],
  };

  // Datos para gráfica de comparación entre periodos
  const comparisonData = {
    labels: comparison?.stats.map(s => s.periodName) || [],
    datasets: [
      {
        label: "Tasa de Completitud (%)",
        data: comparison?.stats.map(s => s.completionRate) || [],
        backgroundColor: "#3b82f6",
        borderRadius: 8,
      },
      {
        label: "% Alto Riesgo",
        data: comparison?.stats.map(s => s.highRiskPercentage) || [],
        backgroundColor: "#ef4444",
        borderRadius: 8,
      },
    ],
  };

  // Datos para gráfica de tendencias
  const trendsData = {
    labels: trends?.map(t => t.periodName) || [],
    datasets: [
      {
        label: "Puntuación Promedio",
        data: trends?.map(t => t.avgScore) || [],
        borderColor: "#3b82f6",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        tension: 0.4,
        fill: true,
      },
      {
        label: "% Alto Riesgo",
        data: trends?.map(t => t.highRiskPercentage) || [],
        borderColor: "#ef4444",
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const handleTogglePeriodComparison = (periodId: number) => {
    if (comparisonPeriods.includes(periodId)) {
      setComparisonPeriods(comparisonPeriods.filter(id => id !== periodId));
    } else {
      if (comparisonPeriods.length >= 5) {
        toast.error("Máximo 5 periodos para comparar");
        return;
      }
      setComparisonPeriods([...comparisonPeriods, periodId]);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "Alta":
        return "destructive";
      case "Media":
        return "default";
      case "Baja":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-3xl font-bold">Panel de Administración NOM-035</h1>
          <p className="text-muted-foreground mt-2">
            Análisis comparativo, tendencias históricas y recomendaciones automáticas
          </p>
        </div>

        {/* Filtros Globales */}
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Tipo de Encuesta</label>
            <Select value={surveyType} onValueChange={(v: any) => setSurveyType(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="guia_i">Guía I - Identificación de factores de riesgo</SelectItem>
                <SelectItem value="guia_ii">Guía II - Identificación y análisis (16-50 trabajadores)</SelectItem>
                <SelectItem value="guia_iii">Guía III - Identificación y análisis (más de 50 trabajadores)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Periodo</label>
            <Select
              value={selectedPeriodId?.toString() || "all"}
              onValueChange={(v) => setSelectedPeriodId(v === "all" ? undefined : parseInt(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Todos los periodos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los periodos</SelectItem>
                {periods?.map((period: any) => (
                  <SelectItem key={period.id} value={period.id.toString()}>
                    {period.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Botones de Exportación */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => handleExportExcel()}
              disabled={!stats || stats.total === 0}
            >
              <FileText className="h-4 w-4 mr-2" />
              Exportar a Excel
            </Button>
            <Button
              variant="outline"
              onClick={() => handleExportPDF()}
              disabled={!stats || stats.total === 0}
            >
              <FileText className="h-4 w-4 mr-2" />
              Exportar a PDF
            </Button>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Resumen General</TabsTrigger>
          <TabsTrigger value="comparison">Comparación entre Periodos</TabsTrigger>
          <TabsTrigger value="trends">Tendencias Históricas</TabsTrigger>
          <TabsTrigger value="recommendations">Recomendaciones</TabsTrigger>
        </TabsList>

        {/* Resumen General */}
        <TabsContent value="overview" className="space-y-6">
          {/* Tarjetas de Estadísticas */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Respuestas</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.total || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Respuestas registradas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Completadas</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.completed || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.total ? Math.round((stats.completed / stats.total) * 100) : 0}% del total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">En Progreso</CardTitle>
                <Users className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.inProgress || 0}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Encuestas iniciadas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Alto Riesgo</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.riskDistribution
                    .filter(r => r.level === "Alto" || r.level === "Muy Alto")
                    .reduce((sum, r) => sum + r.count, 0) || 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Requieren atención
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Leyenda de Niveles de Riesgo */}
          <Card>
            <CardHeader>
              <CardTitle>Leyenda de Niveles de Riesgo NOM-035-STPS-2018</CardTitle>
              <CardDescription>
                Clasificación oficial de niveles de riesgo psicosocial
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded" style={{ backgroundColor: riskColors["Nulo"] }}></div>
                  <div>
                    <p className="font-semibold text-sm">Nulo o Despreciable</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      No requiere acciones correctivas. Mantener condiciones actuales.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded" style={{ backgroundColor: riskColors["Bajo"] }}></div>
                  <div>
                    <p className="font-semibold text-sm">Bajo</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Riesgo mínimo. Implementar acciones de mejora continua.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded" style={{ backgroundColor: riskColors["Medio"] }}></div>
                  <div>
                    <p className="font-semibold text-sm">Medio</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Riesgo moderado. Acciones correctivas en plazo de 1 año.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded" style={{ backgroundColor: riskColors["Alto"] }}></div>
                  <div>
                    <p className="font-semibold text-sm">Alto</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Riesgo significativo. Intervención urgente requerida.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded" style={{ backgroundColor: riskColors["Muy Alto"] }}></div>
                  <div>
                    <p className="font-semibold text-sm">Muy Alto</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Riesgo crítico. Intervención inmediata del comité.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gráficas */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Distribución por Nivel de Riesgo</CardTitle>
                <CardDescription>
                  Clasificación de respuestas completadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center">
                  {stats?.riskDistribution.length ? (
                    <Doughnut
                      data={riskDistributionData}
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
                  ) : (
                    <p className="text-muted-foreground">No hay datos disponibles</p>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resultados por Departamento</CardTitle>
                <CardDescription>
                  Puntuación promedio y porcentaje de alto riesgo
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {departmentResults?.length ? (
                    <Bar
                      data={departmentData}
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
                          },
                        },
                      }}
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-muted-foreground">No hay datos disponibles</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Comparación entre Periodos */}
        <TabsContent value="comparison" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Seleccionar Periodos para Comparar</CardTitle>
              <CardDescription>
                Selecciona de 2 a 5 periodos para comparar sus resultados (máximo 5)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {periods?.map((period: any) => (
                  <Button
                    key={period.id}
                    variant={comparisonPeriods.includes(period.id) ? "default" : "outline"}
                    onClick={() => handleTogglePeriodComparison(period.id)}
                    className="justify-start"
                  >
                    {period.name}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {comparison && comparisonPeriods.length >= 2 && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Gráfica Comparativa</CardTitle>
                  <CardDescription>
                    Comparación de tasas de completitud y porcentajes de alto riesgo
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    <Bar
                      data={comparisonData}
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
                            max: 100,
                          },
                        },
                      }}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Tabla Comparativa</CardTitle>
                  <CardDescription>
                    Estadísticas detalladas por periodo
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left p-2">Periodo</th>
                          <th className="text-right p-2">Total Respuestas</th>
                          <th className="text-right p-2">Completadas</th>
                          <th className="text-right p-2">Tasa Completitud</th>
                          <th className="text-right p-2">Puntuación Promedio</th>
                          <th className="text-right p-2">Alto Riesgo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comparison.stats.map((stat) => (
                          <tr key={stat.periodId} className="border-b">
                            <td className="p-2 font-medium">{stat.periodName}</td>
                            <td className="text-right p-2">{stat.totalResponses}</td>
                            <td className="text-right p-2">{stat.completedResponses}</td>
                            <td className="text-right p-2">{stat.completionRate}%</td>
                            <td className="text-right p-2">{stat.avgScore}</td>
                            <td className="text-right p-2">{stat.highRiskPercentage}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {comparisonPeriods.length < 2 && (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Selecciona al menos 2 periodos para ver la comparación</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tendencias Históricas */}
        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Evolución Temporal</CardTitle>
              <CardDescription>
                Tendencias de puntuación promedio y porcentaje de alto riesgo en los últimos periodos cerrados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                {trends?.length ? (
                  <Line
                    data={trendsData}
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
                        },
                      },
                    }}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No hay periodos cerrados suficientes para mostrar tendencias</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recomendaciones */}
        <TabsContent value="recommendations" className="space-y-6">
          {recommendations ? (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Estadísticas del Periodo</CardTitle>
                  <CardDescription>
                    Resumen de resultados para generar recomendaciones
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Completadas</p>
                      <p className="text-2xl font-bold">{recommendations.stats.totalCompleted}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Puntuación Promedio</p>
                      <p className="text-2xl font-bold">{recommendations.stats.avgScore}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">% Alto Riesgo</p>
                      <p className="text-2xl font-bold text-red-600">
                        {recommendations.stats.highRiskPercentage}%
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">% Riesgo Medio</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {recommendations.stats.mediumRiskPercentage}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-4">
                {recommendations.recommendations.map((rec, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <CardTitle>{rec.category}</CardTitle>
                            <Badge variant={getPriorityColor(rec.priority)}>
                              Prioridad {rec.priority}
                            </Badge>
                          </div>
                          <CardDescription>{rec.recommendation}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <p className="font-medium text-sm">Acciones Recomendadas:</p>
                        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                          {rec.actions.map((action, actionIndex) => (
                            <li key={actionIndex}>{action}</li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {recommendations.recommendations.length === 0 && (
                <Card>
                  <CardContent className="py-12">
                    <div className="text-center text-muted-foreground">
                      <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-green-600 opacity-50" />
                      <p>No se generaron recomendaciones específicas para este periodo</p>
                      <p className="text-sm mt-2">Los resultados están dentro de parámetros aceptables</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Selecciona un periodo específico para ver las recomendaciones automáticas</p>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
