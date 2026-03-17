import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { 
  Users, 
  CheckCircle2, 
  Clock, 
  Mail, 
  Search,
  Download,
  AlertCircle,
  Building2
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import React from "react";

export default function SurveysTracking() {
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedDepartment, setSelectedDepartment] = React.useState("all");
  const [isDownloadingPDF, setIsDownloadingPDF] = React.useState(false);

  const surveyId = 1; // TODO: Hacer dinámico

  // Obtener estadísticas de encuestas
  const { data: stats, isLoading } = (trpc as any).surveys.getRiskStatistics.useQuery();

  // Obtener cobertura por departamento
  const { data: departmentCoverage, isLoading: isLoadingDepts } = (trpc as any).surveys.getCoverageByDepartment.useQuery(surveyId);

  // Estabilizar lista de departamentos para evitar re-renders del Select
  const departments = React.useMemo(() => {
    if (!departmentCoverage || !Array.isArray(departmentCoverage)) return [];
    return departmentCoverage.map((dept: any) => ({
      value: dept.department,
      label: dept.department
    }));
  }, [departmentCoverage]);

  // Obtener trabajadores pendientes
  const { data: pendingWorkers, isLoading: isLoadingPending } = (trpc as any).surveys.getPendingWorkers.useQuery({
    surveyId,
    department: selectedDepartment === "all" ? undefined : selectedDepartment,
    search: searchTerm || undefined,
  });

  // Mutation para generar PDF
  const generatePDF = (trpc as any).surveys.generatePendingWorkersPDF.useMutation();

  // Mutation para enviar recordatorios
  const sendReminders = (trpc as any).surveys.sendPendingWorkersReminders.useMutation();
  const [isSendingReminders, setIsSendingReminders] = React.useState(false);

  // Calcular fórmula de cobertura (Ecuación 1)
  const totalWorkers = stats?.totalResponses ? 
    Math.round((stats.totalResponses / (stats.completionRate ? parseFloat(stats.completionRate) / 100 : 1))) : 
    0;
  const coveragePercentage = stats?.completionRate ? parseFloat(stats.completionRate) : 0;
  const coverageStatus = 
    coveragePercentage >= 90 ? "excellent" : 
    coveragePercentage >= 70 ? "good" : 
    coveragePercentage >= 50 ? "warning" : 
    "critical";

  const coverageColor = {
    excellent: "text-green-600 bg-green-100",
    good: "text-blue-600 bg-blue-100",
    warning: "text-yellow-600 bg-yellow-100",
    critical: "text-red-600 bg-red-100"
  }[coverageStatus];

  // Función para descargar PDF
  const downloadPDF = (base64: string, filename: string) => {
    const linkSource = `data:application/pdf;base64,${base64}`;
    const downloadLink = document.createElement('a');
    downloadLink.href = linkSource;
    downloadLink.download = filename;
    downloadLink.click();
  };

  // Handler para descargar PDF de pendientes
  const handleDownloadPDF = async () => {
    try {
      setIsDownloadingPDF(true);
      const result = await generatePDF.mutateAsync(surveyId);
      downloadPDF(result.pdf, result.filename);
      toast.success("PDF descargado exitosamente");
    } catch (error) {
      toast.error("Error al generar el PDF");
      console.error(error);
    } finally {
      setIsDownloadingPDF(false);
    }
  };

  // Handler para enviar notificaciones
  const handleSendReminders = async () => {
    try {
      setIsSendingReminders(true);
      const result = await sendReminders.mutateAsync({
        surveyId,
        department: selectedDepartment === "all" ? undefined : selectedDepartment,
      });
      
      if (result.sent > 0) {
        toast.success(
          `Recordatorios enviados exitosamente: ${result.sent} de ${result.total}`,
          {
            description: result.failed > 0 
              ? `${result.failed} correos fallaron. Revisa la configuración SMTP.`
              : 'Todos los correos fueron enviados correctamente.'
          }
        );
      } else {
        toast.error(
          `No se pudieron enviar los recordatorios (${result.failed} fallos)`,
          {
            description: 'Verifica la configuración SMTP en las variables de entorno.'
          }
        );
      }
    } catch (error) {
      toast.error("Error al enviar recordatorios", {
        description: error instanceof Error ? error.message : 'Error desconocido'
      });
      console.error(error);
    } finally {
      setIsSendingReminders(false);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Seguimiento de Encuestas NOM-035</h1>
        <p className="text-muted-foreground">
          Monitoreo de cobertura y trabajadores pendientes de responder
        </p>
      </div>

      {/* Alerta de cobertura */}
      {coverageStatus === "critical" && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Cobertura Crítica</AlertTitle>
          <AlertDescription>
            La cobertura actual ({coveragePercentage.toFixed(1)}%) está por debajo del mínimo recomendado. 
            Se requiere acción inmediata para cumplir con la NOM-035.
          </AlertDescription>
        </Alert>
      )}

      {/* Estadísticas de cobertura */}
      {isLoading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground mt-2">Cargando estadísticas...</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Trabajadores</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalWorkers}</div>
              <p className="text-xs text-muted-foreground">
                Plantilla completa
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Respuestas Recibidas</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats?.totalResponses || 0}</div>
              <p className="text-xs text-muted-foreground">
                Han completado la encuesta
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Trabajadores Pendientes</CardTitle>
              <Clock className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{totalWorkers - (stats?.totalResponses || 0)}</div>
              <p className="text-xs text-muted-foreground">
                Sin responder
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cobertura (Ecuación 1)</CardTitle>
              <div className={`h-8 w-8 rounded-full flex items-center justify-center ${coverageColor}`}>
                <span className="text-sm font-bold">{coveragePercentage.toFixed(0)}%</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      coverageStatus === "excellent" ? "bg-green-600" :
                      coverageStatus === "good" ? "bg-blue-600" :
                      coverageStatus === "warning" ? "bg-yellow-600" :
                      "bg-red-600"
                    }`}
                    style={{ width: `${coveragePercentage}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {coverageStatus === "excellent" ? "Excelente cumplimiento" :
                   coverageStatus === "good" ? "Buen cumplimiento" :
                   coverageStatus === "warning" ? "Requiere atención" :
                   "Crítico"}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Cobertura por departamento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Cobertura por Departamento
          </CardTitle>
          <CardDescription>
            Porcentaje de cumplimiento por área organizacional
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingDepts ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
            </div>
          ) : departmentCoverage && departmentCoverage.length > 0 ? (
            <div className="space-y-4">
              {departmentCoverage.map((dept: any) => {
                const deptCoverageStatus = 
                  dept.coverage >= 90 ? "excellent" : 
                  dept.coverage >= 70 ? "good" : 
                  dept.coverage >= 50 ? "warning" : 
                  "critical";
                
                const deptColor = {
                  excellent: "bg-green-600",
                  good: "bg-blue-600",
                  warning: "bg-yellow-600",
                  critical: "bg-red-600"
                }[deptCoverageStatus];

                return (
                  <div key={dept.department} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{dept.department}</span>
                      <div className="flex items-center gap-4 text-muted-foreground">
                        <span>{dept.responded}/{dept.total}</span>
                        <Badge variant={deptCoverageStatus === "excellent" || deptCoverageStatus === "good" ? "default" : "destructive"}>
                          {dept.coverage.toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                    <div className="h-2 bg-secondary rounded-full overflow-hidden">
                      <div
                        className={`h-full ${deptColor} transition-all`}
                        style={{ width: `${dept.coverage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-4">No hay datos de departamentos disponibles</p>
          )}
        </CardContent>
      </Card>

      {/* Lista de trabajadores pendientes */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Trabajadores Pendientes</CardTitle>
              <CardDescription>
                Lista de empleados que aún no han completado la encuesta
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSendReminders}
                disabled={isSendingReminders || !pendingWorkers || pendingWorkers.length === 0}
              >
                <Mail className="mr-2 h-4 w-4" />
                {isSendingReminders ? "Enviando..." : "Enviar Recordatorios"}
              </Button>
              <Button 
                variant="outline"
                onClick={handleDownloadPDF}
                disabled={isDownloadingPDF || !pendingWorkers || pendingWorkers.length === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                {isDownloadingPDF ? "Generando..." : "Exportar PDF"}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="mb-4 flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o correo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Departamento" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los departamentos</SelectItem>
                {departments.map((dept: any) => (
                  <SelectItem key={`dept-${dept.value}`} value={dept.value}>
                    {dept.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tabla de trabajadores pendientes */}
          {isLoadingPending ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground mt-2">Cargando trabajadores pendientes...</p>
            </div>
          ) : pendingWorkers && pendingWorkers.length > 0 ? (
            <div className="rounded-md border">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-left text-sm font-medium">Nombre</th>
                    <th className="p-3 text-left text-sm font-medium">Correo</th>
                    <th className="p-3 text-left text-sm font-medium">Departamento</th>
                    <th className="p-3 text-left text-sm font-medium">Puesto</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingWorkers.map((worker: any, index: number) => (
                    <tr key={worker.id} className={index % 2 === 0 ? "bg-muted/20" : ""}>
                      <td className="p-3 text-sm">{worker.name}</td>
                      <td className="p-3 text-sm text-muted-foreground">{worker.email}</td>
                      <td className="p-3 text-sm">{worker.department}</td>
                      <td className="p-3 text-sm">{worker.position}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8">
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-2" />
              <p className="text-lg font-medium">¡Cobertura completa!</p>
              <p className="text-muted-foreground">Todos los trabajadores han completado la encuesta</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Información sobre la fórmula de cobertura */}
      <Card>
        <CardHeader>
          <CardTitle>Fórmula de Cobertura (Ecuación 1)</CardTitle>
          <CardDescription>
            Cálculo oficial según NOM-035-STPS-2018
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted p-4 rounded-lg font-mono text-sm">
            Cobertura (%) = (Respuestas Recibidas / Total de Trabajadores) × 100
          </div>
          <div className="space-y-2 text-sm">
            <p><strong>Niveles de cumplimiento:</strong></p>
            <ul className="space-y-1 ml-4">
              <li className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-green-600"></div>
                <span><strong>Excelente:</strong> ≥ 90% - Cumplimiento óptimo</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-blue-600"></div>
                <span><strong>Bueno:</strong> 70-89% - Cumplimiento aceptable</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-yellow-600"></div>
                <span><strong>Requiere atención:</strong> 50-69% - Mejorar cobertura</span>
              </li>
              <li className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-red-600"></div>
                <span><strong>Crítico:</strong> &lt; 50% - Acción inmediata requerida</span>
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
