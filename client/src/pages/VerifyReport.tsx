import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, FileText, Calendar, User, Mail, Shield } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function VerifyReport() {
  const params = useParams();
  const uuid = params.uuid as string;

  const { data, isLoading, error } = trpc.compliance.verifyReport.useQuery(
    { uuid },
    { enabled: !!uuid }
  );

  if (!uuid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2">
              <XCircle className="h-6 w-6 text-red-600" />
              <CardTitle>Código inválido</CardTitle>
            </div>
            <CardDescription>
              No se proporcionó un código de verificación válido.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Verificando autenticidad...</CardTitle>
            <CardDescription>
              Por favor espere mientras verificamos el documento.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center gap-2">
              <XCircle className="h-6 w-6 text-red-600" />
              <CardTitle>Error de verificación</CardTitle>
            </div>
            <CardDescription>
              Ocurrió un error al verificar el documento. Por favor intente nuevamente.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!data.found) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-red-200">
          <CardHeader>
            <div className="flex items-center gap-2">
              <XCircle className="h-6 w-6 text-red-600" />
              <CardTitle>Documento no encontrado</CardTitle>
            </div>
            <CardDescription className="text-red-600">
              {data.message}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <Shield className="h-4 w-4" />
              <AlertTitle>Advertencia de seguridad</AlertTitle>
              <AlertDescription>
                Este código QR puede ser fraudulento. Si recibió este documento de una fuente oficial,
                por favor contacte directamente con la organización emisora para verificar su autenticidad.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Documento verificado exitosamente
  const { report } = data;
  
  if (!report) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full border-green-200 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b border-green-200">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <CardTitle className="text-2xl text-green-900">Documento Auténtico</CardTitle>
                <CardDescription className="text-green-700 mt-1">
                  Este documento ha sido verificado exitosamente y es auténtico según la NOM-151
                </CardDescription>
              </div>
            </div>
            <Badge variant="default" className="bg-green-600">
              Verificado
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="pt-6 space-y-6">
          {/* Información del documento */}
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
              <FileText className="h-5 w-5 text-slate-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-600">Tipo de documento</p>
                <p className="text-base font-semibold text-slate-900 mt-1">{report.titulo}</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
              <Calendar className="h-5 w-5 text-slate-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-600">Fecha de generación</p>
                <p className="text-base font-semibold text-slate-900 mt-1">
                  {new Date(report.generatedAt).toLocaleString('es-MX', {
                    dateStyle: 'long',
                    timeStyle: 'short',
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 bg-slate-50 rounded-lg">
              <User className="h-5 w-5 text-slate-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-600">Generado por</p>
                <p className="text-base font-semibold text-slate-900 mt-1">{report.generatedByName}</p>
                {report.generatedByEmail && (
                  <div className="flex items-center gap-2 mt-2">
                    <Mail className="h-4 w-4 text-slate-500" />
                    <p className="text-sm text-slate-600">{report.generatedByEmail}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Información de seguridad */}
          <Alert className="bg-green-50 border-green-200">
            <Shield className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-900">Certificación de autenticidad</AlertTitle>
            <AlertDescription className="text-green-700">
              Este documento fue generado por el Sistema de Gestión NOM-035 STPS 2018 y cuenta con
              trazabilidad completa. El código QR garantiza la autenticidad del documento según la
              normativa NOM-151 de gestión documental.
            </AlertDescription>
          </Alert>

          {/* Código de verificación */}
          <div className="pt-4 border-t border-slate-200">
            <p className="text-xs text-slate-500 text-center">
              Código de verificación: <span className="font-mono font-semibold">{uuid}</span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
