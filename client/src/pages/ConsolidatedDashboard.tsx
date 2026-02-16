/**
 * Dashboard Ejecutivo Consolidado
 * Integra métricas de NOM-035, NMX-025, Tendencias Departamentales y Encuestas Post-Caso
 */

import { useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Users, 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  Award,
  BookOpen,
  BarChart3
} from "lucide-react";
import { Chart, registerables } from "chart.js";

Chart.register(...registerables);

export default function ConsolidatedDashboard() {
  const trendsChartRef = useRef<HTMLCanvasElement>(null);
  const trendsChartInstance = useRef<Chart | null>(null);

  // Queries
  const { data: kpis, isLoading: kpisLoading } = trpc.executiveDashboard.getConsolidatedKPIs.useQuery();
  const { data: trends, isLoading: trendsLoading } = trpc.executiveDashboard.getComplianceTrends.useQuery();
  const { data: alerts, isLoading: alertsLoading } = trpc.executiveDashboard.getConsolidatedAlerts.useQuery();

  // Renderizar gráfico de tendencias
  useEffect(() => {
    if (!trends || !trendsChartRef.current) return;

    if (trendsChartInstance.current) {
      trendsChartInstance.current.destroy();
    }

    const ctx = trendsChartRef.current.getContext("2d");
    if (!ctx) return;

    // Convertir meses a formato legible
    const monthLabels = trends.months.map(m => {
      const [year, month] = m.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1);
      return date.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' });
    });

    trendsChartInstance.current = new Chart(ctx, {
      type: "line",
      data: {
        labels: monthLabels,
        datasets: [
          {
            label: "Casos",
            data: trends.cases,
            borderColor: "rgba(239, 68, 68, 1)",
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            borderWidth: 2,
            tension: 0.4,
            fill: true,
          },
          {
            label: "Evidencias",
            data: trends.evidences,
            borderColor: "rgba(59, 130, 246, 1)",
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            borderWidth: 2,
            tension: 0.4,
            fill: true,
          },
          {
            label: "Encuestas Completadas",
            data: trends.surveys,
            borderColor: "rgba(34, 197, 94, 1)",
            backgroundColor: "rgba(34, 197, 94, 0.1)",
            borderWidth: 2,
            tension: 0.4,
            fill: true,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: "top",
          },
          tooltip: {
            mode: "index",
            intersect: false,
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 5,
            },
          },
        },
      },
    });

    return () => {
      if (trendsChartInstance.current) {
        trendsChartInstance.current.destroy();
      }
    };
  }, [trends]);

  const getAlertBadge = (type: 'critical' | 'warning' | 'info') => {
    const config: Record<typeof type, { variant: "default" | "secondary" | "destructive"; className: string }> = {
      critical: { variant: "destructive", className: "bg-red-600 text-white" },
      warning: { variant: "default", className: "bg-yellow-500 text-white" },
      info: { variant: "secondary", className: "bg-blue-500 text-white" },
    };

    return config[type];
  };

  if (kpisLoading || trendsLoading || alertsLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Cargando dashboard ejecutivo...</p>
        </div>
      </div>
    );
  }

  if (!kpis || !trends || !alerts) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>No se pudieron cargar las métricas consolidadas</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Ejecutivo</h1>
        <p className="text-muted-foreground mt-2">
          Vista consolidada de cumplimiento normativo y gestión de riesgos psicosociales
        </p>
      </div>

      {/* KPIs Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* NOM-035 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Casos NOM-035
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{kpis.nom035.totalCases}</div>
            <div className="flex items-center gap-2 mt-2 text-xs">
              <Badge variant="destructive" className="text-xs">{kpis.nom035.openCases} abiertos</Badge>
              <Badge variant="outline" className="text-xs">{kpis.nom035.criticalCases} críticos</Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {kpis.nom035.evidences} evidencias documentadas
            </p>
          </CardContent>
        </Card>

        {/* NMX-025 */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Igualdad Laboral
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{kpis.nmx025.genderParityScore.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">Paridad de género</p>
            <div className="flex items-center gap-2 mt-2 text-xs">
              <span>{kpis.nmx025.femaleEmployees} mujeres</span>
              <span className="text-muted-foreground">de {kpis.nmx025.totalEmployees} empleados</span>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {kpis.nmx025.evidences} evidencias NMX-025
            </p>
          </CardContent>
        </Card>

        {/* Encuestas Post-Caso */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Encuestas Post-Caso
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{kpis.surveys.completionRate.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground mt-1">Tasa de completitud</p>
            <div className="flex items-center gap-2 mt-2 text-xs">
              <span>{kpis.surveys.completed} completadas</span>
              <span className="text-muted-foreground">de {kpis.surveys.total} enviadas</span>
            </div>
            <div className="flex items-center gap-1 mt-2">
              <Award className="h-3 w-3 text-yellow-500" />
              <span className="text-xs font-semibold">{kpis.surveys.avgScore.toFixed(2)}</span>
              <span className="text-xs text-muted-foreground">/ 5.0 score promedio</span>
            </div>
          </CardContent>
        </Card>

        {/* Capacitación */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Capacitación
            </CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{kpis.training.totalCourses}</div>
            <p className="text-xs text-muted-foreground mt-1">Cursos disponibles</p>
            <div className="mt-4">
              <Badge variant="outline" className="text-xs">
                <TrendingUp className="h-3 w-3 mr-1" />
                Activos
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Tendencias */}
      <Card>
        <CardHeader>
          <CardTitle>Tendencias de Cumplimiento (Últimos 6 Meses)</CardTitle>
          <CardDescription>
            Evolución temporal de casos, evidencias y encuestas completadas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <canvas ref={trendsChartRef}></canvas>
          </div>
        </CardContent>
      </Card>

      {/* Alertas Consolidadas */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Alertas Consolidadas</CardTitle>
              <CardDescription>Situaciones que requieren atención prioritaria</CardDescription>
            </div>
            <Badge variant="outline" className="text-sm">
              {alerts.length} alertas activas
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {alerts.length > 0 ? (
            <div className="space-y-3">
              {alerts.map((alert) => {
                const badgeConfig = getAlertBadge(alert.type);
                return (
                  <div
                    key={alert.id}
                    className="flex items-start gap-3 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="mt-0.5">
                      {alert.type === 'critical' && <AlertTriangle className="h-5 w-5 text-red-600" />}
                      {alert.type === 'warning' && <AlertTriangle className="h-5 w-5 text-yellow-600" />}
                      {alert.type === 'info' && <BarChart3 className="h-5 w-5 text-blue-600" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-sm">{alert.title}</h4>
                        <Badge {...badgeConfig} className="text-xs">
                          {alert.category}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{alert.description}</p>
                    </div>
                    {alert.count && (
                      <div className="text-right">
                        <div className="text-2xl font-bold">{alert.count}</div>
                        <p className="text-xs text-muted-foreground">casos</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mx-auto mb-2 opacity-50 text-green-600" />
              <p>No hay alertas activas</p>
              <p className="text-xs mt-1">Todos los indicadores dentro de parámetros normales</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Resumen de Acciones Recomendadas */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones Recomendadas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>
            • <strong>Casos Críticos:</strong> Revisar y asignar responsables a los {kpis.nom035.criticalCases} casos críticos abiertos
          </p>
          <p>
            • <strong>Paridad de Género:</strong> {kpis.nmx025.genderParityScore < 40 || kpis.nmx025.genderParityScore > 60 
              ? `Implementar acciones afirmativas para mejorar paridad (actual: ${kpis.nmx025.genderParityScore.toFixed(1)}%)`
              : `Mantener políticas actuales de igualdad (paridad: ${kpis.nmx025.genderParityScore.toFixed(1)}%)`}
          </p>
          <p>
            • <strong>Encuestas:</strong> {kpis.surveys.completionRate < 70 
              ? `Enviar recordatorios para mejorar tasa de completitud (actual: ${kpis.surveys.completionRate.toFixed(1)}%)`
              : `Mantener estrategia actual de seguimiento (completitud: ${kpis.surveys.completionRate.toFixed(1)}%)`}
          </p>
          <p>
            • <strong>Evidencias:</strong> Continuar documentando acciones de cumplimiento normativo (NOM-035: {kpis.nom035.evidences}, NMX-025: {kpis.nmx025.evidences})
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
