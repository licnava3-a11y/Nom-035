/**
 * Anonymous Survey Access Page
 * Public page for accessing surveys using anonymous tokens (no login required)
 */

import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

export default function AnonymousSurveyAccess() {
  const [, params] = useRoute("/survey/anonymous/:token");
  const [, setLocation] = useLocation();
  const token = params?.token || "";

  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    success: boolean;
    surveyType?: string;
    department?: string;
    message: string;
  } | null>(null);

  const validateMutation = trpc.surveyAnonymousTokens.validateToken.useMutation({
    onSuccess: (data) => {
      setValidationResult({
        success: true,
        surveyType: data.surveyType,
        department: data.department || undefined,
        message: data.message,
      });
      setIsValidating(false);
      
      // Redirect to appropriate survey after 2 seconds
      setTimeout(() => {
        const surveyPaths: Record<string, string> = {
          guia_i: "/surveys/guide-i",
          guia_ii: "/surveys/guide-ii",
          guia_iii: "/surveys/guide-iii",
        };
        const path = surveyPaths[data.surveyType];
        if (path) {
          setLocation(path);
        }
      }, 2000);
    },
    onError: (error) => {
      setValidationResult({
        success: false,
        message: error.message,
      });
      setIsValidating(false);
      toast.error(error.message);
    },
  });

  const handleValidateToken = () => {
    if (!token || token.length !== 64) {
      toast.error("Token inválido");
      return;
    }

    setIsValidating(true);
    validateMutation.mutate({ token });
  };

  const getSurveyTypeName = (type: string) => {
    const names: Record<string, string> = {
      guia_i: "Guía I - Cuestionario de Identificación",
      guia_ii: "Guía II - Cuestionario de Factores de Riesgo Psicosocial",
      guia_iii: "Guía III - Cuestionario de Entorno Organizacional",
    };
    return names[type] || type;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl shadow-xl">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="w-20 h-20 bg-indigo-600 rounded-full flex items-center justify-center">
              <svg
                className="w-12 h-12 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-gray-900">
            Acceso Anónimo a Encuesta NOM-035
          </CardTitle>
          <CardDescription className="text-lg mt-2">
            Validación de token de acceso
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Token Display */}
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <p className="text-sm font-medium text-gray-700 mb-2">Token de Acceso:</p>
            <p className="font-mono text-xs text-gray-600 break-all">
              {token || "No se proporcionó un token"}
            </p>
          </div>

          {/* Validation Status */}
          {!validationResult && !isValidating && (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center gap-2 text-gray-600">
                <AlertCircle className="h-5 w-5" />
                <p>Haz clic en el botón para validar tu token de acceso</p>
              </div>
              <Button
                onClick={handleValidateToken}
                size="lg"
                className="w-full md:w-auto"
                disabled={!token || token.length !== 64}
              >
                Validar Token y Acceder
              </Button>
            </div>
          )}

          {isValidating && (
            <div className="text-center space-y-4 py-8">
              <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto" />
              <p className="text-gray-600">Validando token de acceso...</p>
            </div>
          )}

          {validationResult && validationResult.success && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-green-900">Token Válido</p>
                  <p className="text-sm text-green-700 mt-1">{validationResult.message}</p>
                </div>
              </div>

              {validationResult.surveyType && (
                <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                  <p className="text-sm font-medium text-indigo-900 mb-2">
                    Encuesta Asignada:
                  </p>
                  <p className="text-indigo-700 font-semibold">
                    {getSurveyTypeName(validationResult.surveyType)}
                  </p>
                  {validationResult.department && (
                    <p className="text-sm text-indigo-600 mt-2">
                      Departamento: {validationResult.department}
                    </p>
                  )}
                </div>
              )}

              <div className="flex items-center justify-center gap-2 text-gray-600 py-4">
                <Loader2 className="h-5 w-5 animate-spin" />
                <p>Redirigiendo a la encuesta...</p>
              </div>
            </div>
          )}

          {validationResult && !validationResult.success && (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                <XCircle className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-red-900">Token Inválido</p>
                  <p className="text-sm text-red-700 mt-1">{validationResult.message}</p>
                </div>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <p className="text-sm font-medium text-yellow-900 mb-2">
                  Posibles razones:
                </p>
                <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
                  <li>El token ya fue utilizado anteriormente</li>
                  <li>El token ha expirado</li>
                  <li>El token ha sido revocado por un administrador</li>
                  <li>El token no existe en el sistema</li>
                </ul>
              </div>

              <div className="text-center pt-4">
                <p className="text-sm text-gray-600 mb-4">
                  Si crees que esto es un error, contacta al administrador del sistema
                </p>
                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                >
                  Intentar de Nuevo
                </Button>
              </div>
            </div>
          )}

          {/* Information Footer */}
          <div className="border-t pt-6 mt-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-sm font-medium text-blue-900 mb-2">
                ℹ️ Información Importante
              </p>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Este token es de un solo uso y se invalidará después de acceder</li>
                <li>• No necesitas iniciar sesión para completar la encuesta</li>
                <li>• Tus respuestas serán completamente anónimas</li>
                <li>• Asegúrate de completar la encuesta en una sola sesión</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
