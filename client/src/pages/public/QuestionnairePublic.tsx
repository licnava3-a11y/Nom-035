import { useState } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Loader2, CheckCircle2, AlertCircle, FileText } from "lucide-react";

// Preguntas de cuestionario de mobbing (36 preguntas, escala 1-5)
const mobbingQuestions = [
  "¿Con qué frecuencia te ignoran o excluyen de conversaciones laborales?",
  "¿Te asignan tareas sin sentido o imposibles de cumplir?",
  "¿Recibes críticas constantes sobre tu trabajo sin fundamento?",
  "¿Te gritan o te hablan de forma agresiva?",
  "¿Difunden rumores falsos sobre ti?",
  "¿Te cambian de puesto o responsabilidades sin justificación?",
  "¿Te niegan información necesaria para realizar tu trabajo?",
  "¿Recibes burlas o comentarios humillantes?",
  "¿Te amenazan con despido o sanciones injustificadas?",
  "¿Te aíslan físicamente del resto del equipo?",
  "¿Ignoran tus opiniones o sugerencias sistemáticamente?",
  "¿Te sobrecargan de trabajo de manera intencional?",
  "¿Te asignan tareas muy por debajo de tu capacidad?",
  "¿Recibes evaluaciones negativas injustificadas?",
  "¿Te culpan de errores que no cometiste?",
  "¿Te interrumpen constantemente cuando hablas?",
  "¿Recibes llamadas o mensajes fuera de horario laboral de forma hostigante?",
  "¿Te niegan permisos o vacaciones sin razón válida?",
  "¿Recibes comentarios ofensivos sobre tu apariencia?",
  "¿Te excluyen de reuniones importantes?",
  "¿Modifican tus horarios sin consultarte?",
  "¿Te obligan a realizar tareas degradantes?",
  "¿Recibes amenazas veladas o directas?",
  "¿Te comparan negativamente con otros compañeros?",
  "¿Te niegan recursos necesarios para tu trabajo?",
  "¿Recibes comentarios discriminatorios?",
  "¿Te vigilan excesivamente?",
  "¿Te presionan para renunciar?",
  "¿Ignoran tus solicitudes de apoyo?",
  "¿Te hacen sentir incompetente constantemente?",
  "¿Recibes trato diferenciado negativo?",
  "¿Te impiden el desarrollo profesional?",
  "¿Recibes sanciones desproporcionadas?",
  "¿Te hacen trabajar en condiciones inadecuadas?",
  "¿Recibes presión psicológica constante?",
  "¿Sientes que tu integridad está en riesgo?",
];

// Preguntas de cuestionario de burnout (22 preguntas del Maslach Burnout Inventory, escala 1-7)
const burnoutQuestions = [
  // Agotamiento emocional (9 items)
  "Me siento emocionalmente agotado por mi trabajo",
  "Me siento cansado al final de la jornada de trabajo",
  "Me siento fatigado cuando me levanto por la mañana y tengo que enfrentarme a otro día de trabajo",
  "Trabajar todo el día es una tensión para mí",
  "Puedo resolver de manera eficaz los problemas que surgen en mi trabajo",
  "Me siento 'quemado' por el trabajo",
  "Siento que estoy haciendo un trabajo demasiado duro",
  "Trabajar en contacto directo con personas me produce estrés",
  "Me siento acabado en mi trabajo",
  // Despersonalización (5 items)
  "Siento que trato a algunas personas como si fueran objetos impersonales",
  "Me he vuelto más insensible con la gente desde que ejerzo esta profesión",
  "Pienso que este trabajo me está endureciendo emocionalmente",
  "No me preocupa realmente lo que les ocurra a algunas de las personas a las que doy servicio",
  "Siento que las personas me culpan de algunos de sus problemas",
  // Realización personal (8 items)
  "Comprendo fácilmente cómo se sienten las personas",
  "Trato muy eficazmente los problemas de las personas",
  "Siento que mediante mi trabajo estoy influyendo positivamente en la vida de otras personas",
  "Me siento con mucha energía en mi trabajo",
  "Puedo crear con facilidad un clima agradable con las personas",
  "Me siento estimulado después de haber trabajado con personas",
  "Creo que consigo muchas cosas valiosas en este trabajo",
  "En mi trabajo trato los problemas emocionales con mucha calma",
];

