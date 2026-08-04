/**
 * Página de Carpeta de Evidencias NMX-R-025-SCFI-2015
 * Muestra evidencias de cumplimiento de Igualdad Laboral y No Discriminación organizadas por ejes temáticos
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import { Button } from "@/components/ui/button";
import { LoadingButton } from "@/components/ui/loading-button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, CheckCircle2, AlertCircle, Clock, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function NMX025EvidencesFolder() {
  const [companySize, setCompanySize] = useState<'small' | 'medium' | 'large'>('large');
  const [isExporting, setIsExporting] = useState(false);

  // Query para obtener nombre de la empresa desde configuración
  const { data: companyData } = trpc.company.getGeneralData.useQuery();
  const companyName = (companyData as any)?.razonSocial ?? 'Mi Empresa';

  // Query para obtener evidencias
  const { data: evidences, isLoading } = trpc.nmx025EvidencesFolder.getEvidences.useQuery({
    companySize,
  });

  // Mutation para exportar PDF
  const exportPDF = trpc.nmx025EvidencesFolder.generatePDF.useMutation({
    onSuccess: (data) => {
      // Descargar PDF
      const link = document.createElement('a');
      link.href = `data:application/pdf;base64,${data.pdf}`;
      link.download = data.fileName;
      link.click();
      
      toast.success("Carpeta exportada", {
        description: "La carpeta de evidencias NMX-025 se ha generado exitosamente",
      });
      setIsExporting(false);
    },
    onError: () => {
      toast.error("Error", {
        description: "No se pudo generar la carpeta de evidencias",
      });
      setIsExporting(false);
    },
  });

  const handleExportPDF = () => {
    setIsExporting(true);
    exportPDF.mutate({ 
      companySize,
      companyName,
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'partial':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'pending':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      case 'active':
        return <CheckCircle2 className="h-5 w-5 text-blue-600" />;
      default:
        return <FileText className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      complete: "default",
      partial: "secondary",
      pending: "destructive",
      active: "default",
    };
    
    const labels: Record<string, string> = {
      complete: "Completo",
      partial: "Parcial",
      pending: "Pendiente",
      active: "Activo",
    };

    return (
      <Badge variant={variants[status] || "outline"}>
        {labels[status] || status}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Cargando carpeta de evidencias NMX-025...</p>
        </div>
      </div>
    );
  }

  if (!evidences) {
    return (
      <div className="container mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Error</CardTitle>
            <CardDescription>No se pudieron cargar las evidencias</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Calcular progreso general
  const ejesArray = Object.values(evidences).filter(eje => eje.required);
  const completedEjes = ejesArray.filter(eje => eje.status === 'complete').length;
  const progressPercentage = Math.round((completedEjes / ejesArray.length) * 100);

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Carpeta de Evidencias NMX-025</h1>
          <p className="text-muted-foreground mt-2">
            Norma Mexicana de Igualdad Laboral y No Discriminación
          </p>
        </div>
        <Button 
          onClick={handleExportPDF} 
          disabled={isExporting}
          size="lg"
        >
          <Download className="mr-2 h-4 w-4" />
          {isExporting ? "Generando..." : "Exportar PDF"}
        </Button>
      </div>

      {/* Selector de tamaño de empresa */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración</CardTitle>
          <CardDescription>
            Selecciona el tamaño de tu empresa para ver los requisitos aplicables
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Tamaño de empresa:</label>
            <Select value={companySize} onValueChange={(value: 'small' | 'medium' | 'large') => setCompanySize(value)}>
              <SelectTrigger className="w-[280px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="small">Pequeña (hasta 15 trabajadores)</SelectItem>
                <SelectItem value="medium">Mediana (16-50 trabajadores)</SelectItem>
                <SelectItem value="large">Grande (más de 50 trabajadores)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Indicador de progreso */}
      <Card>
        <CardHeader>
          <CardTitle>Progreso de Cumplimiento</CardTitle>
          <CardDescription>
            {completedEjes} de {ejesArray.length} ejes completados ({progressPercentage}%)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div 
              className="bg-green-600 h-4 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Acordeones por eje temático */}
      <Card>
        <CardHeader>
          <CardTitle>Evidencias por Eje Temático</CardTitle>
          <CardDescription>
            Haz clic en cada eje para ver las evidencias recopiladas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full">
            {Object.entries(evidences).map(([key, eje]) => {
              if (!eje.required) return null;

              return (
                <AccordionItem key={key} value={key}>
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(eje.status)}
                        <div className="text-left">
                          <p className="font-semibold">{eje.title}</p>
                          <p className="text-sm text-muted-foreground">{eje.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(eje.status)}
                        <Badge variant="outline">
                          {eje.evidences.length} evidencia{eje.evidences.length !== 1 ? 's' : ''}
                        </Badge>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-4 pt-4">
                      {eje.evidences.length > 0 ? (
                        eje.evidences.map((evidence, idx) => (
                          <div 
                            key={idx} 
                            className="flex items-start gap-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                          >
                            <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div className="flex-1 space-y-1">
                              <div className="flex items-start justify-between">
                                <p className="font-medium">{evidence.name}</p>
                                {getStatusBadge(evidence.status)}
                              </div>
                              <p className="text-sm text-muted-foreground">{evidence.description}</p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span>Tipo: {evidence.type}</span>
                                {evidence.date && (
                                  <span>Fecha: {new Date(evidence.date).toLocaleDateString('es-MX')}</span>
                                )}
                              </div>
                              {evidence.fileUrl && (
                                <Button 
                                  variant="link" 
                                  size="sm" 
                                  className="h-auto p-0 text-xs"
                                  onClick={() => window.open(evidence.fileUrl, '_blank')}
                                >
                                  <ExternalLink className="h-3 w-3 mr-1" />
                                  Ver archivo: {evidence.fileName}
                                </Button>
                              )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground italic p-4">
                          No hay evidencias registradas para este eje
                        </p>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>

      {/* Información adicional */}
      <Card>
        <CardHeader>
          <CardTitle>Información</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            • La NMX-R-025-SCFI-2015 es una norma voluntaria que certifica prácticas de igualdad laboral y no discriminación.
          </p>
          <p>
            • Los requisitos varían según el tamaño de la empresa (pequeña, mediana o grande).
          </p>
          <p>
            • Esta carpeta recopila automáticamente evidencias del sistema y permite cargar documentos adicionales.
          </p>
          <p>
            • El PDF exportado puede utilizarse como soporte para auditorías de certificación.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
