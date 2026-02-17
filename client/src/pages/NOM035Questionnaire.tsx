import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { AlertCircle, ChevronLeft, ChevronRight, Save } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const LIKERT_OPTIONS = [
  { value: "0", label: "Siempre" },
  { value: "1", label: "Casi siempre" },
  { value: "2", label: "Algunas veces" },
  { value: "3", label: "Casi nunca" },
  { value: "4", label: "Nunca" },
];

export default function NOM035Questionnaire() {
  const [, setLocation] = useLocation();
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState<Record<number, number>>({});
  const [surveyPeriodId, setSurveyPeriodId] = useState<number | null>(null);

  // Obtener período activo
  const { data: activePeriod, isLoading: loadingPeriod } = trpc.nom035.getActivePeriod.useQuery();

  // Obtener todas las preguntas
  const { data: questions, isLoading: loadingQuestions } = trpc.nom035.getQuestions.useQuery();

  // Obtener progreso guardado
  const { data: progress } = trpc.nom035.getProgress.useQuery(
    { surveyPeriodId: surveyPeriodId! },
    { enabled: !!surveyPeriodId }
  );

  // Obtener respuestas previas
  const { data: savedResponses } = trpc.nom035.getResponses.useQuery(
    { surveyPeriodId: surveyPeriodId! },
    { enabled: !!surveyPeriodId }
  );

  // Guardar respuesta
  const saveResponseMutation = trpc.nom035.saveResponse.useMutation();

  // Calcular resultados
  const calculateResultsMutation = trpc.nom035.calculateResults.useMutation({
    onSuccess: () => {
      setLocation("/nom035/results");
    },
  });

  // Cargar período activo
  useEffect(() => {
    if (activePeriod) {
      setSurveyPeriodId(activePeriod.id);
    }
  }, [activePeriod]);

  // Cargar respuestas previas desde el servidor
  useEffect(() => {
    if (savedResponses && savedResponses.length > 0) {
      const responsesMap: Record<number, number> = {};
      savedResponses.forEach((r: any) => {
        responsesMap[r.questionId] = r.response;
      });
      setResponses(responsesMap);
    }
  }, [savedResponses]);

  // Cargar respuestas desde localStorage como respaldo
  useEffect(() => {
    const saved = localStorage.getItem("nom035_responses");
    if (saved && Object.keys(responses).length === 0) {
      setResponses(JSON.parse(saved));
    }
  }, []);

  // Guardar en localStorage automáticamente
  useEffect(() => {
    if (Object.keys(responses).length > 0) {
      localStorage.setItem("nom035_responses", JSON.stringify(responses));
    }
  }, [responses]);

  if (loadingPeriod || loadingQuestions) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardContent className="py-8">
            <p className="text-center text-muted-foreground">Cargando cuestionario...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!activePeriod) {
    return (
      <div className="container mx-auto py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No hay un período de evaluación activo. Por favor contacte al administrador.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="container mx-auto py-8">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No se pudieron cargar las preguntas del cuestionario.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Agrupar preguntas por categoría
  const categories = Array.from(new Set(questions.map((q: any) => q.category)));
  const questionsPerCategory = 10; // Mostrar 10 preguntas por paso
  const totalSteps = Math.ceil(questions.length / questionsPerCategory);
  const currentQuestions = questions.slice(
    currentStep * questionsPerCategory,
    (currentStep + 1) * questionsPerCategory
  );

  const answeredCount = Object.keys(responses).length;
  const progressPercentage = Math.round((answeredCount / questions.length) * 100);

  const handleResponseChange = async (questionId: number, value: string) => {
    const numValue = parseInt(value);
    setResponses((prev) => ({ ...prev, [questionId]: numValue }));

    // Guardar automáticamente en el servidor
    if (surveyPeriodId) {
      try {
        await saveResponseMutation.mutateAsync({
          surveyPeriodId,
          questionId,
          response: numValue,
        });
      } catch (error) {
        console.error("Error guardando respuesta:", error);
      }
    }
  };

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleFinish = async () => {
    if (answeredCount < questions.length) {
      alert("Por favor responde todas las preguntas antes de finalizar.");
      return;
    }

    if (surveyPeriodId) {
      await calculateResultsMutation.mutateAsync({ surveyPeriodId });
    }
  };

  const currentCategory = currentQuestions[0]?.category || "";

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Cuestionario NOM-035-STPS-2018</CardTitle>
          <CardDescription>
            Identificación y análisis de los factores de riesgo psicosocial
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Barra de progreso */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                Progreso: {answeredCount} de {questions.length} preguntas
              </span>
              <span className="font-medium">{progressPercentage}%</span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>

          {/* Indicador de paso */}
          <div className="flex justify-between items-center py-4 border-y">
            <div>
              <p className="text-sm text-muted-foreground">
                Paso {currentStep + 1} de {totalSteps}
              </p>
              <p className="font-medium">{currentCategory}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                localStorage.setItem("nom035_responses", JSON.stringify(responses));
                alert("Progreso guardado localmente");
              }}
            >
              <Save className="h-4 w-4 mr-2" />
              Guardar progreso
            </Button>
          </div>

          {/* Preguntas */}
          <div className="space-y-8">
            {currentQuestions.map((question: any) => (
              <div key={question.id} className="space-y-4 p-4 border rounded-lg">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground">
                    Pregunta {question.questionNumber}
                  </p>
                  <p className="font-medium">{question.questionText}</p>
                  {question.dimension && (
                    <p className="text-xs text-muted-foreground italic">
                      {question.domain} • {question.dimension}
                    </p>
                  )}
                </div>

                <RadioGroup
                  value={responses[question.id]?.toString() || ""}
                  onValueChange={(value) => handleResponseChange(question.id, value)}
                >
                  <div className="space-y-2">
                    {LIKERT_OPTIONS.map((option) => (
                      <div key={option.value} className="flex items-center space-x-2">
                        <RadioGroupItem value={option.value} id={`q${question.id}-${option.value}`} />
                        <Label
                          htmlFor={`q${question.id}-${option.value}`}
                          className="cursor-pointer flex-1"
                        >
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              </div>
            ))}
          </div>

          {/* Navegación */}
          <div className="flex justify-between pt-6 border-t">
            <Button
              variant="outline"
              onClick={handlePrevious}
              disabled={currentStep === 0}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Anterior
            </Button>

            {currentStep < totalSteps - 1 ? (
              <Button onClick={handleNext}>
                Siguiente
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button
                onClick={handleFinish}
                disabled={answeredCount < questions.length || calculateResultsMutation.isPending}
              >
                {calculateResultsMutation.isPending ? "Calculando..." : "Finalizar y ver resultados"}
              </Button>
            )}
          </div>

          {/* Advertencia si faltan respuestas */}
          {currentStep === totalSteps - 1 && answeredCount < questions.length && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Faltan {questions.length - answeredCount} preguntas por responder. 
                Por favor completa todas las preguntas antes de finalizar.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
