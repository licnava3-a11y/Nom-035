/**
 * Dashboard de Encuestas Post-Caso
 * Visualización de resultados y efectividad de intervenciones
 */

import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle2, Clock, XCircle, Send, TrendingUp, Star } from "lucide-react";
import { Chart, registerables } from "chart.js";

// Registrar componentes de Chart.js
Chart.register(...registerables);

export default function PostCaseSurveysDashboard() {
  const [selectedStatus, setSelectedStatus] = useState<"pending" | "sent" | "completed" | "expired" | undefined>();
  
  const effectivenessChartRef = useRef<HTMLCanvasElement>(null);
  const periodComparisonChartRef = useRef<HTMLCanvasElement>(null);
  const effectivenessChartInstance = useRef<Chart | null>(null);
  const periodComparisonChartInstance = useRef<Chart | null>(null);

  // Queries
  const { data: stats, isLoading: statsLoading } = trpc.postCaseSurveys.getEffectivenessStats.useQuery();
  const { data: surveys, isLoading: surveysLoading } = trpc.postCaseSurveys.getAllSurveys.useQuery({
    status: selectedStatus,
  });

  // Mutations para jobs
  const createPendingSurveysMutation = trpc.postCaseSurveys.createPendingSurveys.useMutation();
  const sendPendingSurveysMutation = trpc.postCaseSurveys.sendPendingSurveys.useMutation();
  const expireSurveysMutation = trpc.postCaseSurveys.expireSurveys.useMutation();

  // Renderizar gráfico de efectividad
  useEffect(() => {
    if (!stats || !effectivenessChartRef.current) return;

    if (effectivenessChartInstance.current) {
      effectivenessChartInstance.current.destroy();
    }

    const ctx = effectivenessChartRef.current.getContext("2d");
    if (!ctx) return;

    effectivenessChartInstance.current = new Chart(ctx, {
      type: "radar",
      data: {
        labels: ["Mejora", "Satisfacción", "Apoyo", "Recomendación"],
        datasets: [
          {
            label: "Promedio de Ratings",
            data: [
              stats.avgImprovement,
              stats.avgSatisfaction,
              stats.avgSupport,
              stats.avgRecommendation,
            ],
            backgroundColor: "rgba(59, 130, 246, 0.2)",
            borderColor: "rgba(59, 130, 246, 1)",
            borderWidth: 2,
            pointBackgroundColor: "rgba(59, 130, 246, 1)",
            pointBorderColor: "#fff",
            pointHoverBackgroundColor: "#fff",
            pointHoverBorderColor: "rgba(59, 130, 246, 1)",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            beginAtZero: true,
            max: 5,
            ticks: {
              stepSize: 1,
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
        },
      },
    });

    return () => {
      if (effectivenessChartInstance.current) {
        effectivenessChartInstance.current.destroy();
      }
    };
  }, [stats]);

  // Renderizar gráfico de comparación por período
  useEffect(() => {
    if (!stats || !periodComparisonChartRef.current) return;

    if (periodComparisonChartInstance.current) {
      periodComparisonChartInstance.current.destroy();
    }

    const ctx = periodComparisonChartRef.current.getContext("2d");
    if (!ctx) return;

    periodComparisonChartInstance.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["30 días", "60 días", "90 días"],
        datasets: [
          {
            label: "Score Promedio",
            data: [
              stats.byPeriod["30"].avgScore,
              stats.byPeriod["60"].avgScore,
              stats.byPeriod["90"].avgScore,
            ],
            backgroundColor: ["rgba(34, 197, 94, 0.8)", "rgba(59, 130, 246, 0.8)", "rgba(168, 85, 247, 0.8)"],
            borderColor: ["rgba(34, 197, 94, 1)", "rgba(59, 130, 246, 1)", "rgba(168, 85, 247, 1)"],
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            max: 5,
            ticks: {
              stepSize: 1,
            },
            title: {
              display: true,
              text: "Score (1-5)",
            },
          },
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              afterLabel: (context) => {
                const period = ["30", "60", "90"][context.dataIndex];
                const count = stats.byPeriod[period as "30" | "60" | "90"].count;
                return `Encuestas completadas: ${count}`;
              },
            },
          },
        },
      },
    });

    return () => {
      if (periodComparisonChartInstance.current) {
        periodComparisonChartInstance.current.destroy();
      }
    };
  }, [stats]);

  const handleRunJob = async (jobType: "create" | "send" | "expire") => {
    try {
      let result;
      if (jobType === "create") {
        result = await createPendingSurveysMutation.mutateAsync();
        alert(`✅ ${result.surveysCreated} encuestas creadas`);
      } else if (jobType === "send") {
        result = await sendPendingSurveysMutation.mutateAsync();
        alert(`✅ ${result.surveysSent} encuestas enviadas`);
      } else {
        result = await expireSurveysMutation.mutateAsync();
        alert(`✅ ${result.surveysExpired} encuestas expiradas`);
      }
    } catch (error) {
      alert("❌ Error al ejecutar job");
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string; icon: any }> = {
      pending: { variant: "secondary", label: "Pendiente", icon: Clock },
      sent: { variant: "default", label: "Enviada", icon: Send },
      completed: { variant: "outline", label: "Completada", icon: CheckCircle2 },
      expired: { variant: "destructive", label: "Expirada", icon: XCircle },
    };

    const { variant, label, icon: Icon } = config[status] || config.pending;

    return (
      <Badge variant={variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    );
  };

  if (statsLoading || surveysLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Cargando dashboard de encuestas...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>No se pudieron cargar las estadísticas</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Encuestas Post-Caso</h1>
          <p className="text-muted-foreground mt-2">
            Seguimiento automático 30/60/90 días después de cierre de casos
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleRunJob("create")}
            disabled={createPendingSurveysMutation.isPending}
          >
            Crear Pendientes
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleRunJob("send")}
            disabled={sendPendingSurveysMutation.isPending}
          >
            Enviar Pendientes
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleRunJob("expire")}
            disabled={expireSurveysMutation.isPending}
          >
            Expirar Vencidas
          </Button>
        </div>
      </div>

      {/* Resumen ejecutivo */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Completadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.totalCompleted}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Score General
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <p className="text-3xl font-bold">{stats.overallScore}</p>
              <span className="text-sm text-muted-foreground">/ 5.0</span>
            </div>
            <div className="flex items-center gap-1 mt-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`h-4 w-4 ${
                    i < Math.round(stats.overallScore)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-gray-300"
                  }`}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Mejora
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.avgImprovement}</p>
            <p className="text-xs text-muted-foreground mt-1">Promedio</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Satisfacción
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.avgSatisfaction}</p>
            <p className="text-xs text-muted-foreground mt-1">Promedio</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Recomendación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{stats.avgRecommendation}</p>
            <p className="text-xs text-muted-foreground mt-1">Promedio</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Efectividad por Categoría</CardTitle>
            <CardDescription>Promedio de ratings en escala 1-5</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <canvas ref={effectivenessChartRef}></canvas>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Comparación por Período</CardTitle>
            <CardDescription>Score promedio según días transcurridos desde cierre</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <canvas ref={periodComparisonChartRef}></canvas>
            </div>
            <div className="grid grid-cols-3 gap-4 mt-4 text-center text-sm">
              <div>
                <p className="font-semibold">{stats.byPeriod["30"].count}</p>
                <p className="text-muted-foreground">30 días</p>
              </div>
              <div>
                <p className="font-semibold">{stats.byPeriod["60"].count}</p>
                <p className="text-muted-foreground">60 días</p>
              </div>
              <div>
                <p className="font-semibold">{stats.byPeriod["90"].count}</p>
                <p className="text-muted-foreground">90 días</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Listado de encuestas */}
      <Card>
        <CardHeader>
          <CardTitle>Listado de Encuestas</CardTitle>
          <CardDescription>Filtrar por estado</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedStatus || "all"} onValueChange={(v) => setSelectedStatus(v === "all" ? undefined : v as any)}>
            <TabsList>
              <TabsTrigger value="all">Todas</TabsTrigger>
              <TabsTrigger value="pending">Pendientes</TabsTrigger>
              <TabsTrigger value="sent">Enviadas</TabsTrigger>
              <TabsTrigger value="completed">Completadas</TabsTrigger>
              <TabsTrigger value="expired">Expiradas</TabsTrigger>
            </TabsList>

            <TabsContent value={selectedStatus || "all"} className="mt-4">
              {surveys && surveys.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left p-2">Caso</th>
                        <th className="text-left p-2">Tipo</th>
                        <th className="text-center p-2">Período</th>
                        <th className="text-center p-2">Estado</th>
                        <th className="text-center p-2">Enviada</th>
                        <th className="text-center p-2">Completada</th>
                        <th className="text-center p-2">Score</th>
                      </tr>
                    </thead>
                    <tbody>
                      {surveys.map((item: any) => {
                        const avgScore = item.survey.improvementRating
                          ? (
                              ((item.survey.improvementRating || 0) +
                                (item.survey.satisfactionRating || 0) +
                                (item.survey.supportRating || 0) +
                                (item.survey.recommendationRating || 0)) /
                              4
                            ).toFixed(1)
                          : "-";

                        return (
                          <tr key={item.survey.id} className="border-b hover:bg-muted/50">
                            <td className="p-2 font-medium">{item.caseNumber}</td>
                            <td className="p-2">
                              <Badge variant="outline">{item.caseType}</Badge>
                            </td>
                            <td className="text-center p-2">{item.survey.daysSinceClosure} días</td>
                            <td className="text-center p-2">
                              {getStatusBadge(item.survey.status)}
                            </td>
                            <td className="text-center p-2 text-xs text-muted-foreground">
                              {item.survey.sentAt
                                ? new Date(item.survey.sentAt).toLocaleDateString("es-MX")
                                : "-"}
                            </td>
                            <td className="text-center p-2 text-xs text-muted-foreground">
                              {item.survey.completedAt
                                ? new Date(item.survey.completedAt).toLocaleDateString("es-MX")
                                : "-"}
                            </td>
                            <td className="text-center p-2 font-semibold">{avgScore}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No hay encuestas en este estado</p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Información adicional */}
      <Card>
        <CardHeader>
          <CardTitle>Funcionamiento del Sistema</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            • <strong>Creación automática:</strong> El job "Crear Pendientes" detecta casos cerrados que cumplan 30, 60 o 90 días desde su cierre y crea encuestas pendientes.
          </p>
          <p>
            • <strong>Envío:</strong> El job "Enviar Pendientes" marca las encuestas como "enviadas" y establece una fecha de expiración de 7 días.
          </p>
          <p>
            • <strong>Expiración:</strong> El job "Expirar Vencidas" marca como expiradas las encuestas que no fueron completadas dentro del plazo.
          </p>
          <p>
            • <strong>Ratings:</strong> Cada encuesta mide 4 aspectos en escala 1-5: Mejora de la situación, Satisfacción con la resolución, Apoyo recibido y Recomendación del proceso.
          </p>
          <p>
            • <strong>Score General:</strong> Promedio de los 4 ratings, utilizado para medir la efectividad global de las intervenciones.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
