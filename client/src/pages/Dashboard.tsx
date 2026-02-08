import { useState, useMemo } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { DateRangeFilter } from '@/components/DateRangeFilter';
import { Link } from 'wouter';
import { 
  Users, 
  FileSignature, 
  Shield, 
  AlertCircle, 
  CheckCircle,
  TrendingUp,
  BarChart3,
  BookOpen,
  ClipboardCheck,
  FileText,
  Award,
  Target,
  ArrowRight
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

export default function DashboardConsolidated() {
  const { user } = useAuth();
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
  });

  // Métricas por rol
  const { data: courses, isLoading: coursesLoading } = trpc.courses.list.useQuery();
  const { data: progress, isLoading: progressLoading } = trpc.progress.my.useQuery();
  const { data: cases, isLoading: casesLoading } = trpc.cases.list.useQuery(undefined, {
    enabled: user?.role === 'admin' || user?.role === 'committee',
  });

  // Brechas críticas de competencias (solo para admin)
  const { data: criticalGaps, isLoading: gapsLoading } = trpc.trainingNeeds.getCriticalGaps.useQuery(
    undefined,
    { enabled: user?.role === 'admin' }
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

  const completedCourses = progress?.filter((p) => p.status === 'completed').length || 0;
  const inProgressCourses = progress?.filter((p) => p.status === 'in_progress').length || 0;
  const openCases = cases?.filter((c) => c.status === 'open').length || 0;
  const investigatingCases = cases?.filter((c) => c.status === 'investigating').length || 0;

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
                <Award className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{completedCourses}</div>
                <p className="text-xs text-muted-foreground">Certificaciones obtenidas</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">En Progreso</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{inProgressCourses}</div>
                <p className="text-xs text-muted-foreground">Cursos activos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cursos Disponibles</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{coursesLoading ? '...' : courses?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Total de cursos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recursos</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Disponibles</div>
                <p className="text-xs text-muted-foreground">Manuales y protocolos</p>
              </CardContent>
            </Card>
          </>
        )}

        {(user?.role === 'admin' || user?.role === 'committee') && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Casos Abiertos</CardTitle>
                <AlertCircle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{openCases}</div>
                <p className="text-xs text-muted-foreground">Requieren atención</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">En Investigación</CardTitle>
                <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{investigatingCases}</div>
                <p className="text-xs text-muted-foreground">Casos en proceso</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total de Casos</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{casesLoading ? '...' : cases?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Todos los registros</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cursos</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{coursesLoading ? '...' : courses?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Programas activos</p>
              </CardContent>
            </Card>
          </>
        )}

        {user?.role === 'instructor' && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cursos</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{coursesLoading ? '...' : courses?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Total de cursos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Estudiantes</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">-</div>
                <p className="text-xs text-muted-foreground">Inscritos activos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Evaluaciones</CardTitle>
                <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">-</div>
                <p className="text-xs text-muted-foreground">Pendientes de revisión</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recursos</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
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
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.employeesAndStructure.totalEmployees}</div>
                <p className="text-xs text-muted-foreground">Plantilla laboral</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Representantes Legales</CardTitle>
                <FileSignature className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.employeesAndStructure.activeLegalReps}</div>
                <p className="text-xs text-muted-foreground">Activos</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Firmantes Autorizados</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.employeesAndStructure.authorizedSigners}</div>
                <p className="text-xs text-muted-foreground">Certificados digitales</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cobertura Encuestas</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.nom035Compliance.surveyCoverage}%</div>
                <p className="text-xs text-muted-foreground">Cumplimiento NOM-035</p>
              </CardContent>
            </Card>
          </div>

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
          </div>

          {riskTrendChartData && (
            <Card>
              <CardHeader>
                <CardTitle>Tendencia de Factores de Riesgo Psicosocial</CardTitle>
                <CardDescription>Evolución de puntuaciones NOM-035-STPS-2018</CardDescription>
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
                <Target className="h-5 w-5 text-orange-600" />
                <CardTitle className="text-orange-900">Brechas Críticas de Competencias</CardTitle>
              </div>
              <Link href="/competencies-dashboard">
                <Button variant="outline" size="sm" className="gap-2">
                  Ver Dashboard Completo
                  <ArrowRight className="h-4 w-4" />
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
                <Target className="h-12 w-12 mx-auto mb-2 text-gray-400" />
                <p>No hay brechas críticas detectadas</p>
                <p className="text-sm mt-1">Todos los empleados cumplen con las competencias requeridas</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-4">Accesos Rápidos</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {user?.role === 'student' && (
            <>
              <Link href="/courses">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <BookOpen className="h-6 w-6 text-primary" />
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
                        <ClipboardCheck className="h-6 w-6 text-primary" />
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
                        <FileText className="h-6 w-6 text-primary" />
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

          {(user?.role === 'admin' || user?.role === 'committee') && (
            <>
              <Link href="/cases">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-destructive/10 rounded-lg">
                        <AlertCircle className="h-6 w-6 text-destructive" />
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
                        <ClipboardCheck className="h-6 w-6 text-primary" />
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
                        <FileText className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle>Reportes Normativos</CardTitle>
                        <CardDescription>Informe Numeral 7.5 NOM-035</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            </>
          )}

          {user?.role === 'instructor' && (
            <>
              <Link href="/courses">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <BookOpen className="h-6 w-6 text-primary" />
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
                        <ClipboardCheck className="h-6 w-6 text-primary" />
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
                        <FileText className="h-6 w-6 text-primary" />
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
    </div>
  );
}
