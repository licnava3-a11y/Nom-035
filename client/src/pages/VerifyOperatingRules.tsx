import { useEffect } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Shield, Calendar, User, FileText } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function VerifyOperatingRules() {
  const [, params] = useRoute("/verify-document/operating-rules/:id");
  const documentId = params?.id ? parseInt(params.id) : null;

  const { data: document, isLoading, error } = trpc.committeeOperatingRules.getById.useQuery(
    { id: documentId! },
    { enabled: !!documentId }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-muted-foreground">Verificando documento...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl border-red-200">
          <CardHeader>
            <div className="flex items-center gap-3">
              <XCircle className="h-12 w-12 text-red-600" />
              <div>
                <CardTitle className="text-red-900">Documento No Válido</CardTitle>
                <CardDescription>El documento no pudo ser verificado</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm text-red-800">
                <strong>Motivo:</strong> El documento con ID <code className="bg-red-100 px-2 py-1 rounded">{documentId}</code> no existe en nuestros registros o ha sido eliminado.
              </p>
              <p className="text-sm text-red-700 mt-2">
                Por favor, verifique que el código QR sea correcto o contacte al administrador del sistema.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isActive = document.status === "active";

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl border-green-200 shadow-xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-12 w-12 text-green-600" />
            <div>
              <CardTitle className="text-green-900">Documento Verificado</CardTitle>
              <CardDescription>Este documento es auténtico y está registrado en el sistema</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Información del documento */}
          <div className="bg-white rounded-lg p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Bases de Funcionamiento del Comité</h3>
              <Badge variant={isActive ? "default" : "secondary"} className="text-sm">
                {isActive ? "ACTIVO" : "BORRADOR"}
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Versión</p>
                  <p className="text-base text-gray-900">{document.version}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Fecha de Vigencia</p>
                  <p className="text-base text-gray-900">
                    {format(new Date(document.effectiveDate), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                  </p>
                </div>
              </div>

              {document.nextReviewDate && (
                <div className="flex items-start gap-3">
                  <Calendar className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-700">Próxima Revisión</p>
                    <p className="text-base text-gray-900">
                      {format(new Date(document.nextReviewDate), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-blue-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-gray-700">Creado por</p>
                  <p className="text-base text-gray-900">{document.creatorName || "Sistema"}</p>
                </div>
              </div>
            </div>

            {document.approvedAt && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 text-green-700">
                  <Shield className="h-5 w-5" />
                  <span className="font-medium">Documento Aprobado</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  Aprobado el {format(new Date(document.approvedAt), "dd 'de' MMMM 'de' yyyy", { locale: es })}
                  {document.approverName && ` por ${document.approverName}`}
                </p>
              </div>
            )}
          </div>

          {/* Información de verificación */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-green-700 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-green-900 mb-1">Verificación de Autenticidad</h4>
                <p className="text-sm text-green-800 mb-2">
                  Este documento ha sido verificado exitosamente contra nuestra base de datos. El código QR es válido y el documento es auténtico.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-green-700">
                  <div>
                    <strong>ID del Documento:</strong> ORF-{String(document.id).padStart(6, "0")}
                  </div>
                  <div>
                    <strong>Fecha de Verificación:</strong> {format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cumplimiento normativo */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">Cumplimiento Normativo</h4>
            <ul className="space-y-1 text-sm text-blue-800">
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>NOM-035-STPS-2018 - Factores de riesgo psicosocial en el trabajo</span>
              </li>
              <li className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>NOM-151 - Requisitos de trazabilidad de documentos</span>
              </li>
            </ul>
          </div>

          {/* Nota legal */}
          <div className="text-xs text-gray-500 text-center pt-4 border-t border-gray-200">
            <p>
              Este sistema de verificación garantiza la autenticidad del documento mediante código QR único.
              Cualquier alteración o falsificación del documento puede ser detectada mediante esta verificación.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
