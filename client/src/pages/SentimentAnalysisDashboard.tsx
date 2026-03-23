/**
 * Dashboard de Análisis de Sentimiento en Encuestas NOM-035
 * Muestra tendencias, estadísticas y comentarios críticos detectados por LLM
 */

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Brain, TrendingUp, AlertTriangle, CheckCircle, Play, Calendar, BarChart3 } from "lucide-react";
import { Line, Bar, Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

export default function SentimentAnalysisDashboard() {
  const [dateRange, setDateRange] = useState("30");
  const [selectedRiskLevel, setSelectedRiskLevel] = useState<"all" | "low" | "medium" | "high" | "critical">("all");
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [selectedAnalysis, setSelectedAnalysis] = useState<any>(null);
  const [reviewNotes, setReviewNotes] = useState("");

  const utils = trpc.useUtils();

  // Calcular fechas de rango
  const { startDate, endDate } = useMemo(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - parseInt(dateRange));
    return {
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    };
  }, [dateRange]);

  // Queries
  const { data: stats, isLoading: statsLoading } = trpc.sentimentAnalysis.getStats.useQuery({
    startDate,
    endDate,
  });

  const { data: trends = [], isLoading: trendsLoading } = trpc.sentimentAnalysis.getTrends.useQuery({
    startDate,
    endDate,
    riskLevel: selectedRiskLevel,
  });

  const { data: criticalComments = [], isLoading: criticalLoading } = trpc.sentimentAnalysis.getCriticalComments.useQuery({
    limit: 20,
    reviewed: false,
  });

  // Mutations
  const runAnalysis = trpc.sentimentAnalysis.runManualAnalysis.useMutation({
    onSuccess: () => {
      toast.success("Análisis ejecutado correctamente");
      utils.sentimentAnalysis.getTrends.invalidate();
      utils.sentimentAnalysis.getStats.invalidate();
      utils.sentimentAnalysis.getCriticalComments.invalidate();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const markAsReviewed = trpc.sentimentAnalysis.markAsReviewed.useMutation({
    onSuccess: () => {
      toast.success("Análisis marcado como revisado");
      setReviewDialogOpen(false);
      setSelectedAnalysis(null);
      setReviewNotes("");
      utils.sentimentAnalysis.getCriticalComments.invalidate();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  // Preparar datos para gráfico de línea (evolución temporal)
  const lineChartData = useMemo(() => {
    if (!trends || trends.length === 0) return null;

    // Agrupar por fecha
    const byDate: Record<string, { positive: number; neutral: number; negative: number; critical: number }> = {};

    trends.forEach((t: any) => {
      const date = new Date(t.analyzedAt).toLocaleDateString("es-MX", { month: "short", day: "numeric" });
      if (!byDate[date]) {
        byDate[date] = { positive: 0, neutral: 0, negative: 0, critical: 0 };
      }
      byDate[date][t.sentiment as keyof typeof byDate[string]]++;
    });

    const labels = Object.keys(byDate).sort();
    const datasets = [
      {
        label: "Positivo",
        data: labels.map((l: any) => byDate[l].positive),
        borderColor: "rgb(34, 197, 94)",
        backgroundColor: "rgba(34, 197, 94, 0.1)",
        fill: true,
      },
      {
        label: "Neutral",
        data: labels.map((l: any) => byDate[l].neutral),
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        fill: true,
      },
      {
        label: "Negativo",
        data: labels.map((l: any) => byDate[l].negative),
        borderColor: "rgb(251, 146, 60)",
        backgroundColor: "rgba(251, 146, 60, 0.1)",
        fill: true,
      },
      {
        label: "Crítico",
        data: labels.map((l: any) => byDate[l].critical),
        borderColor: "rgb(239, 68, 68)",
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        fill: true,
      },
    ];

    return { labels, datasets };
  }, [trends]);

  // Preparar datos para gráfico de dona (distribución por nivel de riesgo)
  const doughnutChartData = useMemo(() => {
    if (!stats) return null;

    return {
      labels: ["Bajo", "Medio", "Alto", "Crítico"],
      datasets: [
        {
          data: [
            stats.byRiskLevel.low,
            stats.byRiskLevel.medium,
            stats.byRiskLevel.high,
            stats.byRiskLevel.critical,
          ],
          backgroundColor: [
            "rgba(34, 197, 94, 0.8)",
            "rgba(59, 130, 246, 0.8)",
            "rgba(251, 146, 60, 0.8)",
            "rgba(239, 68, 68, 0.8)",
          ],
          borderWidth: 0,
        },
      ],
    };
  }, [stats]);

  // Preparar datos para gráfico de barras (distribución por sentimiento)
  const barChartData = useMemo(() => {
    if (!stats) return null;

    return {
      labels: ["Positivo", "Neutral", "Negativo", "Crítico"],
      datasets: [
        {
          label: "Respuestas",
          data: [
            stats.bySentiment.positive,
            stats.bySentiment.neutral,
            stats.bySentiment.negative,
            stats.bySentiment.critical,
          ],
          backgroundColor: [
            "rgba(34, 197, 94, 0.8)",
            "rgba(59, 130, 246, 0.8)",
            "rgba(251, 146, 60, 0.8)",
            "rgba(239, 68, 68, 0.8)",
          ],
        },
      ],
    };
  }, [stats]);

  const getRiskBadge = (riskLevel: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      low: "secondary",
      medium: "default",
      high: "destructive",
      critical: "destructive",
    };
    const labels: Record<string, string> = {
      low: "Bajo",
      medium: "Medio",
      high: "Alto",
      critical: "Crítico",
    };
    return <Badge variant={variants[riskLevel] || "default"}>{labels[riskLevel] || riskLevel}</Badge>;
  };

  const getSentimentBadge = (sentiment: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      positive: "secondary",
      neutral: "default",
      negative: "destructive",
      critical: "destructive",
    };
    const labels: Record<string, string> = {
      positive: "Positivo",
      neutral: "Neutral",
      negative: "Negativo",
      critical: "Crítico",
    };
    return <Badge variant={variants[sentiment] || "default"}>{labels[sentiment] || sentiment}</Badge>;
  };

  if (statsLoading || trendsLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando análisis de sentimiento...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Brain className="h-8 w-8 text-primary" />
            Análisis de Sentimiento NOM-035
          </h1>
          <p className="text-muted-foreground mt-2">
            Detección automática de patrones de riesgo psicosocial con inteligencia artificial
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select modal={false} value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-[180px]">
              <Calendar className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 días</SelectItem>
              <SelectItem value="30">Últimos 30 días</SelectItem>
              <SelectItem value="90">Últimos 90 días</SelectItem>
              <SelectItem value="180">Últimos 6 meses</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => runAnalysis.mutate()} disabled={runAnalysis.isPending}>
            <Play className="h-4 w-4 mr-2" />
            {runAnalysis.isPending ? "Analizando..." : "Ejecutar Análisis"}
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Analizado</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">Respuestas procesadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alertas Críticas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{stats?.criticalAlerts || 0}</div>
            <p className="text-xs text-muted-foreground">Requieren atención inmediata</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confianza Promedio</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.avgConfidence.toFixed(1) || 0}%</div>
            <p className="text-xs text-muted-foreground">Precisión del análisis</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tendencia</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats ? Math.round((stats.bySentiment.positive / stats.total) * 100) : 0}%
            </div>
            <p className="text-xs text-muted-foreground">Sentimiento positivo</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="trends" className="space-y-6">
        <TabsList>
          <TabsTrigger value="trends">Tendencias</TabsTrigger>
          <TabsTrigger value="critical">
            Comentarios Críticos
            {criticalComments.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {criticalComments.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="trends" className="space-y-6">
          {/* Gráfico de línea: Evolución temporal */}
          <Card>
            <CardHeader>
              <CardTitle>Evolución Temporal del Sentimiento</CardTitle>
              <CardDescription>Tendencia de sentimientos detectados en el periodo seleccionado</CardDescription>
            </CardHeader>
            <CardContent>
              {lineChartData ? (
                <div className="h-[400px]">
                  <Line
                    data={lineChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: "top",
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
              ) : (
                <div className="h-[400px] flex items-center justify-center text-muted-foreground">
                  No hay datos disponibles
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico de dona: Distribución por nivel de riesgo */}
            <Card>
              <CardHeader>
                <CardTitle>Distribución por Nivel de Riesgo</CardTitle>
                <CardDescription>Clasificación de riesgo psicosocial detectado</CardDescription>
              </CardHeader>
              <CardContent>
                {doughnutChartData ? (
                  <div className="h-[300px] flex items-center justify-center">
                    <Doughnut
                      data={doughnutChartData}
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
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No hay datos disponibles
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Gráfico de barras: Distribución por sentimiento */}
            <Card>
              <CardHeader>
                <CardTitle>Distribución por Sentimiento</CardTitle>
                <CardDescription>Tono emocional general de las respuestas</CardDescription>
              </CardHeader>
              <CardContent>
                {barChartData ? (
                  <div className="h-[300px]">
                    <Bar
                      data={barChartData}
                      options={{
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
                      }}
                    />
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No hay datos disponibles
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="critical">
          <Card>
            <CardHeader>
              <CardTitle>Comentarios Críticos Pendientes de Revisión</CardTitle>
              <CardDescription>
                Respuestas con indicadores de riesgo crítico que requieren atención inmediata
              </CardDescription>
            </CardHeader>
            <CardContent>
              {criticalLoading ? (
                <div className="text-center py-8 text-muted-foreground">Cargando...</div>
              ) : criticalComments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
                  <p>No hay comentarios críticos pendientes de revisión</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {criticalComments.map((comment: any) => (
                    <div key={comment.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            {getSentimentBadge(comment.sentiment)}
                            {getRiskBadge(comment.riskLevel)}
                            <span className="text-sm text-muted-foreground">
                              Confianza: {Number(comment.confidence).toFixed(0)}%
                            </span>
                          </div>
                          <p className="text-sm font-medium">
                            {comment.userName || "Anónimo"} - {comment.userDepartment || "Sin departamento"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(comment.analyzedAt).toLocaleDateString("es-MX", {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedAnalysis(comment);
                            setReviewDialogOpen(true);
                          }}
                        >
                          Revisar
                        </Button>
                      </div>

                      <div className="space-y-2">
                        <div>
                          <p className="text-sm font-medium">Resumen:</p>
                          <p className="text-sm text-muted-foreground">{comment.summary}</p>
                        </div>

                        {comment.riskIndicators && (
                          <div>
                            <p className="text-sm font-medium">Indicadores de Riesgo:</p>
                            <div className="flex flex-wrap gap-2 mt-1">
                              {JSON.parse(comment.riskIndicators).map((indicator: string, idx: number) => (
                                <Badge key={idx} variant="outline">
                                  {indicator}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        <div>
                          <p className="text-sm font-medium">Recomendaciones:</p>
                          <p className="text-sm text-muted-foreground">{comment.recommendations}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog de revisión */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Revisar Análisis Crítico</DialogTitle>
            <DialogDescription>
              Registra tus observaciones sobre este análisis y marca como revisado
            </DialogDescription>
          </DialogHeader>

          {selectedAnalysis && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">Resumen del Análisis:</p>
                <p className="text-sm text-muted-foreground">{selectedAnalysis.summary}</p>
              </div>

              <div>
                <p className="text-sm font-medium">Recomendaciones:</p>
                <p className="text-sm text-muted-foreground">{selectedAnalysis.recommendations}</p>
              </div>

              <div>
                <label className="text-sm font-medium">Notas de Revisión (opcional):</label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Agrega tus observaciones sobre este caso..."
                  className="mt-2"
                  rows={4}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (selectedAnalysis) {
                  markAsReviewed.mutate({
                    analysisId: selectedAnalysis.id,
                    reviewNotes: reviewNotes || undefined,
                  });
                }
              }}
              disabled={markAsReviewed.isPending}
            >
              {markAsReviewed.isPending ? "Guardando..." : "Marcar como Revisado"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
