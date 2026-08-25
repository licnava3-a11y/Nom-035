import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";

/**
 * Página de acceso público para responder encuestas mediante token
 * Ruta: /survey/public/:token
 *
 * Permite a empleados responder encuestas sin autenticación
 * utilizando un token único generado por CURP
 */

export default function PublicSurvey() {
  const params = useParams();
  const [, setLocation] = useLocation();
  const token = params.token || "";
  const [surveyId, setSurveyId] = useState<number | null>(null);
  const [completed, setCompleted] = useState(false);

  // Validar token al cargar
  const {
    data: tokenData,
    isLoading: validating,
    error: tokenError,
  } = trpc.surveys.validateSurveyToken.useQuery(
    { token, surveyId: surveyId || 0 },
    { enabled: !!token && !!surveyId }
  );

  // Obtener encuesta
  const { data: survey, isLoading: loadingSurvey } =
    trpc.surveys.getById.useQuery(surveyId!, {
      enabled: !!surveyId && !!tokenData,
    });

  // Obtener preguntas
  const { data: questions, isLoading: loadingQuestions } =
    trpc.surveys.getQuestions.useQuery(surveyId!, {
      enabled: !!surveyId && !!tokenData,
    });

  // Detectar surveyId del token (simulado, en producción vendría del backend)
  useEffect(() => {
    // Por ahora asumimos que el surveyId está en la URL o se obtiene del token
    // En producción, el backend debería retornar el surveyId al validar el token
    const urlParams = new URLSearchParams(window.location.search);
    const sid = urlParams.get("surveyId");
    if (sid) {
      setSurveyId(parseInt(sid));
    }
  }, []);

  // Enviar respuestas
  const submitMutation = trpc.surveys.submitResponse.useMutation({
    onSuccess: () => {
      setCompleted(true);
      // Marcar token como usado
      markTokenMutation.mutate({ token });
    },
  });

  const markTokenMutation = trpc.surveys.markTokenAsUsed.useMutation();

  const handleSubmit = (
    answers: Array<{ questionId: number; answerValue: string }>
  ) => {
    if (!surveyId || !tokenData) return;

    submitMutation.mutate({
      surveyId,
      answers,
      responseToken: token,
    });
  };

  // Estados de carga
  if (!token) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Token no válido</h2>
          <p className="text-muted-foreground">
            No se proporcionó un token de acceso válido para esta encuesta.
          </p>
        </Card>
      </div>
    );
  }

  if (!surveyId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
          <p className="text-muted-foreground">Cargando encuesta...</p>
        </Card>
      </div>
    );
  }

  if (validating || loadingSurvey || loadingQuestions) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <Loader2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
          <p className="text-muted-foreground">Validando acceso...</p>
        </Card>
      </div>
    );
  }

  if (tokenError || !tokenData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Acceso denegado</h2>
          <p className="text-muted-foreground mb-4">
            {tokenError?.message ||
              "El token de acceso no es válido o ha expirado."}
          </p>
        </Card>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">¡Encuesta completada!</h2>
          <p className="text-muted-foreground mb-6">
            Gracias por completar la encuesta. Tus respuestas han sido
            registradas exitosamente.
          </p>
          <p className="text-sm text-muted-foreground">
            Puedes cerrar esta ventana.
          </p>
        </Card>
      </div>
    );
  }

  if (!survey || !questions) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Error al cargar encuesta</h2>
          <p className="text-muted-foreground">
            No se pudo cargar la información de la encuesta.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <Card className="mb-6 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold mb-2">{survey.title}</h1>
              <p className="text-muted-foreground mb-4">{survey.description}</p>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span>Empleado: {tokenData.employee.name}</span>
                <span>•</span>
                <span>CURP: {tokenData.employee.curp}</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Formulario de encuesta */}
        <Card className="p-6">
          <PublicSurveyForm
            questions={questions}
            onSubmit={handleSubmit}
            isSubmitting={submitMutation.isPending}
            token={token}
            surveyId={surveyId}
          />
        </Card>
      </div>
    </div>
  );
}

// Componente de formulario simplificado
function PublicSurveyForm({
  questions,
  onSubmit,
  isSubmitting,
  token,
  surveyId,
}: {
  questions: any[];
  onSubmit: (
    answers: Array<{ questionId: number; answerValue: string }>
  ) => void;
  isSubmitting: boolean;
  token: string;
  surveyId: number;
}) {
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [currentPage, setCurrentPage] = useState(0);
  const questionsPerPage = 10;

  const totalPages = Math.ceil(questions.length / questionsPerPage);
  const startIdx = currentPage * questionsPerPage;
  const endIdx = startIdx + questionsPerPage;
  const currentQuestions = questions.slice(startIdx, endIdx);

  const handleAnswerChange = (questionId: number, value: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));

    // Auto-guardar (se implementará en la siguiente fase)
    // savePartialResponse({ surveyId, token, questionId, answerValue: value });
  };

  const handleNext = () => {
    if (currentPage < totalPages - 1) {
      setCurrentPage(prev => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handlePrevious = () => {
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSubmit = () => {
    const answerArray = Object.entries(answers).map(
      ([questionId, answerValue]) => ({
        questionId: parseInt(questionId),
        answerValue,
      })
    );

    onSubmit(answerArray);
  };

  const allAnswered = questions.every(q => answers[q.id]);
  const progress = (Object.keys(answers).length / questions.length) * 100;

  return (
    <div className="space-y-6">
      {/* Barra de progreso */}
      <div>
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>Progreso</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Preguntas */}
      <div className="space-y-6">
        {currentQuestions.map((question, idx) => (
          <div key={question.id} className="space-y-3">
            <label className="font-medium block">
              {startIdx + idx + 1}. {question.questionText}
            </label>

            {question.questionType === "multiple_choice" && (
              <div className="space-y-2">
                {question.options?.map((option: string) => (
                  <label
                    key={option}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name={`question-${question.id}`}
                      value={option}
                      checked={answers[question.id] === option}
                      onChange={e =>
                        handleAnswerChange(question.id, e.target.value)
                      }
                      className="w-4 h-4"
                    />
                    <span>{option}</span>
                  </label>
                ))}
              </div>
            )}

            {question.questionType === "yes_no" && (
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={`question-${question.id}`}
                    value="Sí"
                    checked={answers[question.id] === "Sí"}
                    onChange={e =>
                      handleAnswerChange(question.id, e.target.value)
                    }
                    className="w-4 h-4"
                  />
                  <span>Sí</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name={`question-${question.id}`}
                    value="No"
                    checked={answers[question.id] === "No"}
                    onChange={e =>
                      handleAnswerChange(question.id, e.target.value)
                    }
                    className="w-4 h-4"
                  />
                  <span>No</span>
                </label>
              </div>
            )}

            {question.questionType === "text" && (
              <textarea
                value={answers[question.id] || ""}
                onChange={e => handleAnswerChange(question.id, e.target.value)}
                className="w-full p-3 border rounded-md min-h-[100px]"
                placeholder="Escribe tu respuesta aquí..."
              />
            )}
          </div>
        ))}
      </div>

      {/* Navegación */}
      <div className="flex justify-between items-center pt-6 border-t">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentPage === 0}
        >
          Anterior
        </Button>

        <span className="text-sm text-muted-foreground">
          Página {currentPage + 1} de {totalPages}
        </span>

        {currentPage < totalPages - 1 ? (
          <Button onClick={handleNext}>Siguiente</Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={!allAnswered || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Enviando...
              </>
            ) : (
              "Enviar encuesta"
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
