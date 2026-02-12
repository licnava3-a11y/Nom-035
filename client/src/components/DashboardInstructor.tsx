import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';
import { 
  Calendar, 
  BookOpen, 
  CheckCircle, 
  Clock, 
  Star,
  ArrowRight,
  Award
} from 'lucide-react';

export default function DashboardInstructor() {
  const { data: stats, isLoading } = trpc.training.getInstructorStats.useQuery();
  const { data: upcomingCourses } = trpc.training.getInstructorUpcomingCourses.useQuery();
  const { data: pendingConfirmations } = trpc.training.getInstructorPendingConfirmations.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader className="pb-2">
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-1/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Estadísticas Principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cursos Completados</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.completedCourses || 0}</div>
            <p className="text-xs text-muted-foreground">Este año</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cursos Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingCourses || 0}</div>
            <p className="text-xs text-muted-foreground">Por impartir</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Confirmaciones Pendientes</CardTitle>
            <Calendar className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.pendingConfirmations || 0}</div>
            <p className="text-xs text-muted-foreground">Requieren acción</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Calificación Promedio</CardTitle>
            <Star className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.averageRating?.toFixed(1) || 'N/A'}</div>
            <p className="text-xs text-muted-foreground">De 5.0</p>
          </CardContent>
        </Card>
      </div>

      {/* Cursos Próximos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Cursos Próximos a Impartir
          </CardTitle>
          <CardDescription>
            Cursos confirmados programados para las próximas semanas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {upcomingCourses && upcomingCourses.length > 0 ? (
            <div className="space-y-4">
              {upcomingCourses.slice(0, 5).map((course: any) => (
                <div key={course.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div className="flex-1">
                    <p className="font-medium">{course.courseName}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(course.startDate).toLocaleDateString('es-MX', { 
                        weekday: 'long', 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {course.participants || 0} participantes • {course.duration || 'N/A'} horas
                    </p>
                  </div>
                  <Link href={`/training/course/${course.id}`}>
                    <Button variant="ghost" size="sm">
                      Ver Detalles
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No tienes cursos programados próximamente
            </p>
          )}
        </CardContent>
      </Card>

      {/* Confirmaciones Pendientes */}
      {pendingConfirmations && pendingConfirmations.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-900">
              <Clock className="h-5 w-5" />
              Confirmaciones Pendientes
            </CardTitle>
            <CardDescription className="text-orange-700">
              Estos cursos requieren tu confirmación de disponibilidad
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingConfirmations.map((course: any) => (
                <div key={course.id} className="flex items-center justify-between border-b border-orange-200 pb-3 last:border-0">
                  <div className="flex-1">
                    <p className="font-medium text-orange-900">{course.courseName}</p>
                    <p className="text-sm text-orange-700">
                      Propuesto para: {new Date(course.proposedDate).toLocaleDateString('es-MX')}
                    </p>
                  </div>
                  <Link href={`/training/confirm/${course.id}`}>
                    <Button size="sm" className="bg-orange-600 hover:bg-orange-700">
                      Confirmar Disponibilidad
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Evaluaciones Recientes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Evaluaciones Recientes
          </CardTitle>
          <CardDescription>
            Retroalimentación de participantes en tus últimos cursos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {stats?.recentEvaluations && stats.recentEvaluations.length > 0 ? (
              stats.recentEvaluations.map((evaluation: any, index: number) => (
                <div key={index} className="flex items-start gap-3 border-b pb-3 last:border-0">
                  <div className="flex items-center gap-1 mt-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="font-semibold">{evaluation.rating}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{evaluation.courseName}</p>
                    <p className="text-xs text-muted-foreground">{evaluation.comment}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(evaluation.date).toLocaleDateString('es-MX')}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-4">
                Aún no tienes evaluaciones
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Accesos Rápidos */}
      <Card>
        <CardHeader>
          <CardTitle>Accesos Rápidos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2">
            <Link href="/training/my-courses">
              <Button variant="outline" className="w-full justify-start">
                <BookOpen className="h-4 w-4 mr-2" />
                Mis Cursos
              </Button>
            </Link>
            <Link href="/training/calendar">
              <Button variant="outline" className="w-full justify-start">
                <Calendar className="h-4 w-4 mr-2" />
                Calendario
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
