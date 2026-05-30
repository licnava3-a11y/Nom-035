import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Download, FileText, Code, Calendar, Eye, CheckCircle, AlertCircle, Loader2, Copy } from "lucide-react";

export default function DC1Generator() {
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [loadingDC1, setLoadingDC1] = useState(false);
  const [loadingSIRCE, setLoadingSIRCE] = useState(false);
  const [loadingBatch, setLoadingBatch] = useState(false);
  const [previewDC1, setPreviewDC1] = useState<string | null>(null);
  const [previewSIRCE, setPreviewSIRCE] = useState<string | null>(null);
  const [showPreviewDC1, setShowPreviewDC1] = useState(false);
  const [showPreviewSIRCE, setShowPreviewSIRCE] = useState(false);
  const [lastGeneratedDC1, setLastGeneratedDC1] = useState<any>(null);
  const [lastGeneratedSIRCE, setLastGeneratedSIRCE] = useState<any>(null);

  const employeesQuery = trpc.employees.list.useQuery({ pageSize: 100 });
  const coursesQuery = trpc.training.listCourses.useQuery();
  const generateDC1Mutation = trpc.dc1Generator.generateDC1.useMutation();
  const generateSIRCEMutation = trpc.dc1Generator.generateSIRCEXml.useMutation();
  const exportBatchMutation = trpc.dc1Generator.exportSIRCEByPeriod.useQuery(
    { startDate, endDate },
    { enabled: !!startDate && !!endDate }
  );

  const handleGenerateDC1 = async () => {
    if (!selectedEmployee || !selectedCourse) {
      toast.error("Selecciona empleado y curso");
      return;
    }

    setLoadingDC1(true);
    try {
      const result = await generateDC1Mutation.mutateAsync({
        employeeId: parseInt(selectedEmployee),
        courseId: parseInt(selectedCourse),
      });

      setLastGeneratedDC1(result);
      setPreviewDC1(result.html);

      const blob = new Blob([result.html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("DC-1 generado y descargado exitosamente");
    } catch (err) {
      toast.error("Error al generar DC-1");
    } finally {
      setLoadingDC1(false);
    }
  };

  const handleGenerateSIRCE = async () => {
    if (!selectedEmployee || !selectedCourse) {
      toast.error("Selecciona empleado y curso");
      return;
    }

    setLoadingSIRCE(true);
    try {
      const result = await generateSIRCEMutation.mutateAsync({
        employeeId: parseInt(selectedEmployee),
        courseId: parseInt(selectedCourse),
      });

      setLastGeneratedSIRCE(result);
      setPreviewSIRCE(result.xml);

      const blob = new Blob([result.xml], { type: "application/xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("SIRCE XML generado y descargado exitosamente");
    } catch (err) {
      toast.error("Error al generar SIRCE XML");
    } finally {
      setLoadingSIRCE(false);
    }
  };

  const handleExportBatch = async () => {
    if (!startDate || !endDate) {
      toast.error("Selecciona rango de fechas");
      return;
    }

    setLoadingBatch(true);
    try {
      const result = exportBatchMutation.data;
      if (result) {
        const blob = new Blob([result.xml], { type: "application/xml" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.filename;
        a.click();
        URL.revokeObjectURL(url);

        toast.success(`${result.totalRecords} registros exportados`);
      }
    } catch (err) {
      toast.error("Error al exportar lote");
    } finally {
      setLoadingBatch(false);
    }
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${filename} descargado`);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado al portapapeles");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Generador DC-1 y SIRCE XML</h1>
        <p className="text-muted-foreground mt-2">
          Genera Constancias de Habilidades Laborales (DC-1) y registros SIRCE para carga al sistema STPS
        </p>
      </div>

      {/* Generador Individual */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generador Individual
          </CardTitle>
          <CardDescription>Genera DC-1 o SIRCE XML para un empleado específico</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Empleado</label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona empleado" />
                </SelectTrigger>
                <SelectContent>
                  {(employeesQuery.data?.data || []).map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>
                      {emp.firstName} {emp.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Curso</label>
              <Select value={selectedCourse} onValueChange={setSelectedCourse}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona curso" />
                </SelectTrigger>
                <SelectContent>
                  {(coursesQuery.data || []).map((course: any) => (
                    <SelectItem key={course.id} value={course.id.toString()}>
                      {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Button
              onClick={handleGenerateDC1}
              disabled={loadingDC1 || !selectedEmployee || !selectedCourse}
              className="flex-1 min-w-[200px]"
            >
              {loadingDC1 ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Generar DC-1 (HTML)
                </>
              )}
            </Button>
            <Button
              onClick={handleGenerateSIRCE}
              disabled={loadingSIRCE || !selectedEmployee || !selectedCourse}
              variant="outline"
              className="flex-1 min-w-[200px]"
            >
              {loadingSIRCE ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <Code className="h-4 w-4 mr-2" />
                  Generar SIRCE XML
                </>
              )}
            </Button>
          </div>

          {/* Botones de vista previa y descarga adicional */}
          {(lastGeneratedDC1 || lastGeneratedSIRCE) && (
            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span className="font-medium text-green-900">Archivos generados exitosamente</span>
              </div>
              <div className="flex gap-2 flex-wrap">
                {lastGeneratedDC1 && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPreviewDC1(true)}
                      className="gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      Ver DC-1
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadFile(lastGeneratedDC1.html, lastGeneratedDC1.filename, "text/html")}
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Descargar DC-1
                    </Button>
                  </>
                )}
                {lastGeneratedSIRCE && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowPreviewSIRCE(true)}
                      className="gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      Ver SIRCE XML
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadFile(lastGeneratedSIRCE.xml, lastGeneratedSIRCE.filename, "application/xml")}
                      className="gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Descargar SIRCE XML
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(lastGeneratedSIRCE.xml)}
                      className="gap-2"
                    >
                      <Copy className="h-4 w-4" />
                      Copiar XML
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exportación Masiva */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Exportación Masiva por Período
          </CardTitle>
          <CardDescription>Exporta todos los registros completados en un rango de fechas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Fecha Inicio</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Fecha Fin</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              />
            </div>
          </div>

          {exportBatchMutation.data && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <p className="text-sm text-blue-900">
                  <strong>{exportBatchMutation.data.totalRecords}</strong> registros encontrados en el período
                </p>
              </div>
            </div>
          )}

          {exportBatchMutation.isLoading && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 text-yellow-600 animate-spin" />
                <p className="text-sm text-yellow-900">Buscando registros...</p>
              </div>
            </div>
          )}

          <Button
            onClick={handleExportBatch}
            disabled={loadingBatch || !startDate || !endDate || !exportBatchMutation.data}
            className="w-full"
          >
            {loadingBatch ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Exportando...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Exportar SIRCE XML Masivo
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Información */}
      <Card>
        <CardHeader>
          <CardTitle>Información</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Badge variant="outline">DC-1</Badge>
              Constancia de Habilidades Laborales
            </h4>
            <p className="text-sm text-muted-foreground">
              Documento HTML que certifica la participación del empleado en el curso y su porcentaje de avance.
              Incluye datos del trabajador, curso, instructor y fecha de conclusión. Descargable directamente desde la interfaz.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-2 flex items-center gap-2">
              <Badge variant="outline">SIRCE</Badge>
              XML para Sistema STPS
            </h4>
            <p className="text-sm text-muted-foreground">
              Formato oficial STPS (Sistema de Información de Registros de Capacitación Empresarial) para carga
              al sistema. Contiene estructura XML validada para integración con sistemas gubernamentales. Soporta
              exportación individual y masiva por período.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Diálogo de vista previa DC-1 */}
      <Dialog open={showPreviewDC1} onOpenChange={setShowPreviewDC1}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Vista Previa DC-1</DialogTitle>
            <DialogDescription>
              {lastGeneratedDC1?.filename}
            </DialogDescription>
          </DialogHeader>
          {previewDC1 && (
            <div className="border rounded-lg overflow-auto bg-white p-4">
              <iframe
                srcDoc={previewDC1}
                className="w-full h-[600px] border rounded"
                title="Vista previa DC-1"
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Diálogo de vista previa SIRCE XML */}
      <Dialog open={showPreviewSIRCE} onOpenChange={setShowPreviewSIRCE}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>Vista Previa SIRCE XML</DialogTitle>
            <DialogDescription>
              {lastGeneratedSIRCE?.filename}
            </DialogDescription>
          </DialogHeader>
          {previewSIRCE && (
            <div className="border rounded-lg overflow-auto bg-gray-50 p-4">
              <pre className="text-xs whitespace-pre-wrap break-words font-mono">
                {previewSIRCE}
              </pre>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
