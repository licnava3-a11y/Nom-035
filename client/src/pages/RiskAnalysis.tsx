import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { InputWithValidation } from "@/components/ui/input-with-validation";
import { LoadingButton } from "@/components/ui/loading-button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
// import { useToast } from "@/hooks/use-toast";
import { Loader2, FileDown, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function RiskAnalysisPage() {
  // const { toast } = useToast();
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<number | null>(null);
  const [selectedResultId, setSelectedResultId] = useState<number | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Cargar empleados
  const { data: employees, isLoading: loadingEmployees } = trpc.employees.list.useQuery({
    search: "",
  });

  // Cargar resultados de encuesta del empleado seleccionado
  const { data: results, isLoading: loadingResults } = trpc.surveys.getEmployeeResults.useQuery(
    { employeeId: selectedEmployeeId! },
    { enabled: !!selectedEmployeeId }
  );

  // Mutation para generar PDF
  const generatePDF = trpc.compliance.generateRiskAnalysisPDF.useMutation({
    onSuccess: (data) => {
      // Convertir base64 a blob y descargar
      const byteCharacters = atob(data.pdfBase64);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Analisis_Riesgos_${data.data.folio}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert(`PDF generado exitosamente. Folio: ${data.data.folio}`);
      setIsExporting(false);
    },
    onError: (error) => {
      alert(`Error al generar PDF: ${error.message}`);
      setIsExporting(false);
    },
  });

  const handleExportPDF = async () => {
    if (!selectedResultId) {
      alert("Debes seleccionar un resultado de encuesta para exportar");
      return;
    }

    setIsExporting(true);
    generatePDF.mutate({ 
      workerId: selectedEmployeeId!, 
      surveyResultId: selectedResultId 
    });
  };

  const selectedEmployee = employees?.employees?.find((e: any) => e.id === selectedEmployeeId);
  const selectedResult = results?.find((r: any) => r.id === selectedResultId);

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Análisis de Riesgos Psicosociales</h1>
          <p className="text-muted-foreground mt-2">
            Genera reportes de análisis de riesgos psicosociales basados en resultados de encuestas NOM-035
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Selección de Empleado y Resultado</CardTitle>
          <CardDescription>
            Selecciona el empleado y el resultado de encuesta para generar el reporte de análisis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Selector de Empleado */}
          <div className="space-y-2">
            <Label htmlFor="employee">Empleado</Label>
            <Select
              value={selectedEmployeeId?.toString() || ""}
              onValueChange={(value) => {
                setSelectedEmployeeId(parseInt(value));
                setSelectedResultId(null); // Reset result selection
              }}
            >
              <SelectTrigger id="employee">
                <SelectValue placeholder="Selecciona un empleado..." />
              </SelectTrigger>
              <SelectContent>
                {loadingEmployees ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    Cargando empleados...
                  </div>
                ) : employees?.employees?.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No hay empleados registrados
                  </div>
                ) : (
                  employees?.employees?.map((emp: any) => (
                    <SelectItem key={emp.id} value={emp.id.toString()}>
                      {emp.firstName} {emp.lastName} - {emp.employeeNumber}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          {/* Selector de Resultado de Encuesta */}
          {selectedEmployeeId && (
            <div className="space-y-2">
              <Label htmlFor="result">Resultado de Encuesta</Label>
              <Select
                value={selectedResultId?.toString() || ""}
                onValueChange={(value) => setSelectedResultId(parseInt(value))}
              >
                <SelectTrigger id="result">
                  <SelectValue placeholder="Selecciona un resultado..." />
                </SelectTrigger>
                <SelectContent>
                  {loadingResults ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Cargando resultados...
                    </div>
                  ) : results?.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      Este empleado no tiene resultados de encuestas
                    </div>
                  ) : (
                    results?.map((result: any) => (
                      <SelectItem key={result.id} value={result.id.toString()}>
                        {new Date(result.completedAt).toLocaleDateString("es-MX")} - Nivel:{" "}
                        {result.globalRiskLevel.toUpperCase()}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Información del Resultado Seleccionado */}
          {selectedResult && selectedEmployee && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <div className="space-y-1">
                  <p>
                    <strong>Empleado:</strong> {selectedEmployee.firstName} {selectedEmployee.lastName}
                  </p>
                  <p>
                    <strong>Departamento:</strong> {selectedEmployee.department || "No especificado"}
                  </p>
                  <p>
                    <strong>Fecha de evaluación:</strong>{" "}
                    {new Date(selectedResult.completedAt).toLocaleDateString("es-MX")}
                  </p>
                  <p>
                    <strong>Nivel de riesgo global:</strong>{" "}
                    <span
                      className={`font-semibold ${
                        selectedResult.globalRiskLevel === "muy_alto"
                          ? "text-red-600"
                          : selectedResult.globalRiskLevel === "alto"
                          ? "text-orange-600"
                          : selectedResult.globalRiskLevel === "medio"
                          ? "text-yellow-600"
                          : selectedResult.globalRiskLevel === "bajo"
                          ? "text-blue-600"
                          : "text-gray-600"
                      }`}
                    >
                      {selectedResult.globalRiskLevel.toUpperCase().replace("_", " ")}
                    </span>
                  </p>
                  <p>
                    <strong>Puntaje global:</strong> {selectedResult.globalScore}
                  </p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Botón de Exportación */}
          <div className="flex justify-end pt-4">
            <Button
              onClick={handleExportPDF}
              disabled={!selectedResultId || isExporting}
              size="lg"
            >
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generando PDF...
                </>
              ) : (
                <>
                  <FileDown className="mr-2 h-4 w-4" />
                  Exportar Reporte PDF
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
