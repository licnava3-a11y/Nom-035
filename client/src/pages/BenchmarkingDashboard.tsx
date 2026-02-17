import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Target, BarChart3, Sparkles } from "lucide-react";
import { toast } from "sonner";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler,
} from "chart.js";
import { Bar, Radar } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  RadialLinearScale,
  PointElement,
  LineElement,
  Filler
);

export default function BenchmarkingDashboard() {
  const [selectedSectorId, setSelectedSectorId] = useState<number | null>(null);

  const { data: sectors, isLoading: loadingSectors } = trpc.benchmarking.listSectors.useQuery();
  const { data: dashboard, isLoading: loadingDashboard } = trpc.benchmarking.getDashboard.useQuery(
    { sectorId: selectedSectorId! },
    { enabled: !!selectedSectorId }
  );
  const { data: comparison, isLoading: loadingComparison } = trpc.benchmarking.getComparison.useQuery(
    { sectorId: selectedSectorId! },
    { enabled: !!selectedSectorId }
  );

  const generateRecommendationsMutation = trpc.benchmarking.generateRecommendations.useMutation({
    onSuccess: () => {
      toast.success("Recomendaciones generadas exitosamente");
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const handleGenerateRecommendations = () => {
    if (!selectedSectorId) {
      toast.error("Selecciona un sector primero");
      return;
    }
    generateRecommendationsMutation.mutate({ sectorId: selectedSectorId });
  };

  const generatePDFMutation = trpc.benchmarking.generatePDF.useMutation({
    onSuccess: (data) => {
      // Descargar PDF automáticamente
      window.open(data.url, "_blank");
      toast.success(`PDF generado exitosamente. Folio: ${data.folio}`);
    },
    onError: (error) => {
      toast.error(`Error al generar PDF: ${error.message}`);
    },
  });

  const handleExportPDF = () => {
    if (!selectedSectorId) {
      toast.error("Selecciona un sector primero");
      return;
    }
    generatePDFMutation.mutate({ sectorId: selectedSectorId });
  };

  // Preparar datos para gráfico de radar
  const radarData = comparison
    ? {
        labels: comparison.comparisons.map((c) => c.metric),
        datasets: [
          {
            label: "Organización",
            data: comparison.comparisons.map((c) => {
              // Normalizar a escala 0-100
              if (c.unit === "porcentaje") return c.orgValue;
              if (c.unit === "días") return (c.orgValue / 50) * 100; // Normalizar días (max 50)
              if (c.unit === "casos") return (c.orgValue / 20) * 100; // Normalizar casos (max 20)
              if (c.unit === "escala 1-5") return (c.orgValue / 5) * 100; // Normalizar escala
              return c.orgValue;
            }),
            backgroundColor: "rgba(59, 130, 246, 0.2)",
            borderColor: "rgb(59, 130, 246)",
            borderWidth: 2,
          },
          {
            label: "Promedio Sectorial",
            data: comparison.comparisons.map((c) => {
              // Normalizar a escala 0-100
              if (c.unit === "porcentaje") return c.sectorValue;
              if (c.unit === "días") return (c.sectorValue / 50) * 100;
              if (c.unit === "casos") return (c.sectorValue / 20) * 100;
              if (c.unit === "escala 1-5") return (c.sectorValue / 5) * 100;
              return c.sectorValue;
            }),
            backgroundColor: "rgba(34, 197, 94, 0.2)",
            borderColor: "rgb(34, 197, 94)",
            borderWidth: 2,
          },
        ],
      }
    : null;

  // Preparar datos para gráfico de barras comparativas
  const barData = comparison
    ? {
        labels: comparison.comparisons.map((c) => c.metric),
        datasets: [
          {
            label: "Organización",
            data: comparison.comparisons.map((c) => c.orgValue),
            backgroundColor: "rgba(59, 130, 246, 0.8)",
          },
          {
            label: "Promedio Sectorial",
            data: comparison.comparisons.map((c) => c.sectorValue),
            backgroundColor: "rgba(34, 197, 94, 0.8)",
          },
        ],
      }
    : null;

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Benchmarking Sectorial</h1>
          <p className="text-muted-foreground mt-2">
            Compara tus métricas de riesgos psicosociales con los promedios del sector
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleExportPDF} disabled={!selectedSectorId || generatePDFMutation.isPending} variant="outline">
            <BarChart3 className="mr-2 h-4 w-4" />
            {generatePDFMutation.isPending ? "Generando PDF..." : "Exportar a PDF"}
          </Button>
          <Button onClick={handleGenerateRecommendations} disabled={!selectedSectorId || generateRecommendationsMutation.isPending}>
            <Sparkles className="mr-2 h-4 w-4" />
            {generateRecommendationsMutation.isPending ? "Generando..." : "Generar Recomendaciones con IA"}
          </Button>
        </div>
      </div>

      {/* Selector de Sector */}
      <Card>
        <CardHeader>
          <CardTitle>Selecciona tu Sector Industrial</CardTitle>
          <CardDescription>Elige el sector que mejor describe tu organización</CardDescription>
        </CardHeader>
        <CardContent>
          <Select
            value={selectedSectorId?.toString() || ""}
            onValueChange={(value) => setSelectedSectorId(parseInt(value))}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecciona un sector" />
            </SelectTrigger>
            <SelectContent>
              {sectors?.map((sector) => (
                <SelectItem key={sector.id} value={sector.id.toString()}>
                  {sector.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {selectedSectorId && dashboard && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Sector</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboard.sectorName}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Métricas Evaluadas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dashboard.totalMetrics}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Por Encima del Estándar</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-600" />
                  <div className="text-2xl font-bold text-green-600">{dashboard.betterCount}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Por Debajo del Estándar</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-600" />
                  <div className="text-2xl font-bold text-red-600">{dashboard.worseCount}</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Score de Desempeño */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Score de Desempeño Relativo
              </CardTitle>
              <CardDescription>
                Porcentaje de métricas donde tu organización supera el promedio sectorial
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="text-5xl font-bold text-blue-600">{dashboard.performanceScore}%</div>
                <div className="flex-1">
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div
                      className="bg-blue-600 h-4 rounded-full transition-all"
                      style={{ width: `${dashboard.performanceScore}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gráfico de Radar */}
          {radarData && (
            <Card>
              <CardHeader>
                <CardTitle>Comparación Multidimensional</CardTitle>
                <CardDescription>Vista de radar de todas las métricas (normalizado a escala 0-100)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] flex items-center justify-center">
                  <Radar
                    data={radarData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        r: {
                          beginAtZero: true,
                          max: 100,
                        },
                      },
                      plugins: {
                        legend: {
                          position: "top" as const,
                        },
                      },
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Gráfico de Barras Comparativas */}
          {barData && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5" />
                  Comparación por Métrica
                </CardTitle>
                <CardDescription>Valores reales organizacionales vs. promedios sectoriales</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px]">
                  <Bar
                    data={barData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: "top" as const,
                        },
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                        },
                      },
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tabla de Análisis de Brechas */}
          {comparison && (
            <Card>
              <CardHeader>
                <CardTitle>Análisis Detallado de Brechas</CardTitle>
                <CardDescription>Comparación métrica por métrica con identificación de áreas de mejora</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-3 font-semibold">Métrica</th>
                        <th className="text-right p-3 font-semibold">Organización</th>
                        <th className="text-right p-3 font-semibold">Sector</th>
                        <th className="text-right p-3 font-semibold">Brecha</th>
                        <th className="text-center p-3 font-semibold">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {comparison.comparisons.map((c, idx) => (
                        <tr key={idx} className="border-b hover:bg-muted/50">
                          <td className="p-3 font-medium">{c.metric}</td>
                          <td className="text-right p-3">
                            {c.orgValue} {c.unit}
                          </td>
                          <td className="text-right p-3">
                            {c.sectorValue} {c.unit}
                          </td>
                          <td className="text-right p-3">
                            <span className={c.gap > 0 ? "text-red-600" : "text-green-600"}>
                              {c.gap > 0 ? "+" : ""}
                              {c.gap} {c.unit}
                            </span>
                          </td>
                          <td className="text-center p-3">
                            {c.status === "better" ? (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                <TrendingUp className="mr-1 h-3 w-3" />
                                Por encima
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                <TrendingDown className="mr-1 h-3 w-3" />
                                Por debajo
                              </Badge>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recomendaciones de IA */}
          {generateRecommendationsMutation.data && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-purple-600" />
                  Recomendaciones Generadas por IA
                </CardTitle>
                <CardDescription>
                  Acciones sugeridas para cerrar las brechas identificadas y mejorar tu posicionamiento sectorial
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {generateRecommendationsMutation.data.recommendations.map((rec: any, idx: number) => (
                  <div key={idx} className="border-l-4 border-purple-500 pl-4 py-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className="font-semibold text-lg">{rec.title}</h4>
                        <p className="text-muted-foreground mt-1">{rec.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge
                            variant={
                              rec.priority === "high"
                                ? "destructive"
                                : rec.priority === "medium"
                                ? "default"
                                : "secondary"
                            }
                          >
                            Prioridad: {rec.priority === "high" ? "Alta" : rec.priority === "medium" ? "Media" : "Baja"}
                          </Badge>
                          <span className="text-sm text-muted-foreground">Métrica objetivo: {rec.targetMetric}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!selectedSectorId && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Selecciona un sector industrial para comenzar el análisis de benchmarking</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
