import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Download, Eye, Filter, X } from "lucide-react";
import { toast } from "sonner";

export default function ReportsHistory() {
  const [filters, setFilters] = useState({
    tipo: "",
    startDate: "",
    endDate: "",
  });
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const { data, isLoading, refetch } = trpc.compliance.listReports.useQuery({
    tipo: filters.tipo || undefined,
    startDate: filters.startDate || undefined,
    endDate: filters.endDate || undefined,
    limit: pageSize,
    offset: page * pageSize,
  });

  const handleClearFilters = () => {
    setFilters({ tipo: "", startDate: "", endDate: "" });
    setPage(0);
  };

  const handleRedownload = async (uuid: string, folio: string) => {
    try {
      // Obtener datos del reporte
      const reportData = await trpc.compliance.getReportData.useQuery({ uuid }).refetch();
      
      if (!reportData.data) {
        toast.error("No se pudieron obtener los datos del reporte");
        return;
      }

      // Regenerar PDF usando los datos guardados
      const { jsPDF } = await import('jspdf');
      await import('jspdf-autotable');
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      let yPosition = 20;
      
      // Código QR
      if (reportData.data.uuid) {
        try {
          const QRCode = (await import('qrcode')).default;
          const verificationUrl = `${window.location.origin}/verify/${reportData.data.uuid}`;
          const qrDataUrl = await QRCode.toDataURL(verificationUrl, {
            width: 200,
            margin: 1,
          });
          
          const qrSize = 25;
          doc.addImage(qrDataUrl, 'PNG', pageWidth - qrSize - 14, yPosition, qrSize, qrSize);
          
          doc.setFontSize(6);
          doc.setFont('helvetica', 'normal');
          doc.text('Verificar', pageWidth - qrSize / 2 - 14, yPosition + qrSize + 3, { align: 'center' });
          doc.text('autenticidad', pageWidth - qrSize / 2 - 14, yPosition + qrSize + 6, { align: 'center' });
        } catch (error) {
          console.warn('No se pudo generar el código QR:', error);
        }
      }
      
      // Logo (si existe en los datos)
      const data = reportData.data.data as any;
      if (data?.logo?.logoUrl) {
        try {
          const logoImg = new Image();
          logoImg.crossOrigin = 'anonymous';
          await new Promise((resolve, reject) => {
            logoImg.onload = resolve;
            logoImg.onerror = reject;
            logoImg.src = data.logo.logoUrl;
          });
          
          const logoWidth = 30;
          const logoHeight = 15;
          doc.addImage(logoImg, 'PNG', 14, yPosition, logoWidth, logoHeight);
        } catch (error) {
          console.warn('No se pudo cargar el logo:', error);
        }
      }
      
      // Encabezado
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text(reportData.data.titulo, pageWidth / 2, yPosition, { align: 'center' });
      yPosition += 10;
      
      // Datos de empresa
      if (data?.company) {
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(data.company.razonSocial, pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 5;
        
        doc.setFont('helvetica', 'normal');
        doc.text(`RFC: ${data.company.rfc}`, pageWidth / 2, yPosition, { align: 'center' });
        yPosition += 8;
      }
      
      // Información del reporte
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      // Folio
      if (reportData.data.folio) {
        doc.setFont('helvetica', 'bold');
        doc.text(`Folio: ${reportData.data.folio}`, 14, yPosition);
        yPosition += 6;
        doc.setFont('helvetica', 'normal');
      }
      
      const generatedDate = new Date(reportData.data.generatedAt).toLocaleString('es-MX');
      doc.text(`Fecha de generación: ${generatedDate}`, 14, yPosition);
      yPosition += 6;
      doc.text(`Generado por: ${reportData.data.generatedByName}`, 14, yPosition);
      yPosition += 4;
      
      // Línea separadora
      doc.setLineWidth(0.5);
      doc.line(14, yPosition, pageWidth - 14, yPosition);
      yPosition += 5;
      
      // Nota de re-descarga
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(100, 100, 100);
      doc.text(`Re-descargado el: ${new Date().toLocaleString('es-MX')}`, 14, yPosition);
      doc.setTextColor(0, 0, 0);
      yPosition += 8;
      
      // Contenido del reporte (simplificado)
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Resumen del Reporte', 14, yPosition);
      yPosition += 8;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Este es un reporte re-descargado desde el historial.', 14, yPosition);
      yPosition += 6;
      doc.text('Los datos originales se conservan tal como fueron generados.', 14, yPosition);
      
      // Pie de página
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'italic');
        
        // Folio en esquina inferior izquierda
        if (reportData.data.folio) {
          doc.setFont('helvetica', 'bold');
          doc.text(reportData.data.folio, 14, pageHeight - 10);
          doc.setFont('helvetica', 'italic');
        }
        
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
      
      // Descargar
      const fileName = `${folio || 'Reporte'}_${new Date().toISOString().split('T')[0]}.pdf`;
      doc.save(fileName);
      
      toast.success("Reporte descargado exitosamente");
    } catch (error: any) {
      console.error('Error al re-descargar:', error);
      toast.error(error.message || "Error al re-descargar el reporte");
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Cargando historial...</CardTitle>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Historial de Reportes</h1>
          <p className="text-muted-foreground mt-1">
            Consulta y re-descarga reportes de cumplimiento generados
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo de Reporte</Label>
              <Select
                value={filters.tipo}
                onValueChange={(value) => {
                  setFilters({ ...filters, tipo: value });
                  setPage(0);
                }}
              >
                <SelectTrigger id="tipo">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="verificacion_numerales">Verificación de Numerales</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Fecha Inicio</Label>
              <Input
                id="startDate"
                type="date"
                value={filters.startDate}
                onChange={(e) => {
                  setFilters({ ...filters, startDate: e.target.value });
                  setPage(0);
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">Fecha Fin</Label>
              <Input
                id="endDate"
                type="date"
                value={filters.endDate}
                onChange={(e) => {
                  setFilters({ ...filters, endDate: e.target.value });
                  setPage(0);
                }}
              />
            </div>

            <div className="flex items-end">
              <Button variant="outline" onClick={handleClearFilters} className="w-full">
                <X className="h-4 w-4 mr-2" />
                Limpiar Filtros
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de reportes */}
      <Card>
        <CardHeader>
          <CardTitle>Reportes Generados</CardTitle>
          <CardDescription>
            {data?.total || 0} reportes encontrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!data || data.reports.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No se encontraron reportes</p>
              <p className="text-sm mt-2">Genera un nuevo reporte o ajusta los filtros</p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Folio</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Fecha de Generación</TableHead>
                    <TableHead>Generado Por</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-mono font-semibold">
                        {report.folio || '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {report.tipo === 'verificacion_numerales' ? 'Verificación de Numerales' : report.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(report.generatedAt).toLocaleString('es-MX')}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{report.generatedByName}</p>
                          {report.generatedByEmail && (
                            <p className="text-sm text-muted-foreground">{report.generatedByEmail}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => window.open(`/verify/${report.uuid}`, '_blank')}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRedownload(report.uuid, report.folio || 'Reporte')}
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Paginación */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Mostrando {page * pageSize + 1} - {Math.min((page + 1) * pageSize, data.total)} de {data.total}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page - 1)}
                    disabled={page === 0}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={!data.hasMore}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
