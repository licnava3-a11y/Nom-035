import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Download, FileText, Code, Calendar } from "lucide-react";

export default function DC1Generator() {
  const [selectedEmployee, setSelectedEmployee] = useState<string>("");
  const [selectedCourse, setSelectedCourse] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [loadingDC1, setLoadingDC1] = useState(false);
  const [loadingSIRCE, setLoadingSIRCE] = useState(false);
  const [loadingBatch, setLoadingBatch] = useState(false);

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

      const blob = new Blob([result.html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("DC-1 generado exitosamente");
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

      const blob = new Blob([result.xml], { type: "application/xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);

      toast.success("SIRCE XML generado exitosamente");
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

          <div className="flex gap-2">
            <Button
              onClick={handleGenerateDC1}
              disabled={loadingDC1 || !selectedEmployee || !selectedCourse}
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              Generar DC-1 (HTML)
            </Button>
            <Button
              onClick={handleGenerateSIRCE}
              disabled={loadingSIRCE || !selectedEmployee || !selectedCourse}
              variant="outline"
              className="flex-1"
            >
              <Code className="h-4 w-4 mr-2" />
              Generar SIRCE XML
            </Button>
          </div>
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
            <div className="p-3 bg-blue-50 rounded-md">
              <p className="text-sm">
                <strong>{exportBatchMutation.data.totalRecords}</strong> registros encontrados en el período
              </p>
            </div>
          )}

          <Button
            onClick={handleExportBatch}
            disabled={loadingBatch || !startDate || !endDate}
            className="w-full"
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar SIRCE XML Masivo
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
            <h4 className="font-medium mb-2">DC-1 (Constancia de Habilidades Laborales)</h4>
            <p className="text-sm text-muted-foreground">
              Documento HTML que certifica la participación del empleado en el curso y su porcentaje de avance.
              Incluye datos del trabajador, curso, instructor y fecha de conclusión.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-2">SIRCE XML</h4>
            <p className="text-sm text-muted-foreground">
              Formato oficial STPS (Sistema de Información de Registros de Capacitación Empresarial) para carga
              al sistema. Contiene estructura XML validada para integración con sistemas gubernamentales.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
