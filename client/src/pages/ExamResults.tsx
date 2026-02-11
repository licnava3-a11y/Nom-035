import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, AlertCircle, Download, Home } from 'lucide-react';
import { useRoute, useLocation } from 'wouter';

export default function ExamResults() {
  const [, params] = useRoute('/exams/:assessmentId/results/:attemptId');
  const [, setLocation] = useLocation();
  const attemptId = params?.attemptId ? parseInt(params.attemptId) : 0;

  // Queries
  const { data: results, isLoading } = trpc.assessments.getAttemptResults.useQuery({ attemptId });

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins} min ${secs} seg`;
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <p>Cargando resultados...</p>
      </div>
    );
  }

  if (!results) {
    return (
      <div className="container py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Resultados no encontrados</AlertDescription>
        </Alert>
      </div>
    );
  }

  const isPassed = results.passed;
  const correctAnswers = results.answers?.filter((a: any) => a.isCorrect).length || 0;
  const totalQuestions = results.answers?.length || 0;

  return (
    <div className="container max-w-4xl py-8">
      {/* Resumen de resultados */}
      <Card className={`mb-6 ${isPassed ? 'border-green-500' : 'border-red-500'}`}>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {isPassed ? (
              <CheckCircle className="h-16 w-16 text-green-500" />
            ) : (
              <XCircle className="h-16 w-16 text-red-500" />
            )}
          </div>
          <CardTitle className="text-3xl">
            {isPassed ? '¡Felicidades! Has aprobado' : 'No has aprobado'}
          </CardTitle>
          <CardDescription className="text-lg">
            Calificación: {results.score}%
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold">{results.score}%</p>
              <p className="text-sm text-muted-foreground">Calificación</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{correctAnswers}</p>
              <p className="text-sm text-muted-foreground">Correctas</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{totalQuestions - correctAnswers}</p>
              <p className="text-sm text-muted-foreground">Incorrectas</p>
            </div>
            <div>
              <p className="text-2xl font-bold">{results.timeSpent ? formatTime(results.timeSpent) : 'N/A'}</p>
              <p className="text-sm text-muted-foreground">Tiempo</p>
            </div>
          </div>

          <div className="flex gap-4 mt-6 justify-center">
            <Button variant="outline" onClick={() => setLocation('/dashboard')}>
              <Home className="mr-2 h-4 w-4" />
              Ir al inicio
            </Button>
            <Button variant="outline" onClick={() => window.print()}>
              <Download className="mr-2 h-4 w-4" />
              Descargar resultados
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Detalle de respuestas */}
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Detalle de respuestas</h2>

        {results.answers?.map((answer: any, index: number) => (
          <Card key={index} className={answer.isCorrect ? 'border-green-200' : 'border-red-200'}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge variant="outline">Pregunta {index + 1}</Badge>
                    <Badge>{answer.points} puntos</Badge>
                    {answer.isCorrect ? (
                      <Badge className="bg-green-500">
                        <CheckCircle className="mr-1 h-3 w-3" />
                        Correcta
                      </Badge>
                    ) : (
                      <Badge variant="destructive">
                        <XCircle className="mr-1 h-3 w-3" />
                        Incorrecta
                      </Badge>
                    )}
                  </div>
                  <CardTitle className="text-lg">{answer.questionText}</CardTitle>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Puntos obtenidos</p>
                  <p className="text-lg font-bold">
                    {answer.pointsEarned || 0} / {answer.points}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {answer.questionType === 'short_answer' ? (
                <div className="space-y-2">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Tu respuesta:</p>
                    <p className="mt-1 p-3 bg-muted rounded-lg">{answer.textAnswer || 'Sin respuesta'}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Tu respuesta:</p>
                  <div className="space-y-1">
                    {/* Aquí se mostrarían las opciones con indicadores de correcta/incorrecta */}
                    <p className="p-2 rounded-lg bg-muted">
                      {answer.selectedOptionId ? `Opción seleccionada: ${answer.selectedOptionId}` : 'Sin respuesta'}
                    </p>
                  </div>
                </div>
              )}

              {answer.explanation && (
                <Alert className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Explicación:</strong> {answer.explanation}
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Mensaje final */}
      <Card className="mt-6">
        <CardContent className="py-6 text-center">
          {isPassed ? (
            <div>
              <p className="text-lg mb-4">
                Has completado exitosamente esta evaluación. Tu certificado estará disponible próximamente.
              </p>
              <Button onClick={() => setLocation('/dashboard')}>
                Volver al inicio
              </Button>
            </div>
          ) : (
            <div>
              <p className="text-lg mb-4">
                No has alcanzado la calificación mínima requerida. Te recomendamos revisar el material del curso y volver a intentarlo.
              </p>
              <Button onClick={() => setLocation('/dashboard')}>
                Volver al inicio
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
