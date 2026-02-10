import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  Shield,
  PlayCircle,
  Loader2,
} from "lucide-react";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function NumeralsVerification() {
  const [verificationResults, setVerificationResults] = useState<{
    numeral71?: any;
    numeral72?: any;
    numeral82?: any;
  }>({});

  const { data: requirements } = trpc.compliance.getRequirements.useQuery();
  const verifyNumeral71 = trpc.compliance.verifyNumeral71.useMutation();
  const verifyNumeral72 = trpc.compliance.verifyNumeral72.useMutation();
  const verifyNumeral82 = trpc.compliance.verifyNumeral82.useMutation();

  const handleVerify71 = async () => {
    try {
      const result = await verifyNumeral71.mutateAsync({});
      setVerificationResults((prev) => ({ ...prev, numeral71: result }));
      toast(result.hasPolicy ? "✅ Numeral 7.1 Cumple" : "❌ Numeral 7.1 No Cumple", {
        description: result.findings,
      });
    } catch (error) {
      toast.error("Error en verificación", {
        description: "No se pudo verificar el Numeral 7.1",
      });
    }
  };

  const handleVerify72 = async () => {
    try {
      const result = await verifyNumeral72.mutateAsync({});
      setVerificationResults((prev) => ({ ...prev, numeral72: result }));
      toast(result.hasSurveys ? "✅ Numeral 7.2 Cumple" : "❌ Numeral 7.2 No Cumple", {
        description: result.findings,
      });
    } catch (error) {
      toast.error("Error en verificación", {
        description: "No se pudo verificar el Numeral 7.2",
      });
    }
  };

  const handleVerify82 = async () => {
    try {
      const result = await verifyNumeral82.mutateAsync({});
      setVerificationResults((prev) => ({ ...prev, numeral82: result }));
      const status = result.status === "compliant" ? "✅" : result.status === "partial" ? "⚠️" : "❌";
      toast(`${status} Numeral 8.2 - ${result.status === "compliant" ? "Cumple" : result.status === "partial" ? "Cumplimiento Parcial" : "No Cumple"}`, {
        description: result.findings,
      });
    } catch (error) {
      toast.error("Error en verificación", {
        description: "No se pudo verificar el Numeral 8.2",
      });
    }
  };

  const numeral71 = requirements?.find((r) => r.numeral === "7.1");
  const numeral72 = requirements?.find((r) => r.numeral === "7.2");
  const numeral82 = requirements?.find((r) => r.numeral === "8.2");

  return (
    <div className="container py-8 space-y-6">
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink href="/compliance">Cumplimiento</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Verificación Numerales 7 y 8</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Shield className="h-8 w-8 text-blue-600" />
          Verificación de Numerales 7 y 8
        </h1>
        <p className="text-muted-foreground mt-2">
          Verificación automática de cumplimiento de obligaciones patronales según NOM-035 STPS 2018
        </p>
      </div>

      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Información Importante</AlertTitle>
        <AlertDescription>
          Esta herramienta verifica automáticamente el cumplimiento de los Numerales 7 y 8 de la NOM-035.
          Los resultados se basan en la información registrada en el sistema y deben ser complementados
          con evidencia documental para auditorías oficiales.
        </AlertDescription>
      </Alert>

      {/* Numeral 7.1 - Política de Prevención */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Numeral 7.1 - Política de Prevención de Riesgos Psicosociales
              </CardTitle>
              <CardDescription className="mt-2">
                {numeral71?.description || "Establecer, implantar, mantener y difundir en el centro de trabajo una política de prevención de riesgos psicosociales que contemple: la prevención de los factores de riesgo psicosocial; la prevención de la violencia laboral, y la promoción de un entorno organizacional favorable."}
              </CardDescription>
            </div>
            <Button
              onClick={handleVerify71}
              disabled={verifyNumeral71.isPending}
              size="sm"
            >
              {verifyNumeral71.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Verificar
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        {verificationResults.numeral71 && (
          <CardContent>
            <div className="flex items-start gap-4 p-4 border rounded-lg bg-muted/50">
              {verificationResults.numeral71.hasPolicy ? (
                <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
              ) : (
                <XCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
              )}
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant={verificationResults.numeral71.hasPolicy ? "default" : "destructive"}>
                    {verificationResults.numeral71.status === "compliant" ? "Cumple" : "No Cumple"}
                  </Badge>
                </div>
                <p className="text-sm">
                  <strong>Hallazgos:</strong> {verificationResults.numeral71.findings}
                </p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Numeral 7.2 - Identificación y Análisis */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Numeral 7.2 - Identificación y Análisis de Factores de Riesgo
              </CardTitle>
              <CardDescription className="mt-2">
                {numeral72?.description || "Identificar y analizar los factores de riesgo psicosocial, de acuerdo con lo establecido en los numerales 7.2 y 7.3 de esta Norma, según corresponda al número de trabajadores del centro de trabajo."}
              </CardDescription>
            </div>
            <Button
              onClick={handleVerify72}
              disabled={verifyNumeral72.isPending}
              size="sm"
            >
              {verifyNumeral72.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Verificar
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        {verificationResults.numeral72 && (
          <CardContent>
            <div className="flex items-start gap-4 p-4 border rounded-lg bg-muted/50">
              {verificationResults.numeral72.hasSurveys ? (
                <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
              ) : (
                <XCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
              )}
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge variant={verificationResults.numeral72.hasSurveys ? "default" : "destructive"}>
                    {verificationResults.numeral72.status === "compliant" ? "Cumple" : "No Cumple"}
                  </Badge>
                  {verificationResults.numeral72.totalEvaluations > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {verificationResults.numeral72.totalEvaluations} evaluaciones realizadas
                    </span>
                  )}
                </div>
                <p className="text-sm">
                  <strong>Hallazgos:</strong> {verificationResults.numeral72.findings}
                </p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Numeral 8.2 - Medidas de Control */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Numeral 8.2 - Implementación de Medidas de Control
              </CardTitle>
              <CardDescription className="mt-2">
                {numeral82?.description || "Adoptar las medidas para prevenir y controlar los factores de riesgo psicosocial, promover el entorno organizacional favorable, así como para atender las prácticas opuestas al entorno organizacional favorable y los actos de violencia laboral."}
              </CardDescription>
            </div>
            <Button
              onClick={handleVerify82}
              disabled={verifyNumeral82.isPending}
              size="sm"
            >
              {verifyNumeral82.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <PlayCircle className="h-4 w-4 mr-2" />
                  Verificar
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        {verificationResults.numeral82 && (
          <CardContent>
            <div className="flex items-start gap-4 p-4 border rounded-lg bg-muted/50">
              {verificationResults.numeral82.status === "compliant" ? (
                <CheckCircle2 className="h-6 w-6 text-green-600 flex-shrink-0" />
              ) : verificationResults.numeral82.status === "partial" ? (
                <AlertTriangle className="h-6 w-6 text-yellow-600 flex-shrink-0" />
              ) : (
                <XCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
              )}
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={
                      verificationResults.numeral82.status === "compliant"
                        ? "default"
                        : verificationResults.numeral82.status === "partial"
                        ? "secondary"
                        : "destructive"
                    }
                  >
                    {verificationResults.numeral82.status === "compliant"
                      ? "Cumple"
                      : verificationResults.numeral82.status === "partial"
                      ? "Cumplimiento Parcial"
                      : "No Cumple"}
                  </Badge>
                  {verificationResults.numeral82.totalActions > 0 && (
                    <span className="text-sm text-muted-foreground">
                      {verificationResults.numeral82.completedActions}/{verificationResults.numeral82.totalActions} acciones completadas ({verificationResults.numeral82.complianceRate.toFixed(1)}%)
                    </span>
                  )}
                </div>
                <p className="text-sm">
                  <strong>Hallazgos:</strong> {verificationResults.numeral82.findings}
                </p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Información Adicional */}
      <Card>
        <CardHeader>
          <CardTitle>Información sobre la Verificación</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <h4 className="font-medium mb-2">Criterios de Verificación</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li><strong>Numeral 7.1:</strong> Verifica la existencia de una política de prevención activa en el sistema</li>
              <li><strong>Numeral 7.2:</strong> Verifica que se hayan aplicado las Guías de Referencia I, II o III</li>
              <li><strong>Numeral 8.2:</strong> Verifica la implementación de acciones correctivas (≥80% completadas = Cumple, ≥50% = Parcial, &lt;50% = No Cumple)</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">Recomendaciones</h4>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>Ejecute las verificaciones periódicamente para mantener el cumplimiento actualizado</li>
              <li>Documente todas las evidencias de cumplimiento en la carpeta de evidencias NOM-035</li>
              <li>Revise el dashboard de cumplimiento para una visión integral del estado normativo</li>
              <li>Genere reportes de cumplimiento para auditorías internas y externas</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
