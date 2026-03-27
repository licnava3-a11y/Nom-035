import { useState } from "react";
import { trpc } from "../lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Badge } from "../components/ui/badge";
import { Loader2, Calendar, Send, FileText, Clock, Mail } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "../components/ui/checkbox";

export default function ScheduledReports() {
  const [reportName, setReportName] = useState("");
  const [frequency, setFrequency] = useState<"daily" | "weekly" | "monthly">("monthly");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [includeNMX025, setIncludeNMX025] = useState(true);
  const [includeNOM035, setIncludeNOM035] = useState(true);

  // Queries
  const { data: scheduledReports, isLoading: reportsLoading } = trpc.scheduledReports.getScheduledReports.useQuery();
  const { data: reportHistory, isLoading: historyLoading } = trpc.scheduledReports.getReportHistory.useQuery({
    limit: 50,
  });

  // Mutations
  const createReportMutation = trpc.scheduledReports.createScheduledReport.useMutation({
    onSuccess: () => {
      toast.success("Reporte programado creado exitosamente");
      setReportName("");
      setRecipientEmail("");
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const sendReportNowMutation = trpc.scheduledReports.sendReportNow.useMutation({
    onSuccess: () => {
      toast.success("Reporte enviado exitosamente");
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const deleteReportMutation = trpc.scheduledReports.deleteScheduledReport.useMutation({
    onSuccess: () => {
      toast.success("Reporte eliminado exitosamente");
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const updateConfigMutation = trpc.scheduledReports.updateReportConfig.useMutation({
    onSuccess: () => {
      toast.success("Configuración actualizada exitosamente");
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  // Render Scheduled Reports
  const renderScheduledReports = () => {
    if (!scheduledReports) return null;

    return (
      <div className="space-y-4">
        {scheduledReports.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No hay reportes programados</p>
        ) : (
          scheduledReports.map((report: any) => (
            <Card key={report.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{report.reportName}</CardTitle>
                  <Badge variant={report.isActive ? "default" : "secondary"}>
                    {report.isActive ? "Activo" : "Inactivo"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Frecuencia</p>
                    <p className="text-base font-medium capitalize">{report.frequency}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Destinatario</p>
                    <p className="text-base font-medium">{report.recipientEmail}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Próximo Envío</p>
                    <p className="text-base font-medium">
                      {report.nextRunDate
                        ? new Date(report.nextRunDate).toLocaleString("es-MX")
                        : "No programado"}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  {report.includeNMX025 && <Badge variant="outline">NMX-025</Badge>}
                  {report.includeNOM035 && <Badge variant="outline">NOM-035</Badge>}
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => sendReportNowMutation.mutate({ reportId: report.id })}
                    disabled={sendReportNowMutation.isPending}
                  >
                    {sendReportNowMutation.isPending && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                    <Send className="h-4 w-4 mr-2" />
                    Enviar Ahora
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const newEmail = prompt("Nuevo email destinatario:", report.recipientEmail);
                      if (newEmail) {
                        updateConfigMutation.mutate({
                          reportId: report.id,
                          recipients: [newEmail],
                        });
                      }
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (confirm("¿Eliminar este reporte programado?")) {
                        deleteReportMutation.mutate({ reportId: report.id });
                      }
                    }}
                  >
                    Eliminar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    );
  };

  // Render Report History
  const renderReportHistory = () => {
    if (!reportHistory) return null;

    return (
      <div className="space-y-3">
        {reportHistory.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No hay historial de envíos</p>
        ) : (
          reportHistory.map((entry: any) => (
            <Card key={entry.id}>
              <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{entry.reportName}</span>
                      <Badge variant={entry.status === "sent" ? "default" : "destructive"}>
                        {entry.status === "sent" ? "Enviado" : "Error"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Enviado a: {entry.recipientEmail}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(entry.sentAt).toLocaleString("es-MX")}
                    </p>
                    {entry.errorMessage && (
                      <p className="text-xs text-red-600 mt-2">Error: {entry.errorMessage}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground">Período</p>
                    <p className="text-sm font-medium">
                      {new Date(entry.reportPeriodStart).toLocaleDateString("es-MX")} -{" "}
                      {new Date(entry.reportPeriodEnd).toLocaleDateString("es-MX")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    );
  };

  if (reportsLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reportes Automáticos</h1>
          <p className="text-muted-foreground">
            Programación de dashboards ejecutivos con métricas NMX-025 y cumplimiento NOM-035
          </p>
        </div>
      </div>

      {/* Crear Nuevo Reporte */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Crear Nuevo Reporte Programado
          </CardTitle>
          <CardDescription>
            Configura reportes automáticos que se enviarán por email según la frecuencia seleccionada
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="reportName">Nombre del Reporte</Label>
              <Input
                id="reportName"
                placeholder="Ej: Reporte Ejecutivo Mensual"
                value={reportName}
                onChange={(e) => setReportName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="frequency">Frecuencia</Label>
              <Select value={frequency} onValueChange={(value: any) => setFrequency(value)}>
                <SelectTrigger id="frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Diario</SelectItem>
                  <SelectItem value="weekly">Semanal</SelectItem>
                  <SelectItem value="monthly">Mensual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label htmlFor="recipientEmail">Email Destinatario</Label>
              <Input
                id="recipientEmail"
                type="email"
                placeholder="director@empresa.com"
                value={recipientEmail}
                onChange={(e) => setRecipientEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Métricas a Incluir</Label>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeNMX025"
                  checked={includeNMX025}
                  onCheckedChange={(checked) => setIncludeNMX025(checked as boolean)}
                />
                <label
                  htmlFor="includeNMX025"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Métricas NMX-025 (Igualdad Laboral)
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="includeNOM035"
                  checked={includeNOM035}
                  onCheckedChange={(checked) => setIncludeNOM035(checked as boolean)}
                />
                <label
                  htmlFor="includeNOM035"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Cumplimiento NOM-035 (Riesgo Psicosocial)
                </label>
              </div>
            </div>
          </div>

          <Button
            onClick={() => {
              if (!reportName || !recipientEmail) {
                toast.error("Por favor completa todos los campos");
                return;
              }
              createReportMutation.mutate({
                reportName,
                reportType: frequency as "monthly" | "quarterly" | "annual",
                recipients: [recipientEmail],
                includeNMX025,
                includeNOM035,
              });
            }}
            disabled={createReportMutation.isPending}
          >
            {createReportMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Mail className="mr-2 h-4 w-4" />
            Crear Reporte Programado
          </Button>
        </CardContent>
      </Card>

      {/* Tabs de Visualización */}
      <Tabs defaultValue="scheduled" className="space-y-4">
        <TabsList>
          <TabsTrigger value="scheduled">Reportes Programados</TabsTrigger>
          <TabsTrigger value="history">Historial de Envíos</TabsTrigger>
        </TabsList>

        <TabsContent value="scheduled" className="space-y-4">
          {renderScheduledReports()}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Envíos</CardTitle>
              <CardDescription>Últimos 50 reportes enviados</CardDescription>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : (
                renderReportHistory()
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
