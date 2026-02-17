import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  Target, 
  Calendar,
  Loader2,
  CheckCircle2,
  XCircle
} from "lucide-react";
import { toast } from "sonner";
import { Chart, registerables } from "chart.js";

Chart.register(...registerables);

export default function RootCauseAnalysis() {
  const [periodFilter, setPeriodFilter] = useState("last_month");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const causesChartRef = useRef<HTMLCanvasElement>(null);
  const correlationsChartRef = useRef<HTMLCanvasElement>(null);
  const causesChartInstance = useRef<Chart | null>(null);
  const correlationsChartInstance = useRef<Chart | null>(null);

  // Queries
  const { data: latestAnalysis, isLoading, refetch } = trpc.rootCauseAnalysis.getLatestAnalysis.useQuery();
  const { data: departments } = trpc.departments.list.useQuery({ page: 1, pageSize: 100 });

  // Mutation
  const analyzeClosedCases = trpc.rootCauseAnalysis.analyzeClosedCases.useMutation({
    onSuccess: () => {
      toast.success("Análisis completado exitosamente");
      setIsAnalyzing(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Error al analizar: ${error.message}`);
      setIsAnalyzing(false);
    },
  });

  // Calcular período de fechas
  const getPeriodDates = (period: string) => {
    const now = new Date();
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let start = new Date();

    switch (period) {
      case "last_month":
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        end.setDate(0); // Último día del mes anterior
        break;
      case "last_quarter":
        const currentQuarter = Math.floor(now.getMonth() / 3);
        start = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1);
        end.setMonth(currentQuarter * 3, 0);
        break;
      case "last_year":
        start = new Date(now.getFullYear() - 1, 0, 1);
        end.setFullYear(now.getFullYear() - 1, 11, 31);
        break;
      default:
        start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    }

    return {
      periodStart: start.toISOString().split('T')[0],
      periodEnd: end.toISOString().split('T')[0],
    };
  };

  const handleAnalyze = () => {
    const dates = getPeriodDates(periodFilter);
    setIsAnalyzing(true);
    analyzeClosedCases.mutate(dates);
  };

  // Filtrar datos por departamento
  const filteredData = latestAnalysis && departmentFilter !== "all"
    ? {
        ...latestAnalysis,
        rootCauses: latestAnalysis.rootCauses?.filter((cause: any) =>
          cause.affectedDepartments.includes(departmentFilter)
        ),
        patterns: latestAnalysis.patterns?.filter((pattern: any) =>
          pattern.departments.includes(departmentFilter)
        ),
      }
    : latestAnalysis;

  // Renderizar gráfico de causas raíz
  useEffect(() => {
    if (!filteredData?.rootCauses || !causesChartRef.current) return;

    // Destruir gráfico anterior
    if (causesChartInstance.current) {
      causesChartInstance.current.destroy();
    }

    const ctx = causesChartRef.current.getContext("2d");
    if (!ctx) return;

    const sortedCauses = [...filteredData.rootCauses]
      .sort((a: any, b: any) => b.frequency - a.frequency)
      .slice(0, 10);

    causesChartInstance.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: sortedCauses.map((c: any) => c.cause),
        datasets: [
          {
            label: "Frecuencia",
            data: sortedCauses.map((c: any) => c.frequency),
            backgroundColor: sortedCauses.map((c: any) => {
              switch (c.severity) {
                case "critical": return "rgba(239, 68, 68, 0.8)";
                case "high": return "rgba(249, 115, 22, 0.8)";
                case "medium": return "rgba(234, 179, 8, 0.8)";
                default: return "rgba(34, 197, 94, 0.8)";
              }
            }),
            borderColor: sortedCauses.map((c: any) => {
              switch (c.severity) {
                case "critical": return "rgb(239, 68, 68)";
                case "high": return "rgb(249, 115, 22)";
                case "medium": return "rgb(234, 179, 8)";
                default: return "rgb(34, 197, 94)";
              }
            }),
            borderWidth: 1,
          },
        ],
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const cause = sortedCauses[context.dataIndex];
                return [
                  `Frecuencia: ${cause.frequency}`,
                  `Porcentaje: ${cause.percentage.toFixed(1)}%`,
                  `Severidad: ${cause.severity}`,
                ];
              },
            },
          },
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              precision: 0,
            },
          },
        },
      },
    });

    return () => {
      if (causesChartInstance.current) {
        causesChartInstance.current.destroy();
      }
    };
  }, [filteredData?.rootCauses]);

  // Renderizar gráfico de correlaciones
  useEffect(() => {
    if (!filteredData?.correlations || !correlationsChartRef.current) return;

    // Destruir gráfico anterior
    if (correlationsChartInstance.current) {
      correlationsChartInstance.current.destroy();
    }

    const ctx = correlationsChartRef.current.getContext("2d");
    if (!ctx) return;

    const sortedCorrelations = [...filteredData.correlations]
      .sort((a: any, b: any) => b.correlationStrength - a.correlationStrength)
      .slice(0, 8);

    correlationsChartInstance.current = new Chart(ctx, {
      type: "bar",
      data: {
        labels: sortedCorrelations.map((c: any) => `${c.factor1} ↔ ${c.factor2}`),
        datasets: [
          {
            label: "Fuerza de Correlación",
            data: sortedCorrelations.map((c: any) => c.correlationStrength * 100),
            backgroundColor: "rgba(59, 130, 246, 0.8)",
            borderColor: "rgb(59, 130, 246)",
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const corr = sortedCorrelations[context.dataIndex];
                return [
                  `Correlación: ${(corr.correlationStrength * 100).toFixed(1)}%`,
                  `${corr.description}`,
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
              callback: (value) => `${value}%`,
            },
          },
        },
      },
    });

    return () => {
      if (correlationsChartInstance.current) {
        correlationsChartInstance.current.destroy();
      }
    };
  }, [filteredData?.correlations]);

  const getSeverityBadge = (severity: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; label: string }> = {
      critical: { variant: "destructive", label: "Crítica" },
      high: { variant: "destructive", label: "Alta" },
      medium: { variant: "secondary", label: "Media" },
      low: { variant: "outline", label: "Baja" },
    };
    return variants[severity] || variants.low;
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive"; label: string }> = {
      high: { variant: "destructive", label: "Alta Prioridad" },
      medium: { variant: "secondary", label: "Media Prioridad" },
      low: { variant: "default", label: "Baja Prioridad" },
    };
    return variants[priority] || variants.medium;
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Brain className="h-8 w-8 text-purple-600" />
            Análisis de Causas Raíz con IA
          </h1>
          <p className="text-muted-foreground mt-1">
            Identificación automatizada de patrones y causas recurrentes en casos cerrados
          </p>
        </div>
        <Button
          onClick={handleAnalyze}
          disabled={isAnalyzing}
          className="bg-purple-600 hover:bg-purple-700"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analizando...
            </>
          ) : (
            <>
              <Brain className="mr-2 h-4 w-4" />
              Analizar Ahora
            </>
          )}
        </Button>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Filtros de Análisis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Período de Análisis</Label>
              <Select value={periodFilter} onValueChange={setPeriodFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="last_month">Último Mes</SelectItem>
                  <SelectItem value="last_quarter">Último Trimestre</SelectItem>
                  <SelectItem value="last_year">Último Año</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Departamento</Label>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos los departamentos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los departamentos</SelectItem>
                  {departments?.data?.map((dept: any) => (
                    <SelectItem key={dept.id} value={dept.name}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="text-center py-12">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-purple-600" />
          <p className="text-muted-foreground mt-4">Cargando análisis...</p>
        </div>
      ) : !latestAnalysis ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Brain className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No hay análisis disponibles</h3>
            <p className="text-muted-foreground mb-4">
              Ejecuta el primer análisis para identificar patrones en casos cerrados
            </p>
            <Button onClick={handleAnalyze} disabled={isAnalyzing}>
              <Brain className="mr-2 h-4 w-4" />
              Ejecutar Análisis
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Cards de métricas */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Casos Analizados</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{filteredData?.totalCasesAnalyzed || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Período: {filteredData?.periodStart ? new Date(filteredData.periodStart).toLocaleDateString() : 'N/A'} - {filteredData?.periodEnd ? new Date(filteredData.periodEnd).toLocaleDateString() : 'N/A'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Causas Identificadas</CardTitle>
                <AlertTriangle className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{filteredData?.rootCauses?.length || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Causas raíz detectadas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Patrones Detectados</CardTitle>
                <Brain className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{filteredData?.patterns?.length || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Patrones recurrentes
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recomendaciones</CardTitle>
                <Target className="h-4 w-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{filteredData?.recommendations?.length || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Acciones preventivas
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Gráficos */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Causas Raíz Más Frecuentes</CardTitle>
                <CardDescription>
                  Top 10 causas ordenadas por frecuencia
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div style={{ height: "400px" }}>
                  <canvas ref={causesChartRef}></canvas>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Correlaciones entre Factores de Riesgo</CardTitle>
                <CardDescription>
                  Relaciones identificadas por el análisis de IA
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div style={{ height: "400px" }}>
                  <canvas ref={correlationsChartRef}></canvas>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recomendaciones */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-green-600" />
                Recomendaciones Preventivas Priorizadas
              </CardTitle>
              <CardDescription>
                Acciones sugeridas basadas en el análisis de IA
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredData?.recommendations?.map((rec: any, idx: number) => (
                  <div key={idx} className="border rounded-lg p-4 space-y-2">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant={getPriorityBadge(rec.priority).variant as any}>
                            {getPriorityBadge(rec.priority).label}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {rec.targetDepartments.join(", ")}
                          </span>
                        </div>
                        <h4 className="font-semibold mb-1">{rec.recommendation}</h4>
                        <p className="text-sm text-muted-foreground mb-2">
                          <strong>Impacto esperado:</strong> {rec.expectedImpact}
                        </p>
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Acciones concretas:</p>
                          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                            {rec.actionItems.map((action: string, i: number) => (
                              <li key={i}>{action}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Patrones Detectados */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-600" />
                Patrones Recurrentes Detectados
              </CardTitle>
              <CardDescription>
                Patrones identificados en los casos analizados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredData?.patterns?.map((pattern: any, idx: number) => (
                  <div key={idx} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-semibold">{pattern.pattern}</h4>
                      <Badge variant="outline">{pattern.casesAffected} casos</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">{pattern.description}</p>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Departamentos:</span>
                      <span>{pattern.departments.join(", ")}</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Insights Departamentales */}
          {filteredData?.departmentInsights && Object.keys(filteredData.departmentInsights).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Insights por Departamento</CardTitle>
                <CardDescription>
                  Análisis específico de cada área organizacional
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(filteredData?.departmentInsights || {}).map(([dept, insights]: [string, any]) => (
                    <div key={dept} className="border rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="font-semibold text-lg">{dept}</h4>
                        <div className="flex items-center gap-2">
                          <Badge variant={getSeverityBadge(insights.riskLevel).variant as any}>
                            Riesgo: {getSeverityBadge(insights.riskLevel).label}
                          </Badge>
                          <Badge variant="outline">{insights.totalCases} casos</Badge>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <p className="text-sm font-medium mb-1">Principales causas:</p>
                          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                            {insights.topCauses.map((cause: string, i: number) => (
                              <li key={i}>{cause}</li>
                            ))}
                          </ul>
                        </div>
                        
                        <div>
                          <p className="text-sm font-medium mb-1">Recomendaciones específicas:</p>
                          <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                            {insights.specificRecommendations.map((rec: string, i: number) => (
                              <li key={i}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
