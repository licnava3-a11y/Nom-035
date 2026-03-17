import { useState, useMemo } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import DashboardInstructor from '@/components/DashboardInstructor';
import DashboardGerente from '@/components/DashboardGerente';
import DashboardAdministrativo from '@/components/DashboardAdministrativo';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { DashboardSkeleton } from '@/components/skeletons';
import { Button } from '@/components/ui/button';
import { DateRangeFilter } from '@/components/DateRangeFilter';
import TrendsCharts from '@/components/TrendsCharts';
import RecognitionsCard from '@/components/RecognitionsCard';
import AssignManagerDialog from '@/components/AssignManagerDialog';
import { Link } from 'wouter';
import { ICONS } from '@/lib/iconography';
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
import annotationPlugin from 'chartjs-plugin-annotation';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  annotationPlugin
);

export default function DashboardConsolidated() {
  const { user } = useAuth();

  // Renderizar dashboard personalizado según rol
  // Gerente y coordinador del comité tienen vista gerencial
  if (user?.role === 'gerente' || user?.role === 'committee_coordinator') {
    return <DashboardGerente />;
  }

  // Instructor, committee y committee_member pueden ver dashboard de capacitación
  if (user?.role === 'instructor' || user?.role === 'committee' || user?.role === 'committee_member') {
    return <DashboardInstructor />;
  }

  // Administrativo tiene vista de finanzas y facturación
  if (user?.role === 'administrativo') {
    return <DashboardAdministrativo />;
  }

  // Dashboard por defecto para admin y otros roles
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date } | undefined>(undefined);

  const filters = useMemo(() => {
    if (!dateRange) return undefined;
    return {
      startDate: dateRange.from.toISOString(),
      endDate: dateRange.to.toISOString(),
    };
  }, [dateRange]);

  // Métricas ejecutivas (solo para admin)
  const { data: metrics, isLoading: metricsLoading } = trpc.executiveDashboard.getMetrics.useQuery(filters, {
    enabled: user?.role === 'admin',
    staleTime: 15 * 60 * 1000, // 15 minutos - métricas ejecutivas cambian poco
    gcTime: 30 * 60 * 1000, // 30 minutos en cache
  });

  // Métricas por rol
  const { data: courses, isLoading: coursesLoading } = trpc.courses.list.useQuery();
  const { data: progress, isLoading: progressLoading } = trpc.progress.my.useQuery();
  const { data: cases, isLoading: casesLoading } = trpc.cases.list.useQuery(undefined, {
    enabled: user?.role === 'admin' || (user?.role as string) === 'committee',
  });

  // Alertas de departamentos sin manager (solo para admin)
  const { data: departmentAlerts, isLoading: alertsLoading } = trpc.departments.getActiveAlerts.useQuery(undefined, {
    enabled: user?.role === 'admin',
    refetchInterval: 5 * 60 * 1000, // Refetch cada 5 minutos
  });

  // Estado para dialog de asignación rápida
  const [selectedDepartment, setSelectedDepartment] = useState<number | null>(null);

  // Brechas críticas de competencias (solo para admin)
  const { data: criticalGaps, isLoading: gapsLoading } = trpc.trainingNeeds.getCriticalGaps.useQuery(
    undefined,
    { 
      enabled: user?.role === 'admin',
      staleTime: 20 * 60 * 1000, // 20 minutos - brechas críticas cambian poco
      gcTime: 40 * 60 * 1000, // 40 minutos en cache
    }
  );

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: 'Administrador',
      instructor: 'Instructor',
      student: 'Estudiante',
      committee: 'Comité de Atención',
    };
    return labels[role] || role;
  };

  const completedCourses = progress?.filter((p: any) => p.status === 'completed').length || 0;
  const inProgressCourses = progress?.filter((p: any) => p.status === 'in_progress').length || 0;
  const openCases = cases?.cases?.filter((c: any) => c.status === 'open').length || 0;
  const investigatingCases = cases?.cases?.filter((c: any) => c.status === 'investigating').length || 0;

  // Preparar datos para gráficas (solo para admin)
  const departmentChartData = metrics ? {
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
  } : null;

  const riskTrendChartData = metrics ? {
    labels: metrics.nom035Compliance.riskTrend.map(r => {
      // Transformar nombres largos a nomenclatura abreviada
      const title = r.surveyTitle;
      // Orden de verificación: más específico primero
      if (title.includes('Guía III') || title.includes('Evaluación de Factores')) return 'Guía III-FRPS + EOF';
      if (title.includes('Guía II') || title.includes('Identificación de Factores')) return 'Guía II';
      if (title.includes('Guía I') || title.includes('Acontecimientos Traumáticos')) return 'Guía I-ATS';
      return title; // Mantener título original si no coincide
    }),
    datasets: [
      {
        label: 'Puntuación Promedio de Riesgo',
        data: metrics.nom035Compliance.riskTrend.map(r => r.avgScore),
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        tension: 0.4,
      },
    ],
  } : null;

  const genderChartData = metrics ? {
    labels: metrics.nmx025Equality.genderDistribution.map(g => g.sexo),
    datasets: [
      {
        label: 'Distribución de Género',
        data: metrics.nmx025Equality.genderDistribution.map(g => g.count),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(236, 72, 153, 0.8)',
          'rgba(156, 163, 175, 0.8)',
        ],
      },
    ],
  } : null;

  // Brecha Salarial por Género
  const salaryGapChartData = metrics && metrics.nmx025Equality.salaryGapByGender.length > 0 ? {
    labels: metrics.nmx025Equality.salaryGapByGender.map(s => s.sexo),
    datasets: [
      {
        label: 'Salario Promedio Mensual',
        data: metrics.nmx025Equality.salaryGapByGender.map(s => s.avgSalary),
        backgroundColor: [
          'rgba(59, 130, 246, 0.8)',
          'rgba(236, 72, 153, 0.8)',
          'rgba(156, 163, 175, 0.8)',
        ],
      },
    ],
  } : null;

  // Distribución por Nivel Jerárquico y Género
  const hierarchyChartData = metrics && metrics.nmx025Equality.hierarchyDistribution.length > 0 ? (() => {
    const uniqueLevels = Array.from(new Set(metrics.nmx025Equality.hierarchyDistribution.map(h => h.nivelJerarquico)));
    return {
      labels: uniqueLevels,
      datasets: [
        {
          label: 'Masculino',
          data: uniqueLevels.map(nivel =>
            metrics.nmx025Equality.hierarchyDistribution
              .filter(h => h.nivelJerarquico === nivel && h.sexo === 'Masculino')
              .reduce((sum: any, h: any) => sum + h.count, 0)
          ),
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
        },
        {
          label: 'Femenino',
          data: uniqueLevels.map(nivel =>
            metrics.nmx025Equality.hierarchyDistribution
              .filter(h => h.nivelJerarquico === nivel && h.sexo === 'Femenino')
              .reduce((sum: any, h: any) => sum + h.count, 0)
          ),
          backgroundColor: 'rgba(236, 72, 153, 0.8)',
        },
      ],
    };
  })() : null;

  // Mostrar skeleton mientras carga (solo para admin con métricas ejecutivas)
  if (user?.role === 'admin' && metricsLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Bienvenido, {user?.name || 'Usuario'}
          </h1>
          <p className="text-muted-foreground mt-2">
            {getRoleLabel(user?.role || 'student')} - Plataforma de Capacitación NOM-035 STPS 2018
          </p>
        </div>
        <DashboardSkeleton cards={8} charts={3} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Bienvenido, {user?.name || 'Usuario'}
        </h1>
        <p className="text-muted-foreground mt-2">
          {getRoleLabel(user?.role || 'student')} - Plataforma de Capacitación NOM-035 STPS 2018
        </p>
      </div>

      {/* Filtros temporales (solo para admin) */}
      {user?.role === 'admin' && (
        <div className="bg-muted/30 p-4 rounded-lg border">
          <div className="flex items-center gap-4">
            <div className="flex-shrink-0">
              <p className="text-sm font-medium">Filtrar por período:</p>
            </div>
            <div className="flex-1">
              <DateRangeFilter value={dateRange} onChange={setDateRange} />
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards por Rol */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {user?.role === 'student' && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cursos Completados</CardTitle>
                <ICONS.status.success className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{completedCourses}</div>
                <p className="text-xs text-muted-foreground">Certificaciones obtenidas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">En Progreso</CardTitle>
                <ICONS.data.trendUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{inProgressCourses}</div>
                <p className="text-xs text-muted-foreground">Cursos activos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cursos Disponibles</CardTitle>
                <ICONS.documents.generic className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {coursesLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">{courses?.length || 0}</div>
                )}
                <p className="text-xs text-muted-foreground">Total de cursos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recursos</CardTitle>
                <ICONS.documents.generic className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Disponibles</div>
                <p className="text-xs text-muted-foreground">Manuales y protocolos</p>
              </CardContent>
            </Card>
          </>
        )}

        {(user?.role === 'admin' || (user?.role as string) === 'committee') && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Casos Abiertos</CardTitle>
                <ICONS.status.warning className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{openCases}</div>
                <p className="text-xs text-muted-foreground">Requieren atención</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">En Investigación</CardTitle>
                <ICONS.actions.view className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{investigatingCases}</div>
                <p className="text-xs text-muted-foreground">Casos en proceso</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Casos</CardTitle>
                <ICONS.users.multiple className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{casesLoading ? '...' : cases?.totalCount || 0}</div>
                <p className="text-xs text-muted-foreground">Total de casos registrados</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cursos</CardTitle>
                <ICONS.documents.generic className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{coursesLoading ? '...' : courses?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Programas activos</p>
              </CardContent>
            </Card>
          </>
        )}

        {(user?.role as string) === 'instructor' && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cursos</CardTitle>
                <ICONS.documents.generic className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {coursesLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">{courses?.length || 0}</div>
                )}
                <p className="text-xs text-muted-foreground">Total de cursos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Estudiantes</CardTitle>
                <ICONS.users.multiple className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">-</div>
                <p className="text-xs text-muted-foreground">Inscritos activos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Evaluaciones</CardTitle>
                <ICONS.actions.view className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">-</div>
                <p className="text-xs text-muted-foreground">Pendientes de revisión</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recursos</CardTitle>
                <ICONS.documents.generic className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Disponibles</div>
                <p className="text-xs text-muted-foreground">Materiales de apoyo</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Métricas Ejecutivas (solo para admin) */}
      {user?.role === 'admin' && metrics && (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Empleados</CardTitle>
                <ICONS.users.multiple className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.employeesAndStructure.totalEmployees}</div>
                <p className="text-xs text-muted-foreground">Plantilla laboral</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Representantes Legales</CardTitle>
                <ICONS.documents.signed className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.employeesAndStructure.activeLegalReps}</div>
                <p className="text-xs text-muted-foreground">Activos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Firmantes Autorizados</CardTitle>
                <ICONS.tools.security className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.employeesAndStructure.authorizedSigners}</div>
                <p className="text-xs text-muted-foreground">Certificados digitales</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cobertura Encuestas</CardTitle>
                <ICONS.data.chart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.nom035Compliance.surveyCoverage}%</div>
                <p className="text-xs text-muted-foreground">Cumplimiento NOM-035</p>
              </CardContent>
            </Card>
          </div>

          {/* Widget de Alertas de Departamentos */}
          {departmentAlerts && departmentAlerts.totalCount > 0 && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-destructive flex items-center gap-2">
                      <ICONS.status.warning className="h-5 w-5" />
                      Alertas de Departamentos sin Manager
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {departmentAlerts.totalCount} departamento(s) sin responsable asignado por más de 30 días
                    </CardDescription>
                  </div>
                  <Link href="/department-management">
                    <Button variant="outline" size="sm">
                      Gestionar Departamentos
                      <ICONS.navigation.forward className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {departmentAlerts.alerts.slice(0, 5).map((alert: any) => (
                    <div
                      key={alert.id}
                      className="flex items-center justify-between p-3 bg-background rounded-lg border"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{alert.name}</p>
                          {alert.code && (
                            <span className="text-xs text-muted-foreground">({alert.code})</span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {alert.daysSinceCreation} días sin manager
                          {alert.urgency === "critical" && (
                            <span className="ml-2 text-destructive font-semibold">⚠️ CRÍTICO</span>
                          )}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => setSelectedDepartment(alert.id)}
                      >
                        Asignar Manager
                      </Button>
                    </div>
                  ))}
                  {departmentAlerts.totalCount > 5 && (
                    <p className="text-sm text-muted-foreground text-center pt-2">
                      Y {departmentAlerts.totalCount - 5} departamento(s) más...
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Gráficas */}
          <div className="grid gap-6 md:grid-cols-2">
            {departmentChartData && (
              <Card>
                <CardHeader>
                  <CardTitle>Distribución por Departamento</CardTitle>
                  <CardDescription>Empleados por área organizacional</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <Bar 
                      data={departmentChartData} 
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { display: false },
                        },
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {genderChartData && (
              <Card>
                <CardHeader>
                  <CardTitle>Distribución de Género</CardTitle>
                  <CardDescription>Cumplimiento NMX-025-SCFI-2015</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <Pie 
                      data={genderChartData} 
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {salaryGapChartData && (
              <Card>
                <CardHeader>
                  <CardTitle>Brecha Salarial por Género</CardTitle>
                  <CardDescription>Salario promedio mensual - NMX-025-SCFI-2015</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <Bar 
                      data={salaryGapChartData} 
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                          y: {
                            beginAtZero: true,
                            ticks: {
                              callback: (value) => `$${value.toLocaleString()}`,
                            },
                          },
                        },
                        plugins: {
                          tooltip: {
                            callbacks: {
                              label: (context) => `${context.dataset.label}: $${(context.parsed.y || 0).toLocaleString()}`,
                            },
                          },
                        },
                      }}
                    />
                  </div>
                  {metrics && metrics.nmx025Equality.salaryGapByGender.length >= 2 && (
                    <div className="mt-4 text-sm text-muted-foreground">
                      <p>
                        Brecha salarial: {(
                          ((metrics.nmx025Equality.salaryGapByGender.find(s => s.sexo === 'Masculino')?.avgSalary || 0) -
                           (metrics.nmx025Equality.salaryGapByGender.find(s => s.sexo === 'Femenino')?.avgSalary || 0)) /
                          (metrics.nmx025Equality.salaryGapByGender.find(s => s.sexo === 'Masculino')?.avgSalary || 1) * 100
                        ).toFixed(1)}%
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {hierarchyChartData && (
              <Card>
                <CardHeader>
                  <CardTitle>Distribución por Nivel Jerárquico</CardTitle>
                  <CardDescription>Equidad de género por nivel - NMX-025-SCFI-2015</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <Bar 
                      data={hierarchyChartData} 
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                          y: {
                            beginAtZero: true,
                          },
                        },
                      }}
                    />
                  </div>
                  {metrics && metrics.nmx025Equality.femaleDirectivesPercentage !== undefined && (
                    <div className="mt-4 text-sm text-muted-foreground">
                      <p>
                        Mujeres en puestos directivos: {metrics.nmx025Equality.femaleDirectivesPercentage.toFixed(1)}%
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {riskTrendChartData && (
            <Card>
              <CardHeader>
                <CardTitle>Tendencia de Factores de Riesgo Psicosocial</CardTitle>
                <CardDescription>Evolución de puntuaciones NOM-035-STPS-2018</CardDescription>
                {/* Selector de periodo temporal */}
                <div className="flex gap-2 mt-4">
                  <Button
                    variant={!dateRange ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDateRange(undefined)}
                  >
                    Todos
                  </Button>
                  <Button
                    variant={dateRange && dateRange.from.getTime() === new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).setHours(0,0,0,0) ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      const from = new Date();
                      from.setDate(from.getDate() - 7);
                      from.setHours(0, 0, 0, 0);
                      const to = new Date();
                      to.setHours(23, 59, 59, 999);
                      setDateRange({ from, to });
                    }}
                  >
                    Última Semana
                  </Button>
                  <Button
                    variant={dateRange && dateRange.from.getTime() === new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).setHours(0,0,0,0) ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      const from = new Date();
                      from.setDate(from.getDate() - 30);
                      from.setHours(0, 0, 0, 0);
                      const to = new Date();
                      to.setHours(23, 59, 59, 999);
                      setDateRange({ from, to });
                    }}
                  >
                    Último Mes
                  </Button>
                  <Button
                    variant={dateRange && dateRange.from.getTime() === new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).setHours(0,0,0,0) ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      const from = new Date();
                      from.setDate(from.getDate() - 90);
                      from.setHours(0, 0, 0, 0);
                      const to = new Date();
                      to.setHours(23, 59, 59, 999);
                      setDateRange({ from, to });
                    }}
                  >
                    Último Trimestre
                  </Button>
                  <Button
                    variant={dateRange && dateRange.from.getTime() === new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).setHours(0,0,0,0) ? "default" : "outline"}
                    size="sm"
                    onClick={() => {
                      const from = new Date();
                      from.setDate(from.getDate() - 365);
                      from.setHours(0, 0, 0, 0);
                      const to = new Date();
                      to.setHours(23, 59, 59, 999);
                      setDateRange({ from, to });
                    }}
                  >
                    Último Año
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <Line 
                    data={riskTrendChartData} 
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      scales: {
                        y: {
                          beginAtZero: true,
                          max: 1.0,
                          ticks: {
                            callback: function(value) {
                              return (value as number).toFixed(2);
                            }
                          }
                        },
                      },
                      plugins: {
                        annotation: {
                          annotations: {
                            // Banda azul: Nulo (0-0.20)
                            blueZone: {
                              type: 'box',
                              yMin: 0,
                              yMax: 0.20,
                              backgroundColor: 'rgba(59, 130, 246, 0.1)',
                              borderColor: 'rgba(59, 130, 246, 0.3)',
                              borderWidth: 1,
                              label: {
                                display: true,
                                content: 'NULO: El riesgo resulta despreciable, no se requieren medidas adicionales',
                                position: 'center',
                                font: { size: 10 },
                                color: 'rgba(59, 130, 246, 0.7)',
                              },
                            },
                            // Banda verde: Bajo (0.21-0.40)
                            greenZone: {
                              type: 'box',
                              yMin: 0.21,
                              yMax: 0.40,
                              backgroundColor: 'rgba(34, 197, 94, 0.1)',
                              borderColor: 'rgba(34, 197, 94, 0.3)',
                              borderWidth: 1,
                              label: {
                                display: true,
                                content: 'BAJO: Revisar política de prevención y programas',
                                position: 'center',
                                font: { size: 10 },
                                color: 'rgba(34, 197, 94, 0.7)',
                              },
                            },
                            // Banda amarilla: Medio (0.41-0.60)
                            yellowZone: {
                              type: 'box',
                              yMin: 0.41,
                              yMax: 0.60,
                              backgroundColor: 'rgba(234, 179, 8, 0.1)',
                              borderColor: 'rgba(234, 179, 8, 0.3)',
                              borderWidth: 1,
                              label: {
                                display: true,
                                content: 'MEDIO: Reforzar aplicación mediante Programa de intervención',
                                position: 'center',
                                font: { size: 10 },
                                color: 'rgba(234, 179, 8, 0.7)',
                              },
                            },
                            // Banda naranja: Alto (0.61-0.80)
                            orangeZone: {
                              type: 'box',
                              yMin: 0.61,
                              yMax: 0.80,
                              backgroundColor: 'rgba(249, 115, 22, 0.1)',
                              borderColor: 'rgba(249, 115, 22, 0.3)',
                              borderWidth: 1,
                              label: {
                                display: true,
                                content: 'ALTO: Análisis por categoría + Programa de intervención + Campaña',
                                position: 'center',
                                font: { size: 10 },
                                color: 'rgba(249, 115, 22, 0.7)',
                              },
                            },
                            // Banda roja: Muy Alto (0.81-1.0)
                            redZone: {
                              type: 'box',
                              yMin: 0.81,
                              yMax: 1.0,
                              backgroundColor: 'rgba(239, 68, 68, 0.1)',
                              borderColor: 'rgba(239, 68, 68, 0.3)',
                              borderWidth: 1,
                              label: {
                                display: true,
                                content: 'MUY ALTO: Medidas inmediatas + Análisis + Programa + Campaña',
                                position: 'center',
                                font: { size: 10 },
                                color: 'rgba(239, 68, 68, 0.7)',
                              },
                            },
                          },
                        },
                        legend: {
                          display: true,
                          labels: {
                            generateLabels: function(chart) {
                              const original = ChartJS.defaults.plugins.legend.labels.generateLabels(chart);
                              // Agregar leyendas de bandas de riesgo NOM-035
                              return [
                                ...original,
                                {
                                  text: 'Nulo (0-0.20)',
                                  fillStyle: 'rgba(59, 130, 246, 0.3)',
                                  strokeStyle: 'rgba(59, 130, 246, 0.5)',
                                  lineWidth: 2,
                                  hidden: false,
                                  index: 100,
                                },
                                {
                                  text: 'Bajo (0.21-0.40)',
                                  fillStyle: 'rgba(34, 197, 94, 0.3)',
                                  strokeStyle: 'rgba(34, 197, 94, 0.5)',
                                  lineWidth: 2,
                                  hidden: false,
                                  index: 101,
                                },
                                {
                                  text: 'Medio (0.41-0.60)',
                                  fillStyle: 'rgba(234, 179, 8, 0.3)',
                                  strokeStyle: 'rgba(234, 179, 8, 0.5)',
                                  lineWidth: 2,
                                  hidden: false,
                                  index: 102,
                                },
                                {
                                  text: 'Alto (0.61-0.80)',
                                  fillStyle: 'rgba(249, 115, 22, 0.3)',
                                  strokeStyle: 'rgba(249, 115, 22, 0.5)',
                                  lineWidth: 2,
                                  hidden: false,
                                  index: 103,
                                },
                                {
                                  text: 'Muy Alto (0.81-1.0)',
                                  fillStyle: 'rgba(239, 68, 68, 0.3)',
                                  strokeStyle: 'rgba(239, 68, 68, 0.5)',
                                  lineWidth: 2,
                                  hidden: false,
                                  index: 104,
                                },
                              ];
                            },
                          },
                        },
                      },
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Critical Competency Gaps Widget - Admin Only */}
      {user?.role === 'admin' && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ICONS.data.target className="h-5 w-5 text-orange-600" />
                <CardTitle className="text-orange-900">Brechas Críticas de Competencias</CardTitle>
              </div>
              <Link href="/competencies-dashboard">
                <Button variant="outline" size="sm" className="gap-2">
                  Ver Dashboard Completo
                  <ICONS.navigation.forward className="h-4 w-4" />
                </Button>
              </Link>
            </div>
            <CardDescription className="text-orange-700">
              Top 3 competencias con mayor brecha organizacional
            </CardDescription>
          </CardHeader>
          <CardContent>
            {gapsLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
              </div>
            ) : criticalGaps && criticalGaps.length > 0 ? (
              <div className="space-y-4">
                {criticalGaps.map((gap, index) => (
                  <div key={index} className="flex items-center gap-4 p-4 bg-white rounded-lg border border-orange-200">
                    <div className="flex-shrink-0 w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center">
                      <span className="text-lg font-bold text-orange-600">#{index + 1}</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h3 className="font-semibold text-gray-900">{gap.competencyName}</h3>
                        <span className="text-sm font-medium text-orange-600">
                          {gap.affectedEmployees} empleado{gap.affectedEmployees !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>Brecha promedio: <strong>{Number(gap.avgGap).toFixed(1)}</strong></span>
                        <span className="text-gray-400">•</span>
                        <span className="capitalize">{gap.competencyType}</span>
                      </div>
                      <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-orange-500 h-2 rounded-full transition-all"
                          style={{ width: `${(Number(gap.avgGap) / 4) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <ICONS.data.target className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p>No hay brechas críticas detectadas</p>
                <p className="text-sm mt-1">Todos los empleados cumplen con las competencias requeridas</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recognitions Card - Admin Only */}
      {user?.role === 'admin' && <RecognitionsCard />}

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-4">Accesos Rápidos</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">          {(user?.role as string) === 'instructor' && (           <>
              <Link href="/courses">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <ICONS.documents.generic className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle>Explorar Cursos</CardTitle>
                        <CardDescription>Accede a los programas de capacitación</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </Link>

              <Link href="/evaluations">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <ICONS.actions.view className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle>Mis Evaluaciones</CardTitle>
                        <CardDescription>Revisa tus exámenes y calificaciones</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </Link>

              <Link href="/resources">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <ICONS.documents.generic className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle>Recursos</CardTitle>
                        <CardDescription>Manuales y protocolos NOM-035</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            </>
          )}

          {(user?.role === 'admin' || (user?.role as string) === 'committee') && (
            <>
              <Link href="/cases">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-destructive/10 rounded-lg">
                        <ICONS.status.warning className="h-6 w-6 text-destructive" />
                      </div>
                      <div>
                        <CardTitle>Gestionar Casos</CardTitle>
                        <CardDescription>Seguimiento de casos NOM-035</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </Link>

              <Link href="/surveys">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <ICONS.actions.view className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle>Encuestas NOM-035</CardTitle>
                        <CardDescription>Guías I, II y III</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </Link>

              <Link href="/reports/regulatory">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <ICONS.documents.generic className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle>Reportes Normativos</CardTitle>
                        <CardDescription>Informe Numeral 7.5 NOM-035</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </Link>

              {/* Tarjetas de Acceso Rápido a Reportes STPS */}
              <Link href="/stps-reports">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 border-blue-200 dark:border-blue-800">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                        <ICONS.status.success className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <CardTitle className="text-blue-900 dark:text-blue-100">Reportes STPS</CardTitle>
                        <CardDescription>Generar DC-2, DC-3 y DC-4</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            </>
          )}

          {(user?.role as string) === 'instructor' && (
            <>
              <Link href="/courses">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <ICONS.documents.generic className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle>Mis Cursos</CardTitle>
                        <CardDescription>Administra tus programas</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </Link>

              <Link href="/evaluations">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <ICONS.actions.view className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle>Evaluaciones</CardTitle>
                        <CardDescription>Revisa y califica exámenes</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </Link>

              <Link href="/resources">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <ICONS.documents.generic className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle>Recursos</CardTitle>
                        <CardDescription>Materiales de apoyo</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Sección de Tendencias Temporales (solo para admin) */}
      {user?.role === 'admin' && (
        <div>
          <h2 className="text-2xl font-bold mb-4">Tendencias Temporales</h2>
          <TrendsCharts />
        </div>
      )}

      {/* Dialog de Asignación Rápida de Manager */}
      {selectedDepartment && (
        <AssignManagerDialog
          departmentId={selectedDepartment}
          onClose={() => setSelectedDepartment(null)}
          onSuccess={() => {
            setSelectedDepartment(null);
            // Refetch alertas
            if (user?.role === 'admin') {
              trpc.useUtils().departments.getActiveAlerts.invalidate();
            }
          }}
        />
      )}
    </div>
  );
}
