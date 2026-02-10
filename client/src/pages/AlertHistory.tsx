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
import { AlertCircle, CheckCircle, Info } from "lucide-react";
import { Breadcrumb } from "@/components/Breadcrumb";

type AlertType = "critical_cases" | "low_coverage" | "excellent_compliance" | "all";
type AlertStatus = "active" | "resolved" | "all";

export default function AlertHistory() {
  const [alertType, setAlertType] = useState<AlertType>("all");
  const [status, setStatus] = useState<AlertStatus>("all");
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [selectedAlertId, setSelectedAlertId] = useState<number | null>(null);
  const [notes, setNotes] = useState("");

  const utils = trpc.useUtils();

  // Query para obtener histórico
  const { data: alerts, isLoading } = trpc.alerts.getHistory.useQuery({
    alertType: alertType === "all" ? undefined : alertType,
    status: status === "all" ? undefined : status,
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
          <CardDescription>Filtra el histórico por tipo de alerta y estado</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
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
        </CardContent>
      </Card>

      {/* Tabla de Alertas */}
      <Card>
        <CardHeader>
          <CardTitle>Registro de Alertas</CardTitle>
          <CardDescription>
            {alerts?.length || 0} alertas encontradas
          </CardDescription>
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
