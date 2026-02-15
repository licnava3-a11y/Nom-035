/**
 * Página de Carpeta de Evidencias STPS
 * Muestra evidencias de cumplimiento NOM-035 organizadas por numerales
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { toast } from "sonner";

export default function EvidencesFolder() {

  const [companySize, setCompanySize] = useState<'small' | 'medium' | 'large'>('large');
  const [isExporting, setIsExporting] = useState(false);

  // Query para obtener evidencias
  const { data: evidences, isLoading } = trpc.evidencesFolder.getEvidences.useQuery({
    companySize,
  });

  // Mutation para exportar PDF (pendiente implementación)
  const exportPDF = trpc.evidencesFolder.generatePDF.useMutation({
    onSuccess: (data) => {
      // Descargar PDF
      const link = document.createElement('a');
      link.href = `data:application/pdf;base64,${data.pdfBase64}`;
      link.download = `carpeta-evidencias-nom035-${new Date().toISOString().split('T')[0]}.pdf`;
      link.click();
      
      toast({
        title: "Carpeta exportada",
        description: "La carpeta de evidencias se ha generado exitosamente",
      });
      setIsExporting(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "No se pudo generar la carpeta de evidencias",
        variant: "destructive",
      });
      setIsExporting(false);
    },
  });

  const handleExportPDF = () => {
    setIsExporting(true);
    exportPDF.mutate({ companySize });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />;
      case 'partial':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'pending':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <FileText className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      complete: "default",
      partial: "secondary",
      pending: "destructive",
    };
    
    const labels: Record<string, string> = {
      complete: "Completo",
      partial: "Parcial",
      pending: "Pendiente",
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
          <p className="text-muted-foreground">Cargando carpeta de evidencias...</p>
        </div>
      </div>
    );
  }

  if (!evidences) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">No se pudo cargar la carpeta de evidencias</p>
        </div>
      </div>
    );
  }

  // Extraer información de la empresa
  const companyInfo = evidences.companyInfo;
  
  // Extraer numerales (excluir companyInfo)
  const numerals = Object.entries(evidences).filter(([key]) => key !== 'companyInfo');

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Carpeta de Evidencias STPS</h1>
          <p className="text-muted-foreground mt-1">
            Documentación de cumplimiento NOM-035-STPS-2018
          </p>
        </div>
        <Button onClick={handleExportPDF} disabled={isExporting}>
          <Download className="mr-2 h-4 w-4" />
          {isExporting ? "Generando PDF..." : "Exportar PDF"}
        </Button>
      </div>

      {/* Información de la empresa */}
      <Card>
        <CardHeader>
          <CardTitle>Información de la Empresa</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Total de Empleados</p>
            <p className="text-2xl font-bold">{companyInfo.totalEmployees}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Tamaño de Empresa</p>
            <p className="text-2xl font-bold capitalize">{companyInfo.companySize}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Fecha de Generación</p>
            <p className="text-2xl font-bold">
              {new Date(companyInfo.generatedAt).toLocaleDateString('es-MX')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Selector de tamaño de empresa */}
      <Card>
        <CardHeader>
          <CardTitle>Filtrar por Tamaño de Empresa</CardTitle>
          <CardDescription>
            Selecciona el tamaño de empresa para ver los requisitos aplicables
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={companySize} onValueChange={(value: 'small' | 'medium' | 'large') => setCompanySize(value)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecciona tamaño de empresa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="small">Pequeña (hasta 15 trabajadores)</SelectItem>
              <SelectItem value="medium">Mediana (16-50 trabajadores)</SelectItem>
              <SelectItem value="large">Grande (más de 50 trabajadores)</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Acordeones de numerales */}
      <Card>
        <CardHeader>
          <CardTitle>Evidencias por Numeral NOM-035</CardTitle>
          <CardDescription>
            Documentación organizada según los numerales de la norma
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="w-full">
            {numerals.map(([key, numeral]: [string, any]) => (
              <AccordionItem key={key} value={key}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(numeral.status)}
                      <div className="text-left">
                        <p className="font-semibold">{key} - {numeral.title}</p>
                        <p className="text-sm text-muted-foreground">{numeral.description}</p>
                      </div>
                    </div>
                    {getStatusBadge(numeral.status)}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pt-4">
                    {numeral.evidences && numeral.evidences.length > 0 ? (
                      numeral.evidences.map((evidence: any, index: number) => (
                        <div
                          key={index}
                          className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <FileText className="h-5 w-5 text-primary mt-0.5" />
                          <div className="flex-1">
                            <p className="font-medium">{evidence.name}</p>
                            <p className="text-sm text-muted-foreground">{evidence.description}</p>
                            <div className="flex items-center gap-2 mt-2">
                              <Badge variant="outline" className="text-xs">
                                {evidence.type}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(evidence.date).toLocaleDateString('es-MX')}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <AlertCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No hay evidencias registradas para este numeral</p>
                        <p className="text-sm mt-1">Sube documentos manualmente o genera evidencias automáticas</p>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
