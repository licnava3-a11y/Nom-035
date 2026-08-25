import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle2,
  XCircle,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

interface Question {
  id: number;
  questionType: "multiple_choice" | "true_false" | "case_analysis";
  questionText: string;
  orderIndex: number;
  points: number;
  options?: Array<{
    id: number;
    optionText: string;
    isCorrect: boolean;
    feedback?: string;
  }>;
}

interface QuizComponentProps {
  evaluationId: number;
  questions: Question[];
  timeLimit?: number; // in minutes
  onComplete: (score: number, passed: boolean) => void;
}

export function QuizComponent({
  evaluationId,
  questions,
  timeLimit,
  onComplete,
}: QuizComponentProps) {
  const [, setLocation] = useLocation();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<
    Record<number, number>
  >({});
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(
    timeLimit ? timeLimit * 60 : null
  );
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedback, setFeedback] = useState<{
    isCorrect: boolean;
    points: number;
  } | null>(null);

  const startAttemptMutation = trpc.evaluations.startAttempt.useMutation();
  const submitAnswerMutation = trpc.evaluations.submitAnswer.useMutation();
  const completeAttemptMutation =
    trpc.evaluations.completeAttempt.useMutation();

  useEffect(() => {
    // Start attempt when component mounts
    startAttemptMutation.mutate(
      { evaluationId },
      {
        onSuccess: data => {
          setAttemptId(data.attemptId);
        },
      }
    );
  }, [evaluationId]);

  useEffect(() => {
    if (timeRemaining === null) return;

    if (timeRemaining <= 0) {
      handleCompleteQuiz();
      return;
    }

    const timer = setInterval(() => {
      setTimeRemaining(prev => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearInterval(timer);
  }, [timeRemaining]);

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleAnswerSelect = (questionId: number, optionId: number) => {
    setSelectedAnswers(prev => ({ ...prev, [questionId]: optionId }));
    setShowFeedback(false);
  };

  const handleSubmitAnswer = async () => {
    if (!attemptId || !currentQuestion) return;

    const selectedOptionId = selectedAnswers[currentQuestion.id];
    if (!selectedOptionId) return;

    submitAnswerMutation.mutate(
      {
        attemptId,
        questionId: currentQuestion.id,
        selectedOptionId,
      },
      {
        onSuccess: data => {
          setFeedback({ isCorrect: data.isCorrect, points: data.pointsEarned });
          setShowFeedback(true);
        },
      }
    );
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setShowFeedback(false);
      setFeedback(null);
    } else {
      handleCompleteQuiz();
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
      setShowFeedback(false);
      setFeedback(null);
    }
  };

  const handleCompleteQuiz = async () => {
    if (!attemptId) return;

    completeAttemptMutation.mutate(
      { attemptId },
      {
        onSuccess: data => {
          onComplete(data.score, data.passed);
        },
      }
    );
  };

  if (!currentQuestion) {
    return (
      <Card>
        <CardContent className="py-12">
          <p className="text-center text-muted-foreground">
            Cargando evaluación...
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with progress and timer */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">
              Pregunta {currentQuestionIndex + 1} de {questions.length}
            </p>
            <Progress value={progress} className="w-64" />
          </div>
          {timeRemaining !== null && (
            <div className="flex items-center gap-2 text-lg font-semibold">
              <Clock className="h-5 w-5" />
              <span className={timeRemaining < 300 ? "text-destructive" : ""}>
                {formatTime(timeRemaining)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Question Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            {currentQuestion.questionText}
          </CardTitle>
          <CardDescription>
            {currentQuestion.questionType === "multiple_choice" &&
              "Selecciona la respuesta correcta"}
            {currentQuestion.questionType === "true_false" &&
              "Verdadero o Falso"}
            {currentQuestion.questionType === "case_analysis" &&
              "Análisis de caso"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Answer Options */}
          <RadioGroup
            value={selectedAnswers[currentQuestion.id]?.toString()}
            onValueChange={value =>
              handleAnswerSelect(currentQuestion.id, parseInt(value))
            }
            disabled={showFeedback}
          >
            {currentQuestion.options?.map((option: any) => (
              <div
                key={option.id}
                className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-accent"
              >
                <RadioGroupItem
                  value={option.id.toString()}
                  id={`option-${option.id}`}
                />
                <Label
                  htmlFor={`option-${option.id}`}
                  className="flex-1 cursor-pointer"
                >
                  {option.optionText}
                </Label>
              </div>
            ))}
          </RadioGroup>

          {/* Feedback */}
          {showFeedback && feedback && (
            <Alert variant={feedback.isCorrect ? "default" : "destructive"}>
              <div className="flex items-start gap-3">
                {feedback.isCorrect ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 mt-0.5" />
                )}
                <div className="flex-1">
                  <AlertDescription>
                    {feedback.isCorrect ? (
                      <span className="font-semibold text-green-600">
                        ¡Correcto!
                      </span>
                    ) : (
                      <span className="font-semibold">Incorrecto</span>
                    )}
                    <p className="mt-1">
                      {feedback.isCorrect
                        ? `Has ganado ${feedback.points} punto(s).`
                        : "Revisa la respuesta correcta y continúa."}
                    </p>
                  </AlertDescription>
                </div>
              </div>
            </Alert>
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePreviousQuestion}
            disabled={currentQuestionIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Anterior
          </Button>

          <div className="flex gap-2">
            {!showFeedback ? (
              <Button
                onClick={handleSubmitAnswer}
                disabled={
                  !selectedAnswers[currentQuestion.id] ||
                  submitAnswerMutation.isPending
                }
              >
                Enviar Respuesta
              </Button>
            ) : currentQuestionIndex < questions.length - 1 ? (
              <Button onClick={handleNextQuestion}>
                Siguiente
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleCompleteQuiz}
                disabled={completeAttemptMutation.isPending}
              >
                Finalizar Evaluación
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>

      {/* Question Navigator */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Navegación de Preguntas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {questions.map((q, index) => (
              <Button
                key={q.id}
                variant={index === currentQuestionIndex ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setCurrentQuestionIndex(index);
                  setShowFeedback(false);
                  setFeedback(null);
                }}
                className={selectedAnswers[q.id] ? "border-green-500" : ""}
              >
                {index + 1}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
