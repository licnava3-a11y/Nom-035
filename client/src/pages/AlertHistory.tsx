import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, CheckCircle, Info, Download, Calendar } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";
import { Breadcrumb } from "@/components/Breadcrumb";

type AlertType = "critical_cases" | "low_coverage" | "excellent_compliance" | "all";
type AlertStatus = "active" | "resolved" | "all";
type AlertPriority = "critical" | "warning" | "info" | "all";

export default function AlertHistory() {
  const [alertType, setAlertType] = useState<AlertType>("all");
  const [status, setStatus] = useState<AlertStatus>("all");
  const [priority, setPriority] = useState<AlertPriority>("all");
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [selectedAlertId, setSelectedAlertId] = useState<number | null>(null);
  const [notes, setNotes] = useState("");

  const utils = trpc.useUtils();

  // Query para obtener histórico
  const { data: alerts, isLoading } = trpc.alerts.getHistory.useQuery({
    alertType: alertType === "all" ? undefined : alertType,
    status: status === "all" ? undefined : status,
    priority: priority === "all" ? undefined : priority,
    startDate: startDate ? startDate.toISOString() : undefined,
    endDate: endDate ? endDate.toISOString() : undefined,
  });

  // Mutation para resolver alerta
  const resolveMutation = trpc.alerts.resolve.useMutation({
    onSuccess: () => {
      utils.alerts.getHistory.invalidate();
      setResolveDialogOpen(false);
      setNotes("");
      setSelectedAlertId(null);
    },
  });

  const handleResolve = (alertId: number) => {
    setSelectedAlertId(alertId);
    setResolveDialogOpen(true);
  };

  const confirmResolve = () => {
    if (selectedAlertId) {
      resolveMutation.mutate({
        alertId: selectedAlertId,
        notes: notes || undefined,
      });
    }
  };

  const handleExportToExcel = () => {
    if (!alerts || alerts.length === 0) return;

    const wb = XLSX.utils.book_new();

    // Hoja de Metadatos
    const metadata = [
      ["Histórico de Alertas - Plataforma NOM-035"],
      [""],
      ["Fecha de Exportación:", new Date().toLocaleString("es-MX")],
      ["Filtros Aplicados:"],
      ["  Tipo de Alerta:", alertType === "all" ? "Todas" : getAlertTypeLabel(alertType)],
      ["  Estado:", status === "all" ? "Todos" : status === "active" ? "Activas" : "Resueltas"],
      ["  Prioridad:", priority === "all" ? "Todas" : priority === "critical" ? "Crítica" : priority === "warning" ? "Advertencia" : "Información"],
      [""],
      ["Estadísticas:"],
      ["  Total de Alertas:", alerts.length],
      ["  Alertas Activas:", alerts.filter(a => a.status === "active").length],
      ["  Alertas Resueltas:", alerts.filter(a => a.status === "resolved").length],
    ];
    const wsMetadata = XLSX.utils.aoa_to_sheet(metadata);
    XLSX.utils.book_append_sheet(wb, wsMetadata, "Metadatos");

    // Hoja de Datos
    const data = alerts.map(alert => ({
      "Fecha": new Date(alert.triggeredAt).toLocaleString("es-MX"),
      "Tipo": getAlertTypeLabel(alert.alertType),
      "Prioridad": alert.priority === "critical" ? "Crítica" : alert.priority === "warning" ? "Advertencia" : "Informativa",
      "Descripción": alert.description,
      "Umbral": alert.threshold,
      "Valor Actual": alert.currentValue,
      "Estado": alert.status === "active" ? "Activa" : "Resuelta",
      "Fecha Resolución": alert.resolvedAt ? new Date(alert.resolvedAt).toLocaleString("es-MX") : "N/A",
      "Notas": alert.notes || "N/A",
    }));
    const wsData = XLSX.utils.json_to_sheet(data);
    
    // Auto-ajustar columnas
    const colWidths = [
      { wch: 20 }, // Fecha
      { wch: 20 }, // Tipo
      { wch: 50 }, // Descripción
      { wch: 12 }, // Umbral
      { wch: 15 }, // Valor Actual
      { wch: 12 }, // Estado
      { wch: 20 }, // Fecha Resolución
      { wch: 40 }, // Notas
    ];
    wsData["!cols"] = colWidths;
    
    XLSX.utils.book_append_sheet(wb, wsData, "Alertas");

    // Exportar archivo
    const fileName = `historico_alertas_${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
  };

  const getAlertTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      critical_cases: "Casos Críticos",
      low_coverage: "Cobertura Baja",
      excellent_compliance: "Cumplimiento Excelente",
    };
    return labels[type] || type;
  };

  const getAlertTypeIcon = (type: string) => {
    const icons: Record<string, React.ReactNode> = {
      critical_cases: <AlertCircle className="h-4 w-4 text-red-600" />,
      low_coverage: <AlertCircle className="h-4 w-4 text-yellow-600" />,
      excellent_compliance: <CheckCircle className="h-4 w-4 text-green-600" />,
    };
    return icons[type] || <Info className="h-4 w-4" />;
  };

  const getAlertTypeBadge = (type: string) => {
    const variants: Record<string, "destructive" | "default" | "secondary"> = {
      critical_cases: "destructive",
      low_coverage: "default",
      excellent_compliance: "secondary",
    };
    return variants[type] || "default";
  };

  return (
    <div className="container py-6 space-y-6">
      <Breadcrumb
        items={[
          { label: "Reportes y Análisis", href: "/reports" },
          { label: "Histórico de Alertas" },
        ]}
      />

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Histórico de Alertas</h1>
        <p className="text-muted-foreground mt-2">
          Registro completo de alertas del sistema para auditoría de cumplimiento NOM-035
        </p>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
          <CardDescription>Filtra el histórico por tipo de alerta, estado, prioridad y rango de fechas</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Tipo de Alerta</label>
            <Select value={alertType} onValueChange={(v) => setAlertType(v as AlertType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="critical_cases">Casos Críticos</SelectItem>
                <SelectItem value="low_coverage">Cobertura Baja</SelectItem>
                <SelectItem value="excellent_compliance">Cumplimiento Excelente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Estado</label>
            <Select value={status} onValueChange={(v) => setStatus(v as AlertStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Activas</SelectItem>
                <SelectItem value="resolved">Resueltas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <label className="text-sm font-medium mb-2 block">Prioridad</label>
            <Select value={priority} onValueChange={(v) => setPriority(v as AlertPriority)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="critical">Crítica</SelectItem>
                <SelectItem value="warning">Advertencia</SelectItem>
                <SelectItem value="info">Información</SelectItem>
              </SelectContent>
            </Select>
          </div>
          </div>

          {/* Rango de Fechas */}
          <div className="border-t pt-4">
            <label className="text-sm font-medium mb-3 block">Rango de Fechas</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-muted-foreground mb-2 block">Fecha Inicio</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !startDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {startDate ? format(startDate, "PPP", { locale: es }) : "Seleccionar fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={startDate}
                      onSelect={setStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-2 block">Fecha Fin</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !endDate && "text-muted-foreground"
                      )}
                    >
                      <Calendar className="mr-2 h-4 w-4" />
                      {endDate ? format(endDate, "PPP", { locale: es }) : "Seleccionar fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={endDate}
                      onSelect={setEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {/* Botones de rangos predefinidos */}
            <div className="flex flex-wrap gap-2 mt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const now = new Date();
                  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                  setStartDate(weekAgo);
                  setEndDate(now);
                }}
              >
                Última semana
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const now = new Date();
                  const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                  setStartDate(monthAgo);
                  setEndDate(now);
                }}
              >
                Último mes
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const now = new Date();
                  const quarterAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                  setStartDate(quarterAgo);
                  setEndDate(now);
                }}
              >
                Último trimestre
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const now = new Date();
                  const yearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
                  setStartDate(yearAgo);
                  setEndDate(now);
                }}
              >
                Último año
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setStartDate(undefined);
                  setEndDate(undefined);
                }}
              >
                Limpiar fechas
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Alertas */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Registro de Alertas</CardTitle>
              <CardDescription>
                {alerts?.length || 0} alertas encontradas
              </CardDescription>
            </div>
            <Button
              onClick={handleExportToExcel}
              disabled={!alerts || alerts.length === 0}
              variant="outline"
              className="gap-2"
            >
              <Download className="h-4 w-4" />
              Exportar a Excel
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Cargando...</div>
          ) : !alerts || alerts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron alertas con los filtros seleccionados
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-3 font-medium">Fecha</th>
                    <th className="text-left p-3 font-medium">Tipo</th>
                    <th className="text-center p-3 font-medium">Prioridad</th>
                    <th className="text-left p-3 font-medium">Descripción</th>
                    <th className="text-center p-3 font-medium">Umbral</th>
                    <th className="text-center p-3 font-medium">Valor Actual</th>
                    <th className="text-center p-3 font-medium">Estado</th>
                    <th className="text-center p-3 font-medium">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {alerts.map((alert) => (
                    <tr key={alert.id} className="border-b hover:bg-muted/50">
                      <td className="p-3 text-sm">
                        {new Date(alert.triggeredAt).toLocaleString("es-MX", {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="p-3">
                        <div className="flex items-center gap-2">
                          {getAlertTypeIcon(alert.alertType)}
                          <Badge variant={getAlertTypeBadge(alert.alertType)}>
                            {getAlertTypeLabel(alert.alertType)}
                          </Badge>
                        </div>
                      </td>
                      <td className="p-3 text-center">
                        <Badge 
                          variant={alert.priority === "critical" ? "destructive" : alert.priority === "warning" ? "secondary" : "outline"}
                          className={alert.priority === "info" ? "bg-blue-100 text-blue-800 hover:bg-blue-200" : ""}
                        >
                          {alert.priority === "critical" ? "Crítica" : alert.priority === "warning" ? "Advertencia" : "Informativa"}
                        </Badge>
                      </td>
                      <td className="p-3 text-sm max-w-md">
                        {alert.description}
                        {alert.notes && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            <strong>Notas:</strong> {alert.notes}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-center text-sm">{alert.threshold}</td>
                      <td className="p-3 text-center text-sm font-medium">{alert.currentValue}</td>
                      <td className="p-3 text-center">
                        <Badge variant={alert.status === "active" ? "destructive" : "secondary"}>
                          {alert.status === "active" ? "Activa" : "Resuelta"}
                        </Badge>
                        {alert.status === "resolved" && alert.resolvedAt && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {new Date(alert.resolvedAt).toLocaleDateString("es-MX")}
                          </div>
                        )}
                      </td>
                      <td className="p-3 text-center">
                        {alert.status === "active" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleResolve(alert.id)}
                          >
                            Resolver
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog para resolver alerta */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolver Alerta</DialogTitle>
            <DialogDescription>
              Agrega notas sobre las acciones tomadas para resolver esta alerta (opcional)
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Ej: Se revisaron todos los casos críticos y se asignaron responsables. Se programaron sesiones de seguimiento."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmResolve} disabled={resolveMutation.isPending}>
              {resolveMutation.isPending ? "Resolviendo..." : "Resolver Alerta"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
