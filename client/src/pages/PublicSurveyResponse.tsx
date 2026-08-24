import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "sonner";
import {
  Shield,
  CheckCircle2,
  AlertCircle,
  FileText,
  User,
} from "lucide-react";

type SurveyQuestion = {
  id: number;
  questionText: string;
  questionType: string;
  options?: string | null;
  [key: string]: unknown;
};

export default function PublicSurveyResponse() {
  const params = useParams();
  const token = params.token || "";

  const [step, setStep] = useState<"auth" | "survey" | "completed">("auth");
  const [curp, setCurp] = useState("");
  const [tokenData, setTokenData] = useState<any>(null);
  const [questions, setQuestions] = useState<SurveyQuestion[]>([]);
  const [responses, setResponses] = useState<Record<number, string>>({});

  // Mutations
  const validateToken = trpc.publicSurveys.validateToken.useMutation({
    onSuccess: data => {
      setTokenData(data);
      setStep("survey");
      toast.success(`Bienvenido/a, ${data.employee.name}`);
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const { data: questionsData, refetch: refetchQuestions } =
    trpc.publicSurveys.getSurveyQuestions.useQuery(
      {
        token,
        surveyType: tokenData?.tokenData?.surveyType || "guia_i",
      },
      {
        enabled: false, // Solo ejecutar manualmente después de autenticación
      }
    );

  const submitSurvey = trpc.publicSurveys.submitSurveyResponses.useMutation({
    onSuccess: () => {
      setStep("completed");
      toast.success("¡Encuesta enviada exitosamente!");
    },
    onError: error => {
      toast.error(`Error al enviar encuesta: ${error.message}`);
    },
  });

  // Cargar preguntas después de autenticación exitosa
  useEffect(() => {
    if (tokenData && step === "survey") {
      refetchQuestions();
    }
  }, [tokenData, step, refetchQuestions]);

  useEffect(() => {
    if (questionsData?.questions) {
      setQuestions(questionsData.questions);
    }
  }, [questionsData]);

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();

    if (!curp || curp.length !== 18) {
      toast.error("Por favor ingresa un CURP válido (18 caracteres)");
      return;
    }

    validateToken.mutate({
      token,
      curp: curp.toUpperCase(),
    });
  };

  const handleSubmitSurvey = () => {
    // Validar que todas las preguntas tengan respuesta
    const unansweredQuestions = questions.filter(q => !responses[q.id]);

    if (unansweredQuestions.length > 0) {
      toast.error(
        `Por favor responde todas las preguntas (${unansweredQuestions.length} pendientes)`
      );
      return;
    }

    // Convertir respuestas a formato esperado
    const formattedResponses = Object.entries(responses).map(
      ([questionId, answer]) => ({
        questionId: parseInt(questionId),
        answer,
      })
    );

    submitSurvey.mutate({
      token,
      responses: formattedResponses,
    });
  };

  const getSurveyTypeName = (type: string) => {
    const types: Record<string, string> = {
      guia_i:
        "Guía de Referencia I - Cuestionario para identificar a los trabajadores que fueron sujetos a acontecimientos traumáticos severos",
      guia_ii:
        "Guía de Referencia II - Cuestionario para identificar factores de riesgo psicosocial en los centros de trabajo",
      guia_iii:
        "Guía de Referencia III - Cuestionario para identificar factores de riesgo psicosocial y evaluar el entorno organizacional",
    };
    return types[type] || type;
  };

  // Pantalla de autenticación
  if (step === "auth") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-blue-100 flex items-center justify-center">
              <Shield className="h-8 w-8 text-blue-600" />
            </div>
            <CardTitle className="text-2xl">
              Encuesta NOM-035 STPS 2018
            </CardTitle>
            <CardDescription>
              Por favor ingresa tu CURP para acceder a la encuesta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuth} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="curp">CURP</Label>
                <Input
                  id="curp"
                  value={curp}
                  onChange={e => setCurp(e.target.value.toUpperCase())}
                  placeholder="AAAA000000HDFBBB00"
                  maxLength={18}
                  required
                  className="uppercase"
                />
                <p className="text-xs text-muted-foreground">
                  Tu CURP debe tener exactamente 18 caracteres
                </p>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Confidencialidad garantizada:</strong> Tus respuestas
                  son anónimas y serán utilizadas únicamente para mejorar las
                  condiciones laborales.
                </AlertDescription>
              </Alert>

              <LoadingButton
                type="submit"
                className="w-full"
                loading={validateToken.isPending}
                loadingText="Verificando..."
              >
                Continuar
              </LoadingButton>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pantalla de encuesta
  if (step === "survey") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 py-8">
        <div className="container max-w-4xl mx-auto">
          {/* Header */}
          <Card className="mb-6 shadow-lg">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                    <User className="h-6 w-6 text-blue-600" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">
                      {tokenData?.employee?.name}
                    </CardTitle>
                    <CardDescription>
                      {tokenData?.employee?.department}
                    </CardDescription>
                  </div>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  <p>Válido hasta:</p>
                  <p className="font-semibold">
                    {new Date(
                      tokenData?.tokenData?.expiresAt
                    ).toLocaleDateString("es-MX")}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <h2 className="font-semibold text-lg mb-2">
                {getSurveyTypeName(tokenData?.tokenData?.surveyType)}
              </h2>
              <p className="text-sm text-muted-foreground">
                Por favor responde todas las preguntas con sinceridad. Tu
                participación es fundamental para mejorar nuestro entorno
                laboral.
              </p>
            </CardContent>
          </Card>

          {/* Questions */}
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Cuestionario
              </CardTitle>
              <CardDescription>
                {questions.length} preguntas • {Object.keys(responses).length}{" "}
                respondidas
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {questions.map((question, index) => (
                <div
                  key={question.id}
                  className="p-4 border rounded-lg bg-white"
                >
                  <Label className="text-base font-medium mb-3 block">
                    {index + 1}. {question.questionText}
                  </Label>

                  {question.questionType === "multiple_choice" &&
                  question.options ? (
                    <RadioGroup
                      value={responses[question.id] || ""}
                      onValueChange={value =>
                        setResponses({ ...responses, [question.id]: value })
                      }
                    >
                      {JSON.parse(question.options).map(
                        (option: string, optIndex: number) => (
                          <div
                            key={optIndex}
                            className="flex items-center space-x-2 mb-2"
                          >
                            <RadioGroupItem
                              value={option}
                              id={`q${question.id}-opt${optIndex}`}
                            />
                            <Label
                              htmlFor={`q${question.id}-opt${optIndex}`}
                              className="cursor-pointer font-normal"
                            >
                              {option}
                            </Label>
                          </div>
                        )
                      )}
                    </RadioGroup>
                  ) : (
                    <Input
                      value={responses[question.id] || ""}
                      onChange={e =>
                        setResponses({
                          ...responses,
                          [question.id]: e.target.value,
                        })
                      }
                      placeholder="Tu respuesta..."
                    />
                  )}
                </div>
              ))}

              {questions.length === 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Cargando preguntas de la encuesta...
                  </AlertDescription>
                </Alert>
              )}

              {questions.length > 0 && (
                <div className="pt-4 border-t">
                  <LoadingButton
                    onClick={handleSubmitSurvey}
                    className="w-full"
                    size="lg"
                    loading={submitSurvey.isPending}
                    loadingText="Enviando respuestas..."
                  >
                    Enviar Encuesta
                  </LoadingButton>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Pantalla de confirmación
  if (step === "completed") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl text-center">
          <CardHeader>
            <div className="mx-auto mb-4 h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="h-12 w-12 text-green-600" />
            </div>
            <CardTitle className="text-2xl text-green-700">
              ¡Encuesta Completada!
            </CardTitle>
            <CardDescription className="text-base">
              Gracias por tu participación
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription>
                Tus respuestas han sido registradas exitosamente. Tu
                participación contribuye a mejorar nuestro entorno laboral.
              </AlertDescription>
            </Alert>

            <div className="text-sm text-muted-foreground space-y-2">
              <p>
                <strong>Importante:</strong> Este enlace ya no es válido. Si
                necesitas modificar tus respuestas, contacta al administrador
                del sistema.
              </p>
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.close()}
            >
              Cerrar Ventana
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
