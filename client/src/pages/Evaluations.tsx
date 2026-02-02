import { useAuth } from "@/_core/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, Clock, CheckCircle2, XCircle } from "lucide-react";

export default function Evaluations() {
  const { user } = useAuth();

  // Datos de ejemplo - en producción vendrían de la API
  const evaluations = [
    {
      id: 1,
      title: "Evaluación: Fundamentos de la NOM-035",
      course: "Fundamentos de la NOM-035 STPS 2018",
      status: "pending",
      dueDate: "2026-02-10",
      questions: 20,
      duration: 30,
    },
    {
      id: 2,
      title: "Evaluación: Identificación de Mobbing",
      course: "Mobbing y Acoso Laboral",
      status: "completed",
      score: 85,
      completedDate: "2026-01-28",
      questions: 15,
      duration: 25,
    },
    {
      id: 3,
      title: "Evaluación: Síndrome de Burnout",
      course: "Prevención del Burnout",
      status: "in_progress",
      questions: 18,
      duration: 35,
      progress: 60,
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">Pendiente</Badge>;
      case "completed":
        return <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Completada</Badge>;
      case "in_progress":
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">En Progreso</Badge>;
      default:
        return null;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case "completed":
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case "in_progress":
        return <ClipboardCheck className="h-5 w-5 text-blue-600" />;
      default:
        return null;
    }
  };

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
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {evaluations.filter((e) => e.status === "pending").length}
            </div>
            <p className="text-xs text-muted-foreground">Evaluaciones por completar</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completadas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {evaluations.filter((e) => e.status === "completed").length}
            </div>
            <p className="text-xs text-muted-foreground">Evaluaciones finalizadas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promedio</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">85%</div>
            <p className="text-xs text-muted-foreground">Calificación promedio</p>
          </CardContent>
        </Card>
      </div>

      {/* Evaluations List */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Mis Evaluaciones</h2>
        {evaluations.map((evaluation) => (
          <Card key={evaluation.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-primary/10 rounded-lg mt-1">
                    {getStatusIcon(evaluation.status)}
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{evaluation.title}</CardTitle>
                    <CardDescription>{evaluation.course}</CardDescription>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                      <span>{evaluation.questions} preguntas</span>
                      <span>•</span>
                      <span>{evaluation.duration} minutos</span>
                      {evaluation.status === "pending" && evaluation.dueDate && (
                        <>
                          <span>•</span>
                          <span>Vence: {new Date(evaluation.dueDate).toLocaleDateString("es-MX")}</span>
                        </>
                      )}
                      {evaluation.status === "completed" && evaluation.completedDate && (
                        <>
                          <span>•</span>
                          <span>Completada: {new Date(evaluation.completedDate).toLocaleDateString("es-MX")}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  {getStatusBadge(evaluation.status)}
                  {evaluation.status === "completed" && evaluation.score !== undefined && (
                    <span className="text-2xl font-bold text-green-600">{evaluation.score}%</span>
                  )}
                  {evaluation.status === "in_progress" && evaluation.progress !== undefined && (
                    <span className="text-sm text-muted-foreground">{evaluation.progress}% completado</span>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                {evaluation.status === "pending" && (
                  <Button>Iniciar Evaluación</Button>
                )}
                {evaluation.status === "in_progress" && (
                  <Button>Continuar Evaluación</Button>
                )}
                {evaluation.status === "completed" && (
                  <>
                    <Button variant="outline">Ver Resultados</Button>
                    <Button variant="outline">Descargar Certificado</Button>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State */}
      {evaluations.length === 0 && (
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
  );
}
