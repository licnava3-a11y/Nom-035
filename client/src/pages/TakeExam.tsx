import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { LoadingButton } from '@/components/ui/loading-button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { useRoute, useLocation } from 'wouter';

export default function TakeExam() {
  const [, params] = useRoute('/exams/:id/take');
  const [, setLocation] = useLocation();
  const assessmentId = params?.id ? parseInt(params.id) : 0;

  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, { selectedOptionId?: number; textAnswer?: string }>>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Queries
  const { data: assessment, isLoading } = trpc.assessments.getById.useQuery({ id: assessmentId });

  // Mutations
  const startAttemptMutation = trpc.assessments.startAttempt.useMutation({
    onSuccess: (data) => {
      setAttemptId(data.attemptId);
      if (assessment?.timeLimit) {
        setTimeRemaining(assessment.timeLimit * 60); // Convertir minutos a segundos
      }
    },
  });

  const submitAnswersMutation = trpc.assessments.submitAnswers.useMutation({
    onSuccess: (data) => {
      setLocation(`/exams/${assessmentId}/results/${attemptId}`);
    },
  });

  // Timer effect
  useEffect(() => {
    if (timeRemaining === null || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  const handleStartExam = () => {
    // El servidor deriva el colaborador a partir de la sesión autenticada.
    startAttemptMutation.mutate({ assessmentId });
  };

  const handleAnswerChange = (questionId: number, value: { selectedOptionId?: number; textAnswer?: string }) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleSubmit = () => {
    if (!attemptId) return;

    setIsSubmitting(true);

    const answersArray = Object.entries(answers).map(([questionId, answer]) => ({
      questionId: parseInt(questionId),
      ...answer,
    }));

    submitAnswersMutation.mutate({
      attemptId,
      answers: answersArray,
    });
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgress = () => {
    if (!assessment?.questions) return 0;
    const answeredCount = Object.keys(answers).length;
    return (answeredCount / assessment.questions.length) * 100;
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <p>Cargando evaluación...</p>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="container py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Evaluación no encontrada</AlertDescription>
        </Alert>
      </div>
    );
  }

  // Vista de inicio
  if (!attemptId) {
    return (
      <div className="container max-w-3xl py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{assessment.title}</CardTitle>
            <CardDescription>{assessment.description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Número de preguntas:</span>
                <span className="font-medium">{assessment.questions?.length || 0}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Calificación mínima:</span>
                <span className="font-medium">{assessment.passingScore}%</span>
              </div>
              {assessment.timeLimit && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tiempo límite:</span>
                  <span className="font-medium">{assessment.timeLimit} minutos</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Intentos máximos:</span>
                <span className="font-medium">{assessment.maxAttempts || 'Ilimitados'}</span>
              </div>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Una vez que inicie el examen, debe completarlo. {assessment.timeLimit && 'El tiempo comenzará a correr automáticamente.'}
              </AlertDescription>
            </Alert>

            <LoadingButton className="w-full"
              size="lg"
              onClick={handleStartExam}
              loading={startAttemptMutation.isPending} loadingText="Iniciando..."
            >Iniciar Examen</LoadingButton>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Vista del examen
  const currentQuestion = assessment.questions?.[currentQuestionIndex];

  if (!currentQuestion) {
    return (
      <div className="container py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>No hay preguntas disponibles</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container max-w-4xl py-8">
      {/* Header con timer y progreso */}
      <div className="mb-6 space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">{assessment.title}</h1>
          {timeRemaining !== null && (
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              <span className={`text-lg font-mono ${timeRemaining < 60 ? 'text-red-500' : ''}`}>
                {formatTime(timeRemaining)}
              </span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Progreso</span>
            <span>
              {Object.keys(answers).length} de {assessment.questions.length} respondidas
            </span>
          </div>
          <Progress value={getProgress()} />
        </div>
      </div>

      {/* Pregunta actual */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle className="text-lg">
              Pregunta {currentQuestionIndex + 1} de {assessment.questions.length}
            </CardTitle>
            <span className="text-sm text-muted-foreground">{currentQuestion.points} puntos</span>
          </div>
          <CardDescription className="text-base text-foreground mt-4">
            {currentQuestion.questionText}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Opciones de respuesta */}
          {currentQuestion.questionType === 'multiple_choice' || currentQuestion.questionType === 'true_false' ? (
            <RadioGroup
              value={answers[currentQuestion.id]?.selectedOptionId?.toString() || ''}
              onValueChange={(value) =>
                handleAnswerChange(currentQuestion.id, { selectedOptionId: parseInt(value) })
              }
            >
              <div className="space-y-3">
                {currentQuestion.options?.map((option: any, index: number) => (
                  <div key={option.id} className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-accent">
                    <RadioGroupItem value={option.id.toString()} id={`option-${option.id}`} />
                    <Label htmlFor={`option-${option.id}`} className="flex-1 cursor-pointer">
                      {String.fromCharCode(65 + index)}. {option.optionText}
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          ) : (
            <div>
              <Label htmlFor="textAnswer">Su respuesta:</Label>
              <Textarea
                id="textAnswer"
                value={answers[currentQuestion.id]?.textAnswer || ''}
                onChange={(e) =>
                  handleAnswerChange(currentQuestion.id, { textAnswer: e.target.value })
                }
                placeholder="Escriba su respuesta aquí"
                rows={5}
                className="mt-2"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navegación */}
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={() => setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))}
          disabled={currentQuestionIndex === 0}
        >
          Anterior
        </Button>

        <div className="flex gap-2">
          {assessment.questions.map((_: any, index: number) => (
            <button
              key={index}
              onClick={() => setCurrentQuestionIndex(index)}
              className={`w-10 h-10 rounded-lg border ${
                index === currentQuestionIndex
                  ? 'bg-primary text-primary-foreground'
                  : answers[assessment.questions[index].id]
                  ? 'bg-green-100 border-green-500'
                  : 'bg-background'
              }`}
            >
              {index + 1}
            </button>
          ))}
        </div>

        {currentQuestionIndex < assessment.questions.length - 1 ? (
          <Button onClick={() => setCurrentQuestionIndex((prev) => prev + 1)}>
            Siguiente
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || submitAnswersMutation.isPending}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            {isSubmitting || submitAnswersMutation.isPending ? 'Enviando...' : 'Finalizar Examen'}
          </Button>
        )}
      </div>

      {/* Advertencia de preguntas sin responder */}
      {Object.keys(answers).length < assessment.questions.length && (
        <Alert className="mt-6">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Tiene {assessment.questions.length - Object.keys(answers).length} pregunta(s) sin responder
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
