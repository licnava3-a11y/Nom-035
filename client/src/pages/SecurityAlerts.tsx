import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Shield, Clock, Activity, CheckCircle2, XCircle } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

export default function SecurityAlerts() {
  const [filters, setFilters] = useState({
    alertType: undefined as "multiple_downloads" | "unknown_ip" | "off_hours" | "suspicious_pattern" | undefined,
    severity: undefined as "low" | "medium" | "high" | "critical" | undefined,
    status: undefined as "pending" | "reviewed" | "resolved" | "false_positive" | undefined,
    startDate: "",
    endDate: "",
    page: 1,
    pageSize: 50,
  });

  const [selectedAlert, setSelectedAlert] = useState<any>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewStatus, setReviewStatus] = useState<"pending" | "reviewed" | "resolved" | "false_positive">("reviewed");
  const [reviewNotes, setReviewNotes] = useState("");

  // Obtener alertas
  const { data: alertsData, isLoading, refetch } = trpc.securityAlerts.getAlerts.useQuery(filters);

  // Obtener estadísticas
  const { data: stats } = trpc.securityAlerts.getStatistics.useQuery({
    startDate: filters.startDate,
    endDate: filters.endDate,
  });

  // Mutation para actualizar estado
  const updateStatusMutation = trpc.securityAlerts.updateAlertStatus.useMutation({
    onSuccess: () => {
      toast.success("Estado de alerta actualizado");
      refetch();
      setReviewDialogOpen(false);
      setSelectedAlert(null);
      setReviewNotes("");
    },
    onError: (error) => {
      toast.error(`Error: ${error.message}`);
    },
  });

  const handleFilterChange = (key: string, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const handleReviewAlert = (alert: any) => {
    setSelectedAlert(alert);
    setReviewStatus(alert.status);
    setReviewNotes(alert.reviewNotes || "");
    setReviewDialogOpen(true);
  };

  const handleSubmitReview = () => {
    if (!selectedAlert) return;

    updateStatusMutation.mutate({
      alertId: selectedAlert.id,
      status: reviewStatus,
      reviewNotes,
    });
  };

  const getAlertTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      multiple_downloads: "Múltiples Descargas",
      unknown_ip: "IP Desconocida",
      off_hours: "Fuera de Horario",
      suspicious_pattern: "Patrón Sospechoso",
    };
    return labels[type] || type;
  };

  const getSeverityBadge = (severity: string) => {
    const colors: Record<string, string> = {
      low: "bg-blue-100 text-blue-800",
      medium: "bg-yellow-100 text-yellow-800",
      high: "bg-orange-100 text-orange-800",
      critical: "bg-red-100 text-red-800",
    };
    const labels: Record<string, string> = {
      low: "Baja",
      medium: "Media",
      high: "Alta",
      critical: "Crítica",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[severity] || ""}`}>
        {labels[severity] || severity}
      </span>
    );
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-gray-100 text-gray-800",
      reviewed: "bg-blue-100 text-blue-800",
      resolved: "bg-green-100 text-green-800",
      false_positive: "bg-purple-100 text-purple-800",
    };
    const labels: Record<string, string> = {
      pending: "Pendiente",
      reviewed: "Revisada",
      resolved: "Resuelta",
      false_positive: "Falso Positivo",
    };
    return (
      <span className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || ""}`}>
        {labels[status] || status}
      </span>
    );
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Alertas de Seguridad</h1>
        <p className="text-muted-foreground">Monitoreo de actividad sospechosa en el sistema</p>
      </div>

      {/* Estadísticas */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total de Alertas</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAlerts}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingAlerts}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Críticas</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.criticalAlerts}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Altas</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{stats.highAlerts}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Resueltas</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.resolvedAlerts}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros de Búsqueda</CardTitle>
          <CardDescription>Filtra las alertas por tipo, severidad, estado o fecha</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-5">
            <div className="space-y-2">
              <Label>Tipo de Alerta</Label>
              <Select
                value={filters.alertType || "all"}
                onValueChange={(value) =>
                  handleFilterChange("alertType", value === "all" ? undefined : value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="multiple_downloads">Múltiples Descargas</SelectItem>
                  <SelectItem value="unknown_ip">IP Desconocida</SelectItem>
                  <SelectItem value="off_hours">Fuera de Horario</SelectItem>
                  <SelectItem value="suspicious_pattern">Patrón Sospechoso</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Severidad</Label>
              <Select
                value={filters.severity || "all"}
                onValueChange={(value) =>
                  handleFilterChange("severity", value === "all" ? undefined : value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="low">Baja</SelectItem>
                  <SelectItem value="medium">Media</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="critical">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Estado</Label>
              <Select
                value={filters.status || "all"}
                onValueChange={(value) =>
                  handleFilterChange("status", value === "all" ? undefined : value)
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="reviewed">Revisada</SelectItem>
                  <SelectItem value="resolved">Resuelta</SelectItem>
                  <SelectItem value="false_positive">Falso Positivo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fecha Inicio</Label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange("startDate", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Fecha Fin</Label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange("endDate", e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de Alertas */}
      <Card>
        <CardHeader>
          <CardTitle>Alertas Detectadas</CardTitle>
          <CardDescription>
            {alertsData?.total || 0} alertas encontradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Cargando alertas...</div>
          ) : alertsData && alertsData.alerts.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Severidad</TableHead>
                    <TableHead>Usuario</TableHead>
                    <TableHead>IP</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {alertsData.alerts.map((alert: any) => (
                    <TableRow key={alert.id}>
                      <TableCell>
                        {format(new Date(alert.createdAt), "dd/MM/yyyy HH:mm", { locale: es })}
                      </TableCell>
                      <TableCell>{getAlertTypeLabel(alert.alertType)}</TableCell>
                      <TableCell>{getSeverityBadge(alert.severity)}</TableCell>
                      <TableCell>{alert.userName || "N/A"}</TableCell>
                      <TableCell className="font-mono text-sm">{alert.ipAddress || "N/A"}</TableCell>
                      <TableCell className="max-w-md truncate">{alert.description}</TableCell>
                      <TableCell>{getStatusBadge(alert.status)}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReviewAlert(alert)}
                        >
                          Revisar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Paginación */}
              <div className="flex items-center justify-between mt-4">
                <div className="text-sm text-muted-foreground">
                  Mostrando {(filters.page - 1) * filters.pageSize + 1} a{" "}
                  {Math.min(filters.page * filters.pageSize, alertsData.total)} de {alertsData.total}{" "}
                  alertas
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleFilterChange("page", filters.page - 1)}
                    disabled={filters.page === 1}
                  >
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleFilterChange("page", filters.page + 1)}
                    disabled={filters.page * filters.pageSize >= alertsData.total}
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No se encontraron alertas con los filtros aplicados
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Revisión */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Revisar Alerta de Seguridad</DialogTitle>
            <DialogDescription>
              Actualiza el estado de la alerta y agrega notas de revisión
            </DialogDescription>
          </DialogHeader>

          {selectedAlert && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm text-muted-foreground">Tipo</Label>
                  <p className="font-medium">{getAlertTypeLabel(selectedAlert.alertType)}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Severidad</Label>
                  <div className="mt-1">{getSeverityBadge(selectedAlert.severity)}</div>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Usuario</Label>
                  <p className="font-medium">{selectedAlert.userName || "N/A"}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">IP</Label>
                  <p className="font-mono text-sm">{selectedAlert.ipAddress || "N/A"}</p>
                </div>
              </div>

              <div>
                <Label className="text-sm text-muted-foreground">Descripción</Label>
                <p className="mt-1">{selectedAlert.description}</p>
              </div>

              {selectedAlert.metadata && (
                <div>
                  <Label className="text-sm text-muted-foreground">Metadatos</Label>
                  <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-auto">
                    {JSON.stringify(selectedAlert.metadata, null, 2)}
                  </pre>
                </div>
              )}

              <div className="space-y-2">
                <Label>Nuevo Estado</Label>
                <Select
                  value={reviewStatus}
                  onValueChange={(value: any) => setReviewStatus(value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="reviewed">Revisada</SelectItem>
                    <SelectItem value="resolved">Resuelta</SelectItem>
                    <SelectItem value="false_positive">Falso Positivo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Notas de Revisión</Label>
                <Textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Agrega comentarios sobre la revisión de esta alerta..."
                  rows={4}
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmitReview} disabled={updateStatusMutation.isPending}>
              {updateStatusMutation.isPending ? "Guardando..." : "Guardar Revisión"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
