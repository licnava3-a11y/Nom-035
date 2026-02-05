import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { BookOpen, ClipboardCheck, AlertCircle, FileText, TrendingUp, Users, Award, Target, ArrowRight } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function Dashboard() {
  const { user } = useAuth();
  const { data: courses, isLoading: coursesLoading } = trpc.courses.list.useQuery();
  const { data: progress, isLoading: progressLoading } = trpc.progress.my.useQuery();
  const { data: cases, isLoading: casesLoading } = trpc.cases.list.useQuery(undefined, {
    enabled: user?.role === "admin" || user?.role === "committee",
  });

  // Get top 3 critical competency gaps for admin
  const { data: criticalGaps, isLoading: gapsLoading } = trpc.trainingNeeds.getCriticalGaps.useQuery(
    undefined,
    { enabled: user?.role === "admin" }
  );

  const getRoleLabel = (role: string) => {
    const labels: Record<string, string> = {
      admin: "Administrador",
      instructor: "Instructor",
      student: "Estudiante",
      committee: "Comité de Atención",
    };
    return labels[role] || role;
  };

  const completedCourses = progress?.filter((p) => p.status === "completed").length || 0;
  const inProgressCourses = progress?.filter((p) => p.status === "in_progress").length || 0;
  const openCases = cases?.filter((c) => c.status === "open").length || 0;
  const investigatingCases = cases?.filter((c) => c.status === "investigating").length || 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Bienvenido, {user?.name || "Usuario"}
        </h1>
        <p className="text-muted-foreground mt-2">
          {getRoleLabel(user?.role || "student")} - Plataforma de Capacitación NOM-035 STPS 2018
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {user?.role === "student" && (
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
                <div className="text-2xl font-bold">{coursesLoading ? "..." : courses?.length || 0}</div>
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

        {(user?.role === "admin" || user?.role === "committee") && (
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
                <div className="text-2xl font-bold">{casesLoading ? "..." : cases?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Todos los registros</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cursos</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{coursesLoading ? "..." : courses?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Programas activos</p>
              </CardContent>
            </Card>
          </>
        )}

        {user?.role === "instructor" && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cursos</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{coursesLoading ? "..." : courses?.length || 0}</div>
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

      {/* Critical Competency Gaps Widget - Admin Only */}
      {user?.role === "admin" && (
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
          {user?.role === "student" && (
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
                        <CardDescription>Descarga manuales y protocolos</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            </>
          )}

          {(user?.role === "admin" || user?.role === "committee") && (
            <>
              <Link href="/cases">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-destructive/10 rounded-lg">
                        <AlertCircle className="h-6 w-6 text-destructive" />
                      </div>
                      <div>
                        <CardTitle>Gestión de Casos</CardTitle>
                        <CardDescription>Atención de casos psicosociales</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </Link>

              <Link href="/committee">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Users className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle>Comité de Atención</CardTitle>
                        <CardDescription>Administrar miembros del comité</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </Link>

              <Link href="/documents">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <FileText className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle>Ver Documentos</CardTitle>
                        <CardDescription>Formatos legales y actas del comité</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </Link>

              <Link href="/cases/assign">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Users className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle>Asignar Comité</CardTitle>
                        <CardDescription>Asignar casos a miembros del comité</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </Link>

              <Link href="/reports">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <TrendingUp className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle>Reportes</CardTitle>
                        <CardDescription>Métricas y estadísticas del sistema</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            </>
          )}

          {user?.role === "instructor" && (
            <>
              <Link href="/courses">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <BookOpen className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle>Gestionar Cursos</CardTitle>
                        <CardDescription>Crear y editar programas de capacitación</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </Link>

              <Link href="/job-positions">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <Users className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle>Análisis de Puestos</CardTitle>
                        <CardDescription>Evaluar riesgos psicosociales</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </Link>

              <Link href="/reports">
                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        <TrendingUp className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle>Reportes</CardTitle>
                        <CardDescription>Seguimiento y estadísticas</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                </Card>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Information Section */}
      <Card>
        <CardHeader>
          <CardTitle>Acerca de la NOM-035-STPS-2018</CardTitle>
          <CardDescription>
            Factores de riesgo psicosocial en el trabajo - Identificación, análisis y prevención
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            La Norma Oficial Mexicana NOM-035-STPS-2018 establece los elementos para identificar, analizar y
            prevenir los factores de riesgo psicosocial, así como para promover un entorno organizacional favorable
            en los centros de trabajo.
          </p>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/resources">Ver Recursos</Link>
            </Button>
            <Button asChild>
              <Link href="/courses">Comenzar Capacitación</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
