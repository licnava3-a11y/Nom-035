import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { TrendingUp, TrendingDown, Activity, Target, Plus, BarChart3, Sparkles } from "lucide-react";
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

export default function InterventionImpactDashboard() {
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedIntervention, setSelectedIntervention] = useState<any>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  const { data: dashboard, isLoading: dashboardLoading } = trpc.interventionImpact.getDashboard.useQuery();
  const { data: interventions, isLoading, refetch } = trpc.interventionImpact.list.useQuery({
    status: selectedStatus === "all" ? undefined : (selectedStatus as any),
    interventionType: selectedType === "all" ? undefined : (selectedType as any),
  });

  const createMutation = trpc.interventionImpact.create.useMutation({
    onSuccess: () => {
      toast.success("Intervención creada exitosamente");
      setCreateDialogOpen(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const calculateMetricsMutation = trpc.interventionImpact.calculateMetrics.useMutation({
    onSuccess: (data) => {
      toast.success(`Métricas calculadas. Efectividad: ${data.metrics.effectivenessScore}/100`);
      refetch();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const generateInsightsMutation = trpc.interventionImpact.generateInsights.useMutation({
    onSuccess: () => {
      toast.success("Insights generados con IA exitosamente");
      refetch();
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const handleCreate = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    createMutation.mutate({
      interventionType: formData.get("interventionType") as any,
      interventionName: formData.get("interventionName") as string,
      description: formData.get("description") as string,
      implementationDate: formData.get("implementationDate") as string,
      targetDepartmentId: formData.get("targetDepartmentId") ? Number(formData.get("targetDepartmentId")) : undefined,
      measurementPeriodMonths: Number(formData.get("measurementPeriodMonths")),
    });
  };

  const handleCalculateMetrics = (id: number) => {
    calculateMetricsMutation.mutate({ id });
  };

  const handleGenerateInsights = (id: number) => {
    generateInsightsMutation.mutate({ id });
  };

  // Datos para gráfico de línea temporal
  const chartData = {
    labels: interventions?.slice(0, 10).map((i) => i.interventionName.substring(0, 20)) || [],
    datasets: [
      {
        label: "Score de Efectividad",
        data: interventions?.slice(0, 10).map((i) => Number(i.effectivenessScore) || 0) || [],
        borderColor: "rgb(59, 130, 246)",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        tension: 0.4,
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
        text: "Evolución de Efectividad de Intervenciones",
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
      },
    },
  };

  if (dashboardLoading || isLoading) {
    return (
      <div className="container py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-muted-foreground">Cargando dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Dashboard de Análisis de Impacto de Intervenciones</h1>
          <p className="text-muted-foreground mt-1">
            Mide la efectividad de acciones correctivas y su correlación con la reducción de casos
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Intervención
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <form onSubmit={handleCreate}>
              <DialogHeader>
                <DialogTitle>Registrar Nueva Intervención</DialogTitle>
                <DialogDescription>
                  Registra una intervención para analizar su impacto en la reducción de riesgos psicosociales
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid gap-2">
                  <Label htmlFor="interventionType">Tipo de Intervención *</Label>
                  <Select name="interventionType" required>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="training">Capacitación</SelectItem>
                      <SelectItem value="policy_change">Cambio de Política</SelectItem>
                      <SelectItem value="organizational_change">Cambio Organizacional</SelectItem>
                      <SelectItem value="corrective_action">Acción Correctiva</SelectItem>
                      <SelectItem value="awareness_campaign">Campaña de Concientización</SelectItem>
                      <SelectItem value="other">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="interventionName">Nombre de la Intervención *</Label>
                  <Input id="interventionName" name="interventionName" required />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Textarea id="description" name="description" rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="implementationDate">Fecha de Implementación *</Label>
                    <Input id="implementationDate" name="implementationDate" type="date" required />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="measurementPeriodMonths">Período de Medición (meses) *</Label>
                    <Input
                      id="measurementPeriodMonths"
                      name="measurementPeriodMonths"
                      type="number"
                      defaultValue={3}
                      min={1}
                      max={12}
                      required
                    />
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="targetDepartmentId">ID Departamento Objetivo (opcional)</Label>
                  <Input id="targetDepartmentId" name="targetDepartmentId" type="number" />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creando..." : "Crear Intervención"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Intervenciones Activas</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.totalInterventions || 0}</div>
            <p className="text-xs text-muted-foreground">Total registradas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Efectividad Promedio</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Number(dashboard?.avgEffectiveness || 0).toFixed(1)}/100</div>
            <p className="text-xs text-muted-foreground">Score de efectividad</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Casos Evitados</CardTitle>
            <TrendingDown className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{dashboard?.totalCasesAvoided || 0}</div>
            <p className="text-xs text-muted-foreground">Reducción acumulada</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Intervenciones</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboard?.topInterventions?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Más efectivas</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Línea Temporal */}
      <Card>
        <CardHeader>
          <CardTitle>Evolución de Efectividad</CardTitle>
          <CardDescription>Últimas 10 intervenciones registradas</CardDescription>
        </CardHeader>
        <CardContent>
          <div style={{ height: "300px" }}>
            <Line data={chartData} options={chartOptions} />
          </div>
        </CardContent>
      </Card>

      {/* Filtros */}
      <div className="flex gap-4">
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los estados</SelectItem>
            <SelectItem value="active">Activas</SelectItem>
            <SelectItem value="completed">Completadas</SelectItem>
            <SelectItem value="archived">Archivadas</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filtrar por tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los tipos</SelectItem>
            <SelectItem value="training">Capacitación</SelectItem>
            <SelectItem value="policy_change">Cambio de Política</SelectItem>
            <SelectItem value="organizational_change">Cambio Organizacional</SelectItem>
            <SelectItem value="corrective_action">Acción Correctiva</SelectItem>
            <SelectItem value="awareness_campaign">Campaña de Concientización</SelectItem>
            <SelectItem value="other">Otro</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Tabla de Intervenciones */}
      <Card>
        <CardHeader>
          <CardTitle>Análisis Comparativo Antes/Después</CardTitle>
          <CardDescription>Comparación de métricas antes y después de cada intervención</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Intervención</th>
                  <th className="text-left p-2">Tipo</th>
                  <th className="text-center p-2">Casos Antes</th>
                  <th className="text-center p-2">Casos Después</th>
                  <th className="text-center p-2">Reducción</th>
                  <th className="text-center p-2">Efectividad</th>
                  <th className="text-center p-2">Estado</th>
                  <th className="text-center p-2">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {interventions?.map((intervention) => (
                  <tr key={intervention.id} className="border-b hover:bg-muted/50">
                    <td className="p-2 font-medium">{intervention.interventionName}</td>
                    <td className="p-2">
                      <Badge variant="outline">
                        {intervention.interventionType === "training" && "Capacitación"}
                        {intervention.interventionType === "policy_change" && "Cambio de Política"}
                        {intervention.interventionType === "organizational_change" && "Cambio Organizacional"}
                        {intervention.interventionType === "corrective_action" && "Acción Correctiva"}
                        {intervention.interventionType === "awareness_campaign" && "Campaña"}
                        {intervention.interventionType === "other" && "Otro"}
                      </Badge>
                    </td>
                    <td className="p-2 text-center">{intervention.casesBeforeCount}</td>
                    <td className="p-2 text-center">{intervention.casesAfterCount}</td>
                    <td className="p-2 text-center">
                      {intervention.caseReductionPercentage ? (
                        <span className={Number(intervention.caseReductionPercentage) > 0 ? "text-green-600 font-semibold" : "text-red-600"}>
                          {Number(intervention.caseReductionPercentage).toFixed(1)}%
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="p-2 text-center">
                      {intervention.effectivenessScore ? (
                        <Badge variant={Number(intervention.effectivenessScore) >= 70 ? "default" : "secondary"}>
                          {Number(intervention.effectivenessScore).toFixed(1)}/100
                        </Badge>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="p-2 text-center">
                      <Badge variant={intervention.status === "active" ? "default" : "secondary"}>{intervention.status}</Badge>
                    </td>
                    <td className="p-2 text-center space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleCalculateMetrics(intervention.id)}
                        disabled={calculateMetricsMutation.isPending}
                      >
                        <BarChart3 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleGenerateInsights(intervention.id)}
                        disabled={generateInsightsMutation.isPending}
                      >
                        <Sparkles className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedIntervention(intervention);
                          setDetailsDialogOpen(true);
                        }}
                      >
                        Ver Detalles
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Detalles */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{selectedIntervention?.interventionName}</DialogTitle>
            <DialogDescription>Análisis detallado de impacto y insights generados por IA</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedIntervention?.aiInsights && (
              <>
                <div>
                  <h3 className="font-semibold mb-2">Factores de Éxito</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {selectedIntervention.aiInsights.successFactors?.map((factor: string, idx: number) => (
                      <li key={idx} className="text-sm">
                        {factor}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Desafíos</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {selectedIntervention.aiInsights.challenges?.map((challenge: string, idx: number) => (
                      <li key={idx} className="text-sm">
                        {challenge}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Recomendaciones</h3>
                  <ul className="list-disc list-inside space-y-1">
                    {selectedIntervention.aiInsights.recommendations?.map((rec: string, idx: number) => (
                      <li key={idx} className="text-sm">
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Predicción de Impacto</h3>
                  <p className="text-sm">{selectedIntervention.aiInsights.predictedImpact}</p>
                </div>
              </>
            )}
            {!selectedIntervention?.aiInsights && (
              <div className="text-center py-8 text-muted-foreground">
                <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No se han generado insights con IA para esta intervención.</p>
                <Button
                  className="mt-4"
                  onClick={() => {
                    handleGenerateInsights(selectedIntervention?.id);
                    setDetailsDialogOpen(false);
                  }}
                >
                  Generar Insights con IA
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Top 5 Intervenciones Más Efectivas */}
      <Card>
        <CardHeader>
          <CardTitle>Top 5 Intervenciones Más Efectivas</CardTitle>
          <CardDescription>Ranking de intervenciones con mayor impacto positivo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {dashboard?.topInterventions?.slice(0, 5).map((intervention, idx) => (
              <div key={intervention.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground font-bold">
                    {idx + 1}
                  </div>
                  <div>
                    <div className="font-semibold">{intervention.interventionName}</div>
                    <div className="text-sm text-muted-foreground">
                      {intervention.interventionType} • {new Date(intervention.implementationDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-green-600">
                    {Number(intervention.effectivenessScore || 0).toFixed(1)}/100
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {intervention.caseReductionPercentage ? `${Number(intervention.caseReductionPercentage).toFixed(1)}% reducción` : "Sin datos"}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
