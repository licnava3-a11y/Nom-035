import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useDebounce } from "@/hooks/useDebounce";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, Loader2, Shield, FileText, Building2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { SurveyQuestionCards, type SurveyQuestionCardData } from "@/components/surveys/SurveyQuestionCards";

interface SurveyFormProps {
  surveyId: number;
  title: string;
  description: string;
  instructions: string;
  icon?: 'shield' | 'building' | 'file';
  anonymousToken?: string; // Token para acceso anónimo (opcional)
}

export default function SurveyForm({ surveyId, title, description, instructions, icon = 'file', anonymousToken }: SurveyFormProps) {
  const [, setLocation] = useLocation();
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSavedAnswer, setLastSavedAnswer] = useState<{ questionId: number; value: string } | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  
  // Debounce de respuestas para auto-guardado
  const debouncedAnswers = useDebounce(answers, 1000);

  // Obtener preguntas de la encuesta
  const { data: questions, isLoading } = (trpc as any).surveys.getQuestions.useQuery(surveyId);
  
  const submitSurvey = (trpc as any).surveys.submitResponse.useMutation({
    onSuccess: (data: any) => {
      if (data.atsDetected) {
        toast.error("Se ha detectado un acontecimiento traumático severo. El comité será notificado para brindar apoyo.");
      } else {
        toast.success("Gracias por completar el cuestionario. Tus respuestas han sido registradas.");
      }
      // Redirigir a la página de resultados
      if (data.responseId) {
        setLocation(`/surveys/results/${data.responseId}`);
      } else {
        setLocation("/surveys/dashboard");
      }
    },
    onError: (error: any) => {
      toast.error(`Error: ${error.message}`);
      setIsSubmitting(false);
    },
  });

  // Mutation para auto-guardado
  const savePartialMutation = (trpc as any).surveys.savePartialResponse.useMutation({
    onSuccess: () => {
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 2000);
    },
    onError: () => {
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    },
  });

  // Auto-guardar cuando cambian las respuestas (con debounce)
  useEffect(() => {
    if (!lastSavedAnswer) return;
    
    setSaveStatus('saving');
    savePartialMutation.mutate({
      surveyId,
      token: anonymousToken,
      questionId: lastSavedAnswer.questionId,
      answerValue: lastSavedAnswer.value,
    });
  }, [debouncedAnswers]);

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

    submitSurvey.mutate({
      surveyId,
      answers: formattedAnswers,
      anonymousToken, // Incluir token si está presente
    });
  };

  const getIcon = () => {
    switch (icon) {
      case 'shield':
        return <Shield className="h-6 w-6 text-blue-600" />;
      case 'building':
        return <Building2 className="h-6 w-6 text-green-600" />;
      default:
        return <FileText className="h-6 w-6 text-purple-600" />;
    }
  };

  const getIconBg = () => {
    switch (icon) {
      case 'shield':
        return 'bg-blue-100';
      case 'building':
        return 'bg-green-100';
      default:
        return 'bg-purple-100';
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
              <CardTitle className="text-2xl">{title}</CardTitle>
              <CardDescription>{description}</CardDescription>
            </div>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Instrucciones</AlertTitle>
            <AlertDescription>{instructions}</AlertDescription>
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
              <span className="text-muted-foreground text-xs">
                Auto-guardado activado
              </span>
              <span className="font-medium">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <SurveyQuestionCards
              questions={questions as SurveyQuestionCardData[]}
              answers={answers}
              onAnswerChange={handleAnswerChange}
            />

            <div className="flex items-center justify-between pt-6 border-t sticky bottom-0 bg-background py-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/surveys/dashboard")}
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