export default function QuestionnairePublic() {
  const params = useParams();
  const token = params.token || "";

  // Estados
  const [step, setStep] = useState<"auth" | "questionnaire" | "completed">(
    "auth"
  );
  const [curp, setCurp] = useState("");
  const [questionnaireData, setQuestionnaireData] = useState<{
    questionnaireId: number;
    questionnaireType: "mobbing" | "burnout";
    status: string;
    employeeName: string;
  } | null>(null);
  const [responses, setResponses] = useState<Record<string, number>>({});

  // Mutations y queries
  const validateMutation = trpc.investigations.validateTokenAndCurp.useQuery(
    { token, curp },
    { enabled: false }
  );

  const submitMutation = trpc.investigations.submitPublicResponses.useMutation({
    onSuccess: data => {
      toast.success(
        `Cuestionario completado. Nivel de riesgo: ${data.riskLevel}`
      );
      setStep("completed");
    },
    onError: error => {
      toast.error(`Error al enviar cuestionario: ${error.message}`);
    },
  });

  // Validar token + CURP
  const handleAuth = async () => {
    if (!curp || curp.length !== 18) {
      toast.error("El CURP debe tener 18 caracteres");
      return;
    }

    try {
      const result = await validateMutation.refetch();
      if (result.data) {
        setQuestionnaireData(result.data);
        setStep("questionnaire");
        toast.success(`Bienvenido(a) ${result.data.employeeName}`);
      }
    } catch (error: any) {
      toast.error(error.message || "Token o CURP inválidos");
    }
  };

  // Enviar respuestas
  const handleSubmit = () => {
    const questions =
      questionnaireData?.questionnaireType === "mobbing"
        ? mobbingQuestions
        : burnoutQuestions;

    // Verificar que todas las preguntas estén respondidas
    if (Object.keys(responses).length !== questions.length) {
      toast.error("Por favor responde todas las preguntas antes de enviar");
      return;
    }

    submitMutation.mutate({
      token,
      curp,
      responses,
    });
  };

  // Pantalla de autenticación
  if (step === "auth") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center mb-4">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <CardTitle className="text-2xl">
              Cuestionario de Investigación
            </CardTitle>
            <CardDescription>
              Ingresa tu CURP para acceder al cuestionario
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Este cuestionario es confidencial y forma parte de una
                investigación de riesgo psicosocial. Tus respuestas serán
                tratadas con total privacidad.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="curp">CURP (18 caracteres)</Label>
              <Input
                id="curp"
                placeholder="AAAA000000HDFBBB00"
                value={curp}
                onChange={e => setCurp(e.target.value.toUpperCase())}
                maxLength={18}
                className="uppercase"
              />
              <p className="text-xs text-muted-foreground">
                Ingresa tu CURP exactamente como aparece en tu identificación
                oficial
              </p>
            </div>

            <Button
              onClick={handleAuth}
              className="w-full"
              disabled={validateMutation.isPending || curp.length !== 18}
            >
              {validateMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Acceder al cuestionario
            </Button>

            {validateMutation.isError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  {validateMutation.error?.message ||
                    "Error al validar credenciales"}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Pantalla de cuestionario
  if (step === "questionnaire" && questionnaireData) {
    const questions =
      questionnaireData.questionnaireType === "mobbing"
        ? mobbingQuestions
        : burnoutQuestions;
    const scaleMax = questionnaireData.questionnaireType === "mobbing" ? 5 : 7;
    const scaleLabels =
      questionnaireData.questionnaireType === "mobbing"
        ? ["Nunca", "Rara vez", "A veces", "Frecuentemente", "Siempre"]
        : [
            "Nunca",
            "Pocas veces al año",
            "Una vez al mes",
            "Pocas veces al mes",
            "Una vez a la semana",
            "Pocas veces a la semana",
            "Todos los días",
          ];

    const progress = (Object.keys(responses).length / questions.length) * 100;

    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-2xl">
                {questionnaireData.questionnaireType === "mobbing"
                  ? "Cuestionario de Mobbing (Acoso Laboral)"
                  : "Cuestionario de Burnout (Síndrome de Desgaste)"}
              </CardTitle>
              <CardDescription>
                Empleado: {questionnaireData.employeeName}
              </CardDescription>
              <div className="mt-4">
                <div className="flex justify-between text-sm text-muted-foreground mb-2">
                  <span>
                    Progreso: {Object.keys(responses).length} /{" "}
                    {questions.length}
                  </span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            </CardHeader>
          </Card>

          <div className="space-y-6">
            {questions.map((question, index) => (
              <Card key={index}>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <Label className="text-base font-medium">
                      {index + 1}. {question}
                    </Label>
                    <RadioGroup
                      value={responses[`q${index}`]?.toString() || ""}
                      onValueChange={value => {
                        setResponses(prev => ({
                          ...prev,
                          [`q${index}`]: parseInt(value),
                        }));
                      }}
                    >
                      {Array.from({ length: scaleMax }, (_, i) => i + 1).map(
                        (value: any) => (
                          <div
                            key={value}
                            className="flex items-center space-x-2"
                          >
                            <RadioGroupItem
                              value={value.toString()}
                              id={`q${index}-${value}`}
                            />
                            <Label
                              htmlFor={`q${index}-${value}`}
                              className="font-normal cursor-pointer"
                            >
                              {value} - {scaleLabels[value - 1]}
                            </Label>
                          </div>
                        )
                      )}
                    </RadioGroup>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="mt-6 sticky bottom-4">
            <CardContent className="pt-6">
              <Button
                onClick={handleSubmit}
                className="w-full"
                size="lg"
                disabled={
                  submitMutation.isPending ||
                  Object.keys(responses).length !== questions.length
                }
              >
                {submitMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Enviar cuestionario ({Object.keys(responses).length}/
                {questions.length})
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Pantalla de completado
  if (step === "completed") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-green-600 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-white" />
            </div>
            <CardTitle className="text-2xl">
              ¡Cuestionario completado!
            </CardTitle>
            <CardDescription>
              Gracias por completar el cuestionario. Tus respuestas han sido
              registradas exitosamente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                El equipo de Recursos Humanos revisará tus respuestas y se
                pondrá en contacto contigo si es necesario. Toda la información
                será manejada con estricta confidencialidad.
              </AlertDescription>
            </Alert>

            <Button
              onClick={() => window.close()}
              variant="outline"
              className="w-full"
            >
              Cerrar ventana
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
