import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DateRangeFilter } from '@/components/DateRangeFilter';
import { 
  Users, 
  FileSignature, 
  Shield, 
  AlertCircle, 
  CheckCircle,
  TrendingUp,
  BarChart3
} from 'lucide-react';
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
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb';

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

export default function ExecutiveDashboard() {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | undefined>(undefined);

  const filters = useMemo(() => {
    if (!dateRange) return undefined;
    return {
      startDate: dateRange.from.toISOString(),
      endDate: dateRange.to.toISOString(),
    };
  }, [dateRange]);

  const { data: metrics, isLoading } = trpc.executiveDashboard.getMetrics.useQuery(filters);

  if (isLoading) {
    return (
      <div className="container py-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Cargando métricas ejecutivas...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="container py-6">
        <div className="text-center">
          <p className="text-muted-foreground">No se pudieron cargar las métricas</p>
        </div>
      </div>
    );
  }

  // Preparar datos para gráficas
  const departmentChartData = {
    labels: metrics.employeesAndStructure.departmentDistribution.map(d => d.department),
    datasets: [
      {
        label: 'Empleados por Departamento',
        data: metrics.employeesAndStructure.departmentDistribution.map(d => d.count),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(245, 158, 11, 0.8)',
          'rgba(239, 68, 68, 0.8)',
          'rgba(139, 92, 246, 0.8)',
          'rgba(236, 72, 153, 0.8)',
        ],
      },
    ],
  };

  const riskTrendChartData = {
    labels: metrics.nom035Compliance.riskTrend.map(r => r.surveyTitle),
    datasets: [
      {
        label: 'Puntuación Promedio de Riesgo',
        data: metrics.nom035Compliance.riskTrend.map(r => r.avgScore),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        tension: 0.4,
      },
    ],
  };

  const genderChartData = {
    labels: metrics.nmx025Equality.genderDistribution.map(g => g.sexo),
    datasets: [
      {
        label: 'Distribución por Género',
        data: metrics.nmx025Equality.genderDistribution.map(g => g.count),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(236, 72, 153, 0.8)',
          'rgba(156, 163, 175, 0.8)',
        ],
      },
    ],
  };

  return (
    <div className="container py-6 space-y-6">
      {/* Breadcrumbs */}
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Inicio</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Dashboard Ejecutivo</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Ejecutivo</h1>
          <p className="text-muted-foreground">
            Métricas consolidadas de Gestión de Talento, NOM-035 y NMX-025
          </p>
        </div>
        <DateRangeFilter value={dateRange} onChange={setDateRange} />
      </div>

      {/* Métricas de Empleados y Estructura */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Empleados y Estructura Organizacional</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Empleados</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.employeesAndStructure.totalEmployees}</div>
              <p className="text-xs text-muted-foreground">Empleados registrados</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Representantes Legales</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.employeesAndStructure.activeLegalReps}</div>
              <p className="text-xs text-muted-foreground">Activos en el sistema</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Firmantes Autorizados</CardTitle>
              <FileSignature className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.employeesAndStructure.authorizedSigners}</div>
              <p className="text-xs text-muted-foreground">Con firma digital NOM-151</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Departamentos</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics.employeesAndStructure.departmentDistribution.length}
              </div>
              <p className="text-xs text-muted-foreground">Áreas organizacionales</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Gráfica de Distribución por Departamento */}
      <Card>
        <CardHeader>
          <CardTitle>Distribución de Empleados por Departamento</CardTitle>
          <CardDescription>Vista consolidada de la estructura organizacional</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <Bar
              data={departmentChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false,
                  },
                },
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Métricas de Cumplimiento NOM-035 */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Cumplimiento NOM-035-STPS-2018</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Casos Abiertos</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {metrics.nom035Compliance.casesOpen}
              </div>
              <p className="text-xs text-muted-foreground">Requieren atención</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Casos Cerrados</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {metrics.nom035Compliance.casesClosed}
              </div>
              <p className="text-xs text-muted-foreground">Resueltos exitosamente</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cobertura de Encuestas</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.nom035Compliance.surveyCoverage}%</div>
              <p className="text-xs text-muted-foreground">Encuestas completadas</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Casos</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics.nom035Compliance.casesOpen + metrics.nom035Compliance.casesClosed}
              </div>
              <p className="text-xs text-muted-foreground">Todos los registros</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Gráfica de Tendencia de Factores de Riesgo */}
      {metrics.nom035Compliance.riskTrend.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Tendencia de Factores de Riesgo Psicosocial</CardTitle>
            <CardDescription>Evolución de puntuaciones promedio en encuestas NOM-035</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <Line
                data={riskTrendChartData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: {
                    legend: {
                      display: true,
                      position: 'top',
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

      {/* Métricas de Igualdad Laboral NMX-025 */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Igualdad Laboral NMX-025-SCFI-2015</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Distribución por Género</CardTitle>
              <CardDescription>Composición de la plantilla laboral</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <Pie
                  data={genderChartData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom',
                      },
                    },
                  }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quejas de Discriminación</CardTitle>
              <CardDescription>Sistema de atención a quejas NMX-025</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center h-[250px]">
              <div className="text-center">
                <div className="text-5xl font-bold text-blue-600 mb-2">
                  {metrics.nmx025Equality.totalComplaints}
                </div>
                <p className="text-sm text-muted-foreground">Total de quejas registradas</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
