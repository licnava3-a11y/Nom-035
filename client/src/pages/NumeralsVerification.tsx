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
  Download,
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
  const generatePDF = trpc.compliance.generateNumeralsPDF.useMutation();

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

  const handleExportPDF = async () => {
    try {
      const result = await generatePDF.mutateAsync({ includeEvidence: true });
      
      if (result.success) {
        // Generar PDF en el cliente usando jsPDF
        const { jsPDF } = await import('jspdf');
        await import('jspdf-autotable');
        
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        
        let yPosition = 20;
        
        // Logo de la empresa (si existe)
        if (result.data.logo?.logoUrl) {
          try {
            // Cargar logo como imagen
            const logoImg = new Image();
            logoImg.crossOrigin = 'anonymous';
            await new Promise((resolve, reject) => {
              logoImg.onload = resolve;
              logoImg.onerror = reject;
              logoImg.src = result.data.logo.logoUrl;
            });
            
            // Agregar logo (esquina superior izquierda)
            const logoWidth = 30;
            const logoHeight = 15;
            doc.addImage(logoImg, 'PNG', 14, yPosition, logoWidth, logoHeight);
          } catch (error) {
            console.warn('No se pudo cargar el logo:', error);
          }
        }
        
        // Encabezado con datos de empresa
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('Reporte de Verificación de Cumplimiento', pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 8;
        
        doc.setFontSize(14);
        doc.text('Numerales 7 y 8 - NOM-035 STPS 2018', pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 10;
        
        // Datos de la empresa (si existen)
        if (result.data.company) {
          doc.setFontSize(10);
          doc.setFont('helvetica', 'bold');
          doc.text(result.data.company.razonSocial, pageWidth / 2, yPosition, { align: 'center' });
          yPosition += 5;
          
          doc.setFont('helvetica', 'normal');
          doc.text(`RFC: ${result.data.company.rfc}`, pageWidth / 2, yPosition, { align: 'center' });
          yPosition += 8;
        }
        
        // Información del reporte
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        const generatedDate = new Date(result.data.generatedAt).toLocaleString('es-MX');
        doc.text(`Fecha de generación: ${generatedDate}`, 14, yPosition);
        yPosition += 6;
        doc.text(`Generado por: ${result.data.generatedBy}`, 14, yPosition);
        yPosition += 4;
        
        // Línea separadora
        doc.setLineWidth(0.5);
        doc.line(14, yPosition, pageWidth - 14, yPosition);
        yPosition += 5;
        
        // Tabla de resultados
        const tableData = result.data.requirements.map((req: any) => [
          req.numeral,
          req.title,
          req.isCompliant ? '✓ Cumple' : '✗ No Cumple',
          req.verifiedAt ? new Date(req.verifiedAt).toLocaleDateString('es-MX') : 'Sin verificar',
        ]);
        
        (doc as any).autoTable({
          startY: yPosition,
          head: [['Numeral', 'Requisito', 'Estado', 'Fecha Verificación']],
          body: tableData,
          theme: 'grid',
          headStyles: { fillColor: [41, 128, 185], textColor: 255, fontStyle: 'bold' },
          styles: { fontSize: 9, cellPadding: 3 },
          columnStyles: {
            0: { cellWidth: 20 },
            1: { cellWidth: 80 },
            2: { cellWidth: 35 },
            3: { cellWidth: 45 },
          },
        });
        
        // Hallazgos detallados
        yPosition = (doc as any).lastAutoTable.finalY + 10;
        
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Hallazgos y Observaciones', 14, yPosition);
        yPosition += 8;
        
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        
        result.data.requirements.forEach((req: any) => {
          // Verificar si necesitamos nueva página
          if (yPosition > pageHeight - 40) {
            doc.addPage();
            yPosition = 20;
          }
          
          doc.setFont('helvetica', 'bold');
          doc.text(`${req.numeral} - ${req.title}`, 14, yPosition);
          yPosition += 5;
          
          doc.setFont('helvetica', 'normal');
          const findings = doc.splitTextToSize(req.findings, pageWidth - 28);
          doc.text(findings, 14, yPosition);
          yPosition += (findings.length * 5) + 5;
        });
        
        // Pie de página en todas las páginas
        const totalPages = doc.getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
          doc.setPage(i);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'italic');
          doc.text(
            `Página ${i} de ${totalPages}`,
            pageWidth / 2,
            pageHeight - 10,
            { align: 'center' }
          );
          doc.text(
            'Documento generado automáticamente por el Sistema de Gestión NOM-035',
            pageWidth / 2,
            pageHeight - 6,
            { align: 'center' }
          );
        }
        
        // Descargar PDF
        const fileName = `Verificacion_Numerales_${new Date().toISOString().split('T')[0]}.pdf`;
        doc.save(fileName);
        
        toast.success('PDF generado exitosamente', {
          description: `El reporte ha sido descargado como ${fileName}`,
        });
      }
    } catch (error) {
      console.error('Error al generar PDF:', error);
      toast.error('Error al generar PDF', {
        description: 'Ocurrió un error al generar el reporte en PDF',
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
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-8 w-8 text-blue-600" />
            Verificación de Numerales 7 y 8
          </h1>
          <p className="text-muted-foreground mt-2">
            Verificación automática de cumplimiento de obligaciones patronales según NOM-035 STPS 2018
          </p>
        </div>
        <Button
          onClick={handleExportPDF}
          disabled={generatePDF.isPending}
          variant="outline"
        >
          {generatePDF.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generando...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              Exportar a PDF
            </>
          )}
        </Button>
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
