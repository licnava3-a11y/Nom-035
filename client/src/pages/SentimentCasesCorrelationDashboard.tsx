/**
 * Dashboard de Correlación Sentimiento-Casos
 * Visualiza la relación entre análisis de sentimiento y casos generados
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "wouter";
import { TrendingUp, AlertCircle, CheckCircle, Clock, ExternalLink, BarChart3 } from "lucide-react";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

export default function SentimentCasesCorrelationDashboard() {
  const [departmentId, setDepartmentId] = useState<number | undefined>(undefined);

  // Query: datos de correlación temporal
  const { data: correlationData = [], isLoading: loadingCorrelation } = trpc.sentimentCasesCorrelation.getCorrelationData.useQuery({
    departmentId,
  });

  // Query: casos generados automáticamente
  const { data: autoCases = [], isLoading: loadingCases } = trpc.sentimentCasesCorrelation.getAutoCases.useQuery({
    limit: 20,
  });

  // Query: métricas de efectividad
  const { data: metrics } = trpc.sentimentCasesCorrelation.getInterventionMetrics.useQuery();

  // Query: distribución por departamento
  const { data: casesByDept = [] } = trpc.sentimentCasesCorrelation.getCasesByDepartment.useQuery();

  // Query: lista de departamentos
  const { data: departments = [] } = trpc.departments.getAll.useQuery();

  // Datos para gráfico de línea temporal
  const lineChartData = {
    labels: correlationData.map(d => d.month),
    datasets: [
      {
        label: "Comentarios Críticos",
        data: correlationData.map(d => d.criticalComments),
        borderColor: "rgba(239, 68, 68, 1)",
        backgroundColor: "rgba(239, 68, 68, 0.1)",
        tension: 0.4,
      },
      {
        label: "Casos Abiertos",
        data: correlationData.map(d => d.casesOpened),
        borderColor: "rgba(59, 130, 246, 1)",
        backgroundColor: "rgba(59, 130, 246, 0.1)",
        tension: 0.4,
      },
    ],
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top" as const,
      },
      tooltip: {
        mode: "index" as const,
        intersect: false,
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
  };

  // Datos para gráfico de barras por departamento
  const barChartData = {
    labels: casesByDept.map(d => d.department || "Sin departamento"),
    datasets: [
      {
        label: "Casos Automáticos",
        data: casesByDept.map(d => d.count),
        backgroundColor: "rgba(59, 130, 246, 0.8)",
        borderColor: "rgba(59, 130, 246, 1)",
        borderWidth: 1,
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
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
        },
      },
    },
  };

  // Determinar color de badge según status
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "closed":
        return <Badge variant="default" className="bg-green-600">Cerrado</Badge>;
      case "investigating":
        return <Badge variant="secondary">En Investigación</Badge>;
      case "open":
        return <Badge variant="destructive">Abierto</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "critical":
        return <Badge variant="destructive">Crítico</Badge>;
      case "high":
        return <Badge variant="destructive" className="bg-orange-600">Alto</Badge>;
      case "medium":
        return <Badge variant="secondary">Medio</Badge>;
      case "low":
        return <Badge variant="outline">Bajo</Badge>;
      default:
        return <Badge variant="outline">{priority}</Badge>;
    }
  };

  return (
    <div className="container py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <TrendingUp className="h-8 w-8 text-primary" />
          Correlación Sentimiento-Casos
        </h1>
        <p className="text-muted-foreground mt-2">
          Visualiza la relación entre análisis de sentimiento y casos generados automáticamente
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium mb-2 block">Departamento</label>
              <Select
                value={departmentId?.toString() || "all"}
                onValueChange={(value) => setDepartmentId(value === "all" ? undefined : parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos los departamentos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los departamentos</SelectItem>
                  {departments.map((dept: any) => (
                    <SelectItem key={dept.id} value={dept.id.toString()}>
                      {dept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métricas de Efectividad */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Casos Automáticos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold">{metrics.totalCases}</span>
                <AlertCircle className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Casos Cerrados</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold text-green-600">{metrics.closedCases}</span>
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Tasa de Resolución</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold">{metrics.resolutionRate}%</span>
                <TrendingUp className="h-8 w-8 text-primary" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">Tiempo Promedio de Resolución</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <span className="text-3xl font-bold">{metrics.avgResolutionDays}</span>
                <Clock className="h-8 w-8 text-orange-600" />
              </div>
              <p className="text-xs text-muted-foreground mt-1">días</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Gráfico de Línea Temporal */}
      <Card>
        <CardHeader>
          <CardTitle>Evolución Temporal: Comentarios Críticos vs Casos Abiertos</CardTitle>
          <CardDescription>Comparación mensual de comentarios críticos detectados y casos generados</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingCorrelation ? (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground">
              Cargando datos de correlación...
            </div>
          ) : correlationData.length === 0 ? (
            <div className="h-[400px] flex items-center justify-center text-muted-foreground">
              No hay datos disponibles para el periodo seleccionado
            </div>
          ) : (
            <div className="h-[400px]">
              <Line data={lineChartData} options={lineChartOptions} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Gráfico de Barras por Departamento */}
      {casesByDept.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Distribución de Casos Automáticos por Departamento</CardTitle>
            <CardDescription>Número de casos generados automáticamente por departamento</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <Bar data={barChartData} options={barChartOptions} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabla de Casos Generados Automáticamente */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Casos Generados Automáticamente
          </CardTitle>
          <CardDescription>Últimos 20 casos creados por el sistema de análisis de sentimiento</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingCases ? (
            <div className="text-center py-8 text-muted-foreground">Cargando casos...</div>
          ) : autoCases.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No se han generado casos automáticos aún</p>
            </div>
          ) : (
            <div className="space-y-3">
              {autoCases.map((caso: any) => (
                <div key={caso.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-semibold">{caso.title}</h3>
                        {getStatusBadge(caso.status)}
                        {getPriorityBadge(caso.priority)}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2">{caso.description}</p>
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Departamento: {caso.departmentName || "Sin asignar"}</span>
                        <span>Creado: {new Date(caso.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <Link href={`/cases/${caso.id}`}>
                      <Button variant="outline" size="sm">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Ver Caso
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
