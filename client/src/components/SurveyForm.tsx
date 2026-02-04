import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import { AlertCircle, CheckCircle2, Loader2, Shield, FileText, Building2 } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";

interface SurveyFormProps {
  surveyId: number;
  title: string;
  description: string;
  instructions: string;
  icon?: 'shield' | 'building' | 'file';
}

export default function SurveyForm({ surveyId, title, description, instructions, icon = 'file' }: SurveyFormProps) {
  const [, setLocation] = useLocation();
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleAnswerChange = (questionId: number, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
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
              <span className="text-muted-foreground">
                Progreso: {Object.keys(answers).length} de {questions.length} preguntas
              </span>
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
