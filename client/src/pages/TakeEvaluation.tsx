import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useRoute, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock, AlertTriangle, Trophy } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { QuizComponent } from "@/components/QuizComponent";

export default function TakeEvaluation() {
  const { user } = useAuth();
  const [, params] = useRoute("/evaluations/:id/take");
  const [, setLocation] = useLocation();
  const evaluationId = params?.id ? parseInt(params.id) : 0;

  const [quizStarted, setQuizStarted] = useState(false);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [finalScore, setFinalScore] = useState<number>(0);
  const [finalPassed, setFinalPassed] = useState<boolean>(false);

  const { data: evaluation, isLoading } = trpc.evaluations.getById.useQuery(
    { id: evaluationId },
    { enabled: evaluationId > 0 }
  );

  const { data: attempts } = trpc.evaluations.getAttempts.useQuery(
    { evaluationId },
    { enabled: evaluationId > 0 }
  );

  const handleStartQuiz = () => {
    setQuizStarted(true);
  };

  const handleQuizComplete = (score: number, passed: boolean) => {
    setFinalScore(score);
    setFinalPassed(passed);
    setQuizCompleted(true);
    setQuizStarted(false);
  };

  const handleRetry = () => {
    setQuizCompleted(false);
    setQuizStarted(true);
  };

  const handleBackToEvaluations = () => {
    setLocation("/evaluations");
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Cargando evaluación...</h1>
          </div>
        </div>
      </div>
    );
  }

  if (!evaluation) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Evaluación no encontrada</h3>
              <p className="text-sm text-muted-foreground mb-4">
                La evaluación que buscas no existe o no tienes acceso a ella.
              </p>
              <Button onClick={handleBackToEvaluations}>Volver a Evaluaciones</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const attemptsUsed = attempts?.length || 0;
  const attemptsRemaining = (evaluation.maxAttempts || 0) - attemptsUsed;
  const canTakeQuiz = attemptsRemaining > 0 || !evaluation.maxAttempts;

  // Quiz completed screen
  if (quizCompleted) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Evaluación Completada</h1>
            <p className="text-muted-foreground mt-2">{evaluation.title}</p>
          </div>
        </div>

        <Card className="border-2">
          <CardHeader className="text-center pb-2">
            {finalPassed ? (
              <div className="flex flex-col items-center gap-4">
                <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
                  <Trophy className="h-10 w-10 text-green-600" />
                </div>
                <div>
                  <CardTitle className="text-2xl text-green-600">¡Felicidades! Has aprobado</CardTitle>
                  <CardDescription className="mt-2">
                    Has completado exitosamente la evaluación
                  </CardDescription>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4">
                <div className="h-20 w-20 rounded-full bg-red-100 flex items-center justify-center">
                  <XCircle className="h-10 w-10 text-red-600" />
                </div>
                <div>
                  <CardTitle className="text-2xl text-red-600">No has aprobado</CardTitle>
                  <CardDescription className="mt-2">
                    Necesitas mejorar tu puntuación para aprobar
                  </CardDescription>
                </div>
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {/* Score Display */}
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Tu Puntuación</p>
                <p className="text-3xl font-bold">{finalScore.toFixed(1)}%</p>
              </div>
              <div className="p-4 border rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Puntuación Mínima</p>
                <p className="text-3xl font-bold">{evaluation.passingScore}%</p>
              </div>
            </div>

            {/* Attempts Info */}
            <Alert>
              <AlertDescription>
                <div className="flex items-center justify-between">
                  <span>Intentos utilizados: {attemptsUsed} de {evaluation.maxAttempts || "∞"}</span>
                  {attemptsRemaining > 0 && (
                    <Badge variant="outline">{attemptsRemaining} intentos restantes</Badge>
                  )}
                </div>
              </AlertDescription>
            </Alert>

            {/* Action Buttons */}
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={handleBackToEvaluations}>
                Volver a Evaluaciones
              </Button>
              {!finalPassed && canTakeQuiz && (
                <Button onClick={handleRetry}>Intentar de Nuevo</Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Previous Attempts */}
        {attempts && attempts.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Historial de Intentos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {attempts.map((attempt, index) => (
                  <div key={attempt.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">Intento {attempt.attemptNumber}</Badge>
                      <span className="text-sm text-muted-foreground">
                        {new Date(attempt.startedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      {attempt.score && (
                        <span className="font-semibold">{Number(attempt.score).toFixed(1)}%</span>
                      )}
                      {attempt.passed ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600" />
                      )}
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

  // Quiz in progress
  if (quizStarted) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">{evaluation.title}</h1>
            <p className="text-muted-foreground mt-2">Responde todas las preguntas cuidadosamente</p>
          </div>
        </div>

        <QuizComponent
          evaluationId={evaluationId}
          questions={evaluation.questions || []}
          timeLimit={evaluation.timeLimit || undefined}
          onComplete={handleQuizComplete}
        />
      </div>
    );
  }

  // Quiz start screen
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{evaluation.title}</h1>
          <p className="text-muted-foreground mt-2">{evaluation.description}</p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Evaluation Info */}
        <Card>
          <CardHeader>
            <CardTitle>Información de la Evaluación</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Preguntas</span>
              <span className="font-semibold">{evaluation.questions?.length || 0}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Puntuación mínima</span>
              <span className="font-semibold">{evaluation.passingScore}%</span>
            </div>
            {evaluation.timeLimit && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Tiempo límite</span>
                <span className="font-semibold flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {evaluation.timeLimit} minutos
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Intentos máximos</span>
              <span className="font-semibold">{evaluation.maxAttempts || "Ilimitados"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Intentos utilizados</span>
              <span className="font-semibold">{attemptsUsed}</span>
            </div>
            {attemptsRemaining > 0 && (
              <Alert>
                <AlertDescription>
                  Tienes {attemptsRemaining} intento(s) restante(s)
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Instrucciones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground">
              <li>Lee cada pregunta cuidadosamente antes de responder</li>
              <li>Puedes navegar entre preguntas usando los botones de navegación</li>
              <li>Recibirás retroalimentación inmediata después de cada respuesta</li>
              {evaluation.timeLimit && (
                <li>El tiempo comenzará a correr una vez que inicies la evaluación</li>
              )}
              <li>Asegúrate de completar todas las preguntas antes de finalizar</li>
              <li>Una vez finalizada, no podrás modificar tus respuestas</li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Start Button */}
      <Card>
        <CardContent className="py-8">
          <div className="text-center space-y-4">
            {canTakeQuiz ? (
              <>
                <p className="text-lg font-semibold">¿Estás listo para comenzar?</p>
                <Button size="lg" onClick={handleStartQuiz}>
                  Iniciar Evaluación
                </Button>
              </>
            ) : (
              <>
                <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-lg font-semibold">Has agotado todos tus intentos</p>
                <p className="text-sm text-muted-foreground">
                  Ya no puedes realizar más intentos en esta evaluación
                </p>
                <Button variant="outline" onClick={handleBackToEvaluations}>
                  Volver a Evaluaciones
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
