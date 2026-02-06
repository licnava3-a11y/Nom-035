import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useDebounce } from "@/hooks/useDebounce";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, Loader2, Shield, FileText, Building2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

interface SurveyFormWithTokenProps {
  token: string;
  surveyType: string;
  periodId: number;
  employeeId: number;
}

export default function SurveyFormWithToken({ 
  token, 
  surveyType, 
  periodId 
}: SurveyFormWithTokenProps) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSavedAnswer, setLastSavedAnswer] = useState<{ questionId: number; value: string } | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  
  // Debounce de respuestas para auto-guardado
  const debouncedAnswers = useDebounce(answers, 1000);

  // Obtener surveyId basado en surveyType
  const getSurveyId = (type: string): number => {
    switch (type) {
      case "guia_i":
        return 1;
      case "guia_ii":
        return 2;
      case "guia_iii":
        return 3;
      default:
        return 1;
    }
  };

  const surveyId = getSurveyId(surveyType);

  // Obtener preguntas de la encuesta
  const { data: questions, isLoading } = (trpc as any).surveys.getQuestions.useQuery(surveyId);
  
  const submitSurveyWithToken = trpc.surveyTokensAdvanced.submitSurveyResponse.useMutation({
    onSuccess: (data: any) => {
      toast.success("¡Encuesta completada exitosamente!");
      
      // Si hay una siguiente encuesta, recargar la página para mostrarla
      if (data.nextSurvey) {
        toast.info(`Ahora procederás a completar ${getSurveyDisplayName(data.nextSurvey)}`);
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        // Mostrar mensaje de finalización
        toast.success("Has completado todas las encuestas requeridas. ¡Gracias por tu participación!");
      }
    },
    onError: (error: any) => {
      toast.error(`Error: ${error.message}`);
      setIsSubmitting(false);
    },
  });

  // Mutation para auto-guardado (opcional, por ahora no implementado en backend)
  // const savePartialMutation = (trpc as any).surveys.savePartialResponse.useMutation({
  //   onSuccess: () => {
  //     setSaveStatus('saved');
  //     setTimeout(() => setSaveStatus('idle'), 2000);
  //   },
  //   onError: () => {
  //     setSaveStatus('error');
  //     setTimeout(() => setSaveStatus('idle'), 3000);
  //   },
  // });

  // Auto-guardar cuando cambian las respuestas (con debounce)
  // useEffect(() => {
  //   if (!lastSavedAnswer) return;
  //   
  //   setSaveStatus('saving');
  //   savePartialMutation.mutate({
  //     surveyId,
  //     questionId: lastSavedAnswer.questionId,
  //     answerValue: lastSavedAnswer.value,
  //   });
  // }, [debouncedAnswers]);

  const handleAnswerChange = (questionId: number, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
    setLastSavedAnswer({ questionId, value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!questions || Object.keys(answers).length < questions.length) {
      toast.error("Por favor responde todas las preguntas antes de continuar.");
      return;
    }

    setIsSubmitting(true);
    
    // Convertir respuestas a formato esperado
    const validQuestions = Array.isArray(questions) ? questions : [];
    const formattedAnswers = validQuestions.map((q: any) => ({
      questionId: q.id,
      answerValue: answers[q.id],
    }));

    submitSurveyWithToken.mutate({
      token,
      surveyType,
      periodId,
      answers: formattedAnswers,
    });
  };

  const getIcon = () => {
    switch (surveyType) {
      case 'guia_i':
        return <Shield className="h-6 w-6 text-blue-600" />;
      case 'guia_ii':
        return <Building2 className="h-6 w-6 text-green-600" />;
      default:
        return <FileText className="h-6 w-6 text-purple-600" />;
    }
  };

  const getIconBg = () => {
    switch (surveyType) {
      case 'guia_i':
        return 'bg-blue-100';
      case 'guia_ii':
        return 'bg-green-100';
      default:
        return 'bg-purple-100';
    }
  };

  const getSurveyTitle = () => {
    switch (surveyType) {
      case 'guia_i':
        return "Guía de Referencia I";
      case 'guia_ii':
        return "Guía de Referencia II";
      case 'guia_iii':
        return "Guía de Referencia III";
      default:
        return "Encuesta NOM-035";
    }
  };

  const getSurveyDescription = () => {
    switch (surveyType) {
      case 'guia_i':
        return "Cuestionario para identificar a los trabajadores que fueron sujetos a acontecimientos traumáticos severos";
      case 'guia_ii':
        return "Cuestionario para identificar y analizar los factores de riesgo psicosocial";
      case 'guia_iii':
        return "Cuestionario para identificar y analizar los factores de riesgo psicosocial y evaluar el entorno organizacional";
      default:
        return "Encuesta NOM-035 STPS";
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Cargando cuestionario...</p>
        </div>
      </div>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="container mx-auto py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>
            No se pudieron cargar las preguntas del cuestionario. Por favor intenta nuevamente.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // En este punto questions está garantizado que existe y tiene elementos
  const progress = (Object.keys(answers).length / questions.length) * 100;

  return (
    <div className="container mx-auto py-8 max-w-5xl">
      <Card>
        <CardHeader className="space-y-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 ${getIconBg()} rounded-lg`}>
              {getIcon()}
            </div>
            <div>
              <CardTitle className="text-2xl">{getSurveyTitle()}</CardTitle>
              <CardDescription>{getSurveyDescription()}</CardDescription>
            </div>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Instrucciones</AlertTitle>
            <AlertDescription>
              Las siguientes preguntas están relacionadas con tu experiencia laboral. 
              Por favor responde con honestidad. La información es confidencial y será 
              utilizada únicamente para cumplir con la NOM-035-STPS-2018.
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-4">
                <span className="text-muted-foreground">
                  Progreso: {Object.keys(answers).length} de {questions.length} preguntas
                </span>
                {/* Indicador de auto-guardado */}
                {saveStatus === 'saving' && (
                  <span className="flex items-center gap-2 text-blue-600 text-xs">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Guardando...
                  </span>
                )}
                {saveStatus === 'saved' && (
                  <span className="flex items-center gap-2 text-green-600 text-xs">
                    <CheckCircle2 className="h-3 w-3" />
                    Guardado
                  </span>
                )}
                {saveStatus === 'error' && (
                  <span className="flex items-center gap-2 text-red-600 text-xs">
                    <AlertCircle className="h-3 w-3" />
                    Error al guardar
                  </span>
                )}
              </div>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {questions.map((question: any, index: number) => {
              let options = [];
              try {
                options = typeof question.options === 'string' 
                  ? JSON.parse(question.options) 
                  : (Array.isArray(question.options) ? question.options : []);
              } catch (e) {
                console.error('Error parsing options:', e);
                options = [];
              }

              return (
                <div key={question.id} className="space-y-4 p-6 border rounded-lg bg-card hover:border-primary/50 transition-colors">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary text-primary-foreground rounded-full flex items-center justify-center font-semibold text-sm">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <Label className="text-base font-medium leading-relaxed">
                        {question.questionText}
                      </Label>
                      {question.category && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Categoría: {question.category}
                        </p>
                      )}
                    </div>
                  </div>

                  <RadioGroup
                    value={answers[question.id]}
                    onValueChange={(value) => handleAnswerChange(question.id, value)}
                    className="ml-11 space-y-2"
                  >
                    {options.map((option: string) => (
                      <div key={option} className="flex items-center space-x-3 p-3 rounded-md hover:bg-accent transition-colors">
                        <RadioGroupItem value={option} id={`${question.id}-${option}`} />
                        <Label 
                          htmlFor={`${question.id}-${option}`}
                          className="flex-1 cursor-pointer font-normal"
                        >
                          {option}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>

                  {!answers[question.id] && (
                    <p className="ml-11 text-sm text-destructive">
                      * Campo requerido
                    </p>
                  )}
                </div>
              );
            })}

            <div className="flex items-center justify-between pt-6 border-t sticky bottom-0 bg-background py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => window.location.href = window.location.href}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || Object.keys(answers).length < questions.length}
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Enviar Respuestas
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Alert className="mt-6">
        <Shield className="h-4 w-4" />
        <AlertTitle>Confidencialidad y Protección de Datos</AlertTitle>
        <AlertDescription>
          Tus respuestas son completamente confidenciales y serán utilizadas únicamente para cumplir con la NOM-035-STPS-2018.
        </AlertDescription>
      </Alert>
    </div>
  );
}

function getSurveyDisplayName(surveyType: string): string {
  switch (surveyType) {
    case "guia_i":
      return "Guía I - Identificación de factores de riesgo psicosocial";
    case "guia_ii":
      return "Guía II - Identificación y análisis de factores de riesgo psicosocial";
    case "guia_iii":
      return "Guía III - Identificación y análisis de factores de riesgo psicosocial y evaluación del entorno organizacional";
    default:
      return "Encuesta NOM-035";
  }
}
