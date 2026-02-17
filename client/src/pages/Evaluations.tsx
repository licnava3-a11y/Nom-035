import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, Clock, CheckCircle2, Play, FileQuestion } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Breadcrumb } from "@/components/Breadcrumb";

export default function Evaluations() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { data: evaluations, isLoading } = trpc.evaluations.list.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-6">
      <Breadcrumb items={[
        {
                label: "Capacitación y Desarrollo",
                href: "/"
        },
        {
                label: "Evaluaciones"
        }
]} />

        <div>
          <h1 className="text-3xl font-bold tracking-tight">Evaluaciones</h1>
          <p className="text-muted-foreground mt-2">Cargando evaluaciones...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Evaluaciones</h1>
        <p className="text-muted-foreground mt-2">
          Gestiona y completa tus evaluaciones de capacitación
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <FileQuestion className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{evaluations?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Evaluaciones disponibles</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activas</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{evaluations?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Evaluaciones activas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completadas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">Evaluaciones finalizadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Evaluations List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Evaluaciones Disponibles</h2>
        {evaluations && evaluations.length > 0 ? (
          evaluations.map((evaluation) => (
            <Card key={evaluation.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className="p-2 bg-primary/10 rounded-lg mt-1">
                      <FileQuestion className="h-5 w-5 text-primary" />
                    </div>
                    <div className="space-y-1">
                      <CardTitle className="text-lg">{evaluation.title}</CardTitle>
                      <CardDescription>{evaluation.description}</CardDescription>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                        <span>Puntaje mínimo: {evaluation.passingScore}%</span>
                        {evaluation.timeLimit && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {evaluation.timeLimit} minutos
                            </span>
                          </>
                        )}
                        {evaluation.maxAttempts && (
                          <>
                            <span>•</span>
                            <span>Máx. {evaluation.maxAttempts} intentos</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                    Disponible
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Button onClick={() => setLocation(`/evaluations/${evaluation.id}/take`)}>
                    <Play className="h-4 w-4 mr-2" />
                    Tomar Evaluación
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ClipboardCheck className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay evaluaciones disponibles</h3>
              <p className="text-sm text-muted-foreground text-center max-w-md">
                Las evaluaciones aparecerán aquí cuando estén disponibles en tus cursos asignados.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
