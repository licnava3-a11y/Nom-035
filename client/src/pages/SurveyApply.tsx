import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "../lib/trpc";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { AlertCircle, CheckCircle, Loader2 } from "lucide-react";
import SurveyFormWithToken from "../components/SurveyFormWithToken";

export default function SurveyApply() {
  const [, setLocation] = useLocation();
  const [tokenParam, setTokenParam] = useState<string | null>(null);
  const [showSurvey, setShowSurvey] = useState(false);

  useEffect(() => {
    // Obtener token de la URL
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    setTokenParam(token);
  }, []);

  // Obtener información del token
  const { data: tokenInfo, isLoading, error } = trpc.surveyTokensAdvanced.getTokenInfo.useQuery(
    { token: tokenParam || "" },
    { enabled: !!tokenParam }
  );

  if (!tokenParam) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Token no proporcionado
          </h1>
          <p className="text-gray-600 mb-6">
            Por favor, accede a la encuesta usando el enlace proporcionado en tu correo electrónico.
          </p>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-700 text-lg">Validando token...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Token inválido o expirado
          </h1>
          <p className="text-gray-600 mb-6">
            {error.message || "El token proporcionado no es válido o ha expirado."}
          </p>
          <p className="text-sm text-gray-500">
            Por favor, contacta a tu departamento de Recursos Humanos para obtener un nuevo enlace.
          </p>
        </Card>
      </div>
    );
  }

  if (tokenInfo?.alreadyCompleted && !tokenInfo.nextSurvey) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
        <Card className="max-w-md w-full p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            ¡Encuesta completada!
          </h1>
          <p className="text-gray-600 mb-4">
            Ya has completado todas las encuestas requeridas.
          </p>
          <p className="text-sm text-gray-500">
            Gracias por tu participación.
          </p>
        </Card>
      </div>
    );
  }

  const surveyTypeToDisplay = tokenInfo?.nextSurvey || tokenInfo?.surveyType;
  const surveyName = getSurveyDisplayName(surveyTypeToDisplay || "");

  // Si ya se hizo clic en "Comenzar Encuesta", mostrar el formulario
  if (showSurvey && tokenParam && surveyTypeToDisplay) {
    return (
      <SurveyFormWithToken
        token={tokenParam}
        surveyType={surveyTypeToDisplay}
        periodId={tokenInfo?.periodId || 0}
        employeeId={tokenInfo?.userId || 0}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-4xl mx-auto py-8">
        {/* Header */}
        <Card className="p-6 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Encuesta NOM-035 STPS
              </h1>
              <p className="text-lg text-gray-700 mb-1">
                {surveyName}
              </p>
              <p className="text-sm text-gray-600">
                Periodo: {tokenInfo?.periodName}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-gray-700">
                {tokenInfo?.userName}
              </p>
              <p className="text-xs text-gray-500">
                {tokenInfo?.userEmail}
              </p>
            </div>
          </div>

          {tokenInfo?.alreadyCompleted && tokenInfo.nextSurvey && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Nota:</strong> {tokenInfo.message}
              </p>
            </div>
          )}
        </Card>

        {/* Instrucciones */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Instrucciones
          </h2>
          <div className="space-y-3 text-gray-700">
            <p>
              • Lee cuidadosamente cada pregunta antes de responder.
            </p>
            <p>
              • No hay respuestas correctas o incorrectas, responde con sinceridad.
            </p>
            <p>
              • Tus respuestas son confidenciales y se utilizarán únicamente para fines de prevención de riesgos psicosociales.
            </p>
            <p>
              • La encuesta tomará aproximadamente 15-20 minutos.
            </p>
            <p>
              • Tus respuestas se guardarán automáticamente mientras avanzas.
            </p>
          </div>
        </Card>

        {/* Botón para comenzar */}
        <div className="text-center">
          <Button
            size="lg"
            className="px-8 py-6 text-lg"
            onClick={() => setShowSurvey(true)}
          >
            Comenzar Encuesta
          </Button>
          <p className="text-sm text-gray-500 mt-4">
            Al hacer clic en "Comenzar Encuesta", aceptas participar en esta evaluación.
          </p>
        </div>
      </div>
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
