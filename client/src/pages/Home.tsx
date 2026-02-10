import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertCircle, TrendingUp, Users, FileText, BarChart3 } from "lucide-react";
import { AlertBanner } from "@/components/AlertBanner";
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
  ArcElement,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

// Registrar componentes de Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

type Period = 'today' | 'this_week' | 'this_month' | 'this_year' | 'last_week' | 'last_month' | 'last_year';

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const [period, setPeriod] = useState<Period>('this_month');
  const [alertMonths, setAlertMonths] = useState<6 | 12 | 24>(6);

  // Queries
  const { data: metrics, isLoading: metricsLoading } = trpc.executiveDashboard.getMetrics.useQuery();
  
  // Mutation para crear alertas
  const createAlertMutation = trpc.alerts.create.useMutation();
  
  // Registro automático de alertas cuando se detecten umbrales
  useEffect(() => {
    if (!metrics) return;
    
    const { casesOpen, surveyCoverage } = metrics.nom035Compliance;
    
    // Alerta crítica: casos abiertos > 50
    if (casesOpen > 50) {
      createAlertMutation.mutate({
        alertType: "critical_cases",
        description: `Hay ${casesOpen} casos abiertos que requieren atención inmediata`,
        threshold: 50,
        currentValue: casesOpen,
      });
    }
    
    // Alerta warning: cobertura < 80%
    if (surveyCoverage < 80) {
      createAlertMutation.mutate({
        alertType: "low_coverage",
        description: `La cobertura de encuestas es ${surveyCoverage.toFixed(1)}%`,
        threshold: 80,
        currentValue: surveyCoverage,
      });
    }
   }, [metrics]);
  
  const { data: trendsData, isLoading: trendsLoading } = trpc.executiveDashboard.getTrendsData.useQuery({ period });
  const { data: alertTrends, isLoading: alertTrendsLoading } = trpc.alerts.getTrends.useQuery({ months: alertMonths });
  const { data: comparison, isLoading: comparisonLoading } = trpc.executiveDashboard.getHistoricalComparison.useQuery();

  // Configuración de gráficas
  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'right' as const,
      },
    },
  };

  // Datos para gráfica de tendencia de casos
  const casesTrendData = {
    labels: trendsData?.casesTrend.created.map(c => c.date) || [],
    datasets: [
      {
        label: 'Casos Creados',
        data: trendsData?.casesTrend.created.map(c => c.count) || [],
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.5)',
        tension: 0.3,
      },
      {
        label: 'Casos Cerrados',
        data: trendsData?.casesTrend.closed.map(c => c.count) || [],
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.5)',
        tension: 0.3,
      },
    ],
  };

  // Datos para gráfica de cobertura de encuestas
  const surveyCoverageData = {
    labels: trendsData?.surveyCompletion.map(s => s.date) || [],
    datasets: [
      {
        label: 'Encuestas Completadas',
        data: trendsData?.surveyCompletion.map(s => s.completed) || [],
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
        borderColor: 'rgb(59, 130, 246)',
        borderWidth: 1,
      },
    ],
  };

  // Datos para gráfica de distribución de riesgo
  const riskDistributionData = {
    labels: trendsData?.riskDistribution.map(r => r.level) || [],
    datasets: [
      {
        data: trendsData?.riskDistribution.map(r => r.count) || [],
        backgroundColor: [
          'rgba(239, 68, 68, 0.8)',   // Rojo - Alto
          'rgba(251, 191, 36, 0.8)',  // Amarillo - Medio
          'rgba(34, 197, 94, 0.8)',   // Verde - Bajo
          'rgba(156, 163, 175, 0.8)', // Gris - Otros
        ],
        borderColor: [
          'rgb(239, 68, 68)',
          'rgb(251, 191, 36)',
          'rgb(34, 197, 94)',
          'rgb(156, 163, 175)',
        ],
        borderWidth: 1,
      },
    ],
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Acceso Restringido</CardTitle>
            <CardDescription>Debes iniciar sesión para ver el dashboard</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bienvenido, {user?.name}</h1>
          <p className="text-muted-foreground">
            {user?.role === 'admin' ? 'Administrador' : 'Usuario'} - Plataforma de Capacitación NOM-035 STPS 2018
          </p>
        </div>
        
        {/* Filtro de período */}
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Seleccionar período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Hoy</SelectItem>
            <SelectItem value="this_week">Esta semana</SelectItem>
            <SelectItem value="this_month">Este mes</SelectItem>
            <SelectItem value="this_year">Este año</SelectItem>
            <SelectItem value="last_week">Semana anterior</SelectItem>
            <SelectItem value="last_month">Mes anterior</SelectItem>
            <SelectItem value="last_year">Año anterior</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Sistema de Alertas Visuales */}
      {metrics && (
        <div className="space-y-2">
          {/* Alerta Crítica: Casos críticos > 10 */}
          {(metrics.nom035Compliance.casesOpen || 0) > 50 && (
            <AlertBanner
              level="critical"
              title="¡Alerta Crítica!"
              description={`Hay ${metrics.nom035Compliance.casesOpen} casos abiertos. Se recomienda revisar y atender los casos prioritarios inmediatamente.`}
              pulse={true}
              action={{
                label: "Ver Casos Críticos",
                onClick: () => setLocation("/cases?priority=critical"),
              }}
            />
          )}

          {/* Alerta Warning: Cobertura < 80% */}
          {metrics.nom035Compliance.surveyCoverage < 80 && (
            <AlertBanner
              level="warning"
              title="Cobertura de Encuestas Baja"
              description={`La cobertura actual es ${metrics.nom035Compliance.surveyCoverage.toFixed(1)}%. Se recomienda enviar recordatorios a los empleados pendientes.`}
            />
          )}

          {/* Alerta Info: Casos cerrados exitosamente */}
          {metrics.nom035Compliance.casesClosed > 0 && metrics.nom035Compliance.surveyCoverage >= 90 && (
            <AlertBanner
              level="info"
              title="Cumplimiento Excelente"
              description={`Se han cerrado ${metrics.nom035Compliance.casesClosed} casos y la cobertura de encuestas es ${metrics.nom035Compliance.surveyCoverage.toFixed(1)}%. ¡Buen trabajo!`}
            />
          )}
        </div>
      )}

      {/* Cards de métricas principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Casos Abiertos</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.nom035Compliance.casesOpen || 0}</div>
            <p className="text-xs text-muted-foreground">Requieren atención</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Investigación</CardTitle>
            <FileText className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {trendsData?.casesTrend.created.reduce((sum, c) => sum + c.count, 0) || 0}
            </div>
            <p className="text-xs text-muted-foreground">Casos en proceso</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Casos</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(metrics?.nom035Compliance.casesOpen || 0) + (metrics?.nom035Compliance.casesClosed || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Todos los registros</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cobertura Encuestas</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.nom035Compliance.surveyCoverage.toFixed(1) || 0}%</div>
            <p className="text-xs text-muted-foreground">Cumplimiento NOM-035</p>
          </CardContent>
        </Card>
      </div>

      {/* Gráficas */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Tendencia de Casos */}
        <Card>
          <CardHeader>
            <CardTitle>Tendencia de Casos</CardTitle>
            <CardDescription>Casos creados vs cerrados en el período seleccionado</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {trendsLoading ? (
                <div className="flex items-center justify-center h-full">Cargando...</div>
              ) : (
                <Line options={lineChartOptions} data={casesTrendData} />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Distribución de Niveles de Riesgo */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución de Niveles de Riesgo</CardTitle>
            <CardDescription>Casos por nivel de riesgo psicosocial</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {trendsLoading ? (
                <div className="flex items-center justify-center h-full">Cargando...</div>
              ) : (
                <Doughnut options={doughnutOptions} data={riskDistributionData} />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Cobertura de Encuestas */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Cobertura de Encuestas NOM-035</CardTitle>
            <CardDescription>Encuestas completadas por fecha</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {trendsLoading ? (
                <div className="flex items-center justify-center h-full">Cargando...</div>
              ) : (
                <Bar options={lineChartOptions} data={surveyCoverageData} />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Comparación Histórica: Mes Actual vs Anterior */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Comparación Histórica: Mes Actual vs Anterior</CardTitle>
            <CardDescription>Mejoras en cumplimiento NOM-035</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              {comparisonLoading ? (
                <div className="flex items-center justify-center h-full">Cargando...</div>
              ) : (
                <Bar
                  options={{
                    ...lineChartOptions,
                    plugins: {
                      ...lineChartOptions.plugins,
                      legend: {
                        position: 'top' as const,
                      },
                    },
                  }}
                  data={{
                    labels: ['Casos Abiertos', 'Casos Cerrados', 'Casos Críticos', 'Cobertura (%)'],
                    datasets: [
                      {
                        label: 'Mes Anterior',
                        data: [
                          comparison?.lastMonth.casesOpen || 0,
                          comparison?.lastMonth.casesClosed || 0,
                          comparison?.lastMonth.criticalCases || 0,
                          comparison?.lastMonth.surveyCoverage || 0,
                        ],
                        backgroundColor: 'rgba(156, 163, 175, 0.5)',
                        borderColor: 'rgba(156, 163, 175, 1)',
                        borderWidth: 1,
                      },
                      {
                        label: 'Mes Actual',
                        data: [
                          comparison?.currentMonth.casesOpen || 0,
                          comparison?.currentMonth.casesClosed || 0,
                          comparison?.currentMonth.criticalCases || 0,
                          comparison?.currentMonth.surveyCoverage || 0,
                        ],
                        backgroundColor: 'rgba(59, 130, 246, 0.5)',
                        borderColor: 'rgba(59, 130, 246, 1)',
                        borderWidth: 1,
                      },
                    ],
                  }}
                />
              )}
            </div>
            {comparison && (
              <div className="mt-4 grid grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <p className="text-muted-foreground">Casos Abiertos</p>
                  <p className={`font-bold ${comparison.changes.casesOpen > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {comparison.changes.casesOpen > 0 ? '+' : ''}{comparison.changes.casesOpen.toFixed(1)}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground">Casos Cerrados</p>
                  <p className={`font-bold ${comparison.changes.casesClosed > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {comparison.changes.casesClosed > 0 ? '+' : ''}{comparison.changes.casesClosed.toFixed(1)}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground">Casos Críticos</p>
                  <p className={`font-bold ${comparison.changes.criticalCases > 0 ? 'text-red-600' : 'text-green-600'}`}>
                    {comparison.changes.criticalCases > 0 ? '+' : ''}{comparison.changes.criticalCases.toFixed(1)}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground">Cobertura</p>
                  <p className={`font-bold ${comparison.changes.surveyCoverage > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {comparison.changes.surveyCoverage > 0 ? '+' : ''}{comparison.changes.surveyCoverage.toFixed(1)}%
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tendencia de Alertas */}
      <Card className="md:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Tendencia de Alertas</CardTitle>
              <CardDescription>Evolución de alertas activas vs resueltas</CardDescription>
            </div>
            <Select value={alertMonths.toString()} onValueChange={(v) => setAlertMonths(parseInt(v) as 6 | 12 | 24)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="6">Últimos 6 meses</SelectItem>
                <SelectItem value="12">Últimos 12 meses</SelectItem>
                <SelectItem value="24">Últimos 24 meses</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            {alertTrendsLoading ? (
              <div className="flex items-center justify-center h-full">Cargando...</div>
            ) : (
              <Line
                options={lineChartOptions}
                data={{
                  labels: alertTrends?.map(t => {
                    const [year, month] = t.month.split('-');
                    return new Date(parseInt(year), parseInt(month) - 1).toLocaleDateString('es-MX', { month: 'short', year: 'numeric' });
                  }) || [],
                  datasets: [
                    {
                      label: 'Alertas Activas',
                      data: alertTrends?.map(t => t.activeAlerts) || [],
                      borderColor: 'rgba(239, 68, 68, 1)',
                      backgroundColor: 'rgba(239, 68, 68, 0.1)',
                      tension: 0.4,
                    },
                    {
                      label: 'Alertas Resueltas',
                      data: alertTrends?.map(t => t.resolvedAlerts) || [],
                      borderColor: 'rgba(34, 197, 94, 1)',
                      backgroundColor: 'rgba(34, 197, 94, 0.1)',
                      tension: 0.4,
                    },
                  ],
                }}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* Distribución por Departamento */}
      {metrics && (
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Departamento</CardTitle>
            <CardDescription>Empleados por área organizacional</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metrics.employeesAndStructure.departmentDistribution.map((dept) => (
                <div key={dept.department} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{dept.department}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-[200px] bg-secondary rounded-full h-2">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{
                          width: `${(dept.count / metrics.employeesAndStructure.totalEmployees) * 100}%`,
                        }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-12 text-right">{dept.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
